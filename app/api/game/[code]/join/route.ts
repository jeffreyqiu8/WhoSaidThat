/**
 * POST /api/game/[code]/join
 * Join an existing game session
 */

import { NextRequest, NextResponse } from 'next/server';
import { GameStateManager } from '@/lib/game-state-manager';
import { notifyPlayerJoined } from '@/lib/game-events';
import { sanitizeNickname, validateGameCode } from '@/lib/validation';
import { checkRateLimit, getClientIdentifier } from '@/lib/rate-limit';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    // Rate limiting: 20 join attempts per minute per client
    const clientId = getClientIdentifier(request);
    const rateLimit = checkRateLimit(clientId, {
      maxRequests: 20,
      windowMs: 60 * 1000, // 1 minute
    });
    
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Limit': '20',
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': new Date(rateLimit.resetAt).toISOString(),
          }
        }
      );
    }

    const { code } = await params;
    
    // Validate game code format
    if (!validateGameCode(code)) {
      return NextResponse.json(
        { error: 'Invalid game code format' },
        { status: 400 }
      );
    }
    
    let body;
    try {
      body = await request.json();
      console.log('Parsed request body:', JSON.stringify(body));
    } catch (error) {
      console.error('Failed to parse request body:', error);
      console.error('Request headers:', Object.fromEntries(request.headers.entries()));
      return NextResponse.json(
        { error: 'Invalid request body. Expected JSON.' },
        { status: 400 }
      );
    }
    
    const { nickname } = body;
    console.log('Extracted nickname:', nickname);

    // Validate input
    if (!nickname || typeof nickname !== 'string') {
      return NextResponse.json(
        { error: 'Nickname is required' },
        { status: 400 }
      );
    }

    // Sanitize and validate nickname
    const { sanitized, isValid, error: validationError } = sanitizeNickname(nickname);
    if (!isValid) {
      return NextResponse.json(
        { error: validationError || 'Invalid nickname' },
        { status: 400 }
      );
    }

    // Join game with sanitized nickname
    const manager = new GameStateManager();
    const { session, player } = await manager.joinGame(code, sanitized);

    // Broadcast player joined event
    await notifyPlayerJoined(code, player, session.players.size);

    // Return player info and game state
    return NextResponse.json({
      playerId: player.id,
      player: {
        id: player.id,
        nickname: player.nickname,
        isHost: player.isHost,
      },
      gameCode: session.code,
      phase: session.phase,
      playerCount: session.players.size,
    }, { status: 200 });

  } catch (error) {
    console.error('Error joining game:', error);
    
    if (error instanceof Error) {
      // Map specific errors to appropriate status codes
      if (error.message === 'Game not found') {
        return NextResponse.json(
          { error: 'Game not found' },
          { status: 404 }
        );
      }
      
      if (error.message === 'Nickname already taken') {
        return NextResponse.json(
          { error: 'Nickname already taken' },
          { status: 409 }
        );
      }
      
      if (error.message === 'Game is full') {
        return NextResponse.json(
          { error: 'Game is full' },
          { status: 409 }
        );
      }
      
      if (error.message === 'Cannot join game in progress') {
        return NextResponse.json(
          { error: 'Cannot join game in progress' },
          { status: 409 }
        );
      }
      
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to join game' },
      { status: 500 }
    );
  }
}
