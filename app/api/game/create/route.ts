/**
 * POST /api/game/create
 * Creates a new game session
 */

import { NextRequest, NextResponse } from 'next/server';
import { GameStateManager } from '@/lib/game-state-manager';
import { sanitizeNickname } from '@/lib/validation';
import { checkRateLimit, getClientIdentifier } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  try {
    // Rate limiting: 10 game creations per minute per client
    const clientId = getClientIdentifier(request);
    const rateLimit = checkRateLimit(clientId, {
      maxRequests: 10,
      windowMs: 60 * 1000, // 1 minute
    });
    
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Limit': '10',
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': new Date(rateLimit.resetAt).toISOString(),
          }
        }
      );
    }

    const body = await request.json();
    const { hostNickname } = body;

    // Validate input
    if (!hostNickname || typeof hostNickname !== 'string') {
      return NextResponse.json(
        { error: 'Host nickname is required' },
        { status: 400 }
      );
    }

    // Sanitize and validate nickname
    const { sanitized, isValid, error } = sanitizeNickname(hostNickname);
    if (!isValid) {
      return NextResponse.json(
        { error: error || 'Invalid nickname' },
        { status: 400 }
      );
    }

    // Create game with sanitized nickname
    const manager = new GameStateManager();
    const session = await manager.createGame(sanitized);

    // Return game code and host player info
    const host = session.players.get(session.hostId);
    
    return NextResponse.json({
      code: session.code,
      hostId: session.hostId,
      host: {
        id: host!.id,
        nickname: host!.nickname,
        isHost: host!.isHost,
      },
      phase: session.phase,
      createdAt: session.createdAt.toISOString(),
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating game:', error);
    
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to create game' },
      { status: 500 }
    );
  }
}
