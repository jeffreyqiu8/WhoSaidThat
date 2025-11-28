/**
 * POST /api/game/[code]/response
 * Submit a response to the current prompt
 */

import { NextRequest, NextResponse } from 'next/server';
import { GameStateManager } from '@/lib/game-state-manager';
import { notifyResponsesReady } from '@/lib/game-events';
import { sanitizeResponse, validateGameCode, validateUUID } from '@/lib/validation';
import { checkRateLimit, getClientIdentifier } from '@/lib/rate-limit';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    // Rate limiting: 30 response submissions per minute per client
    const clientId = getClientIdentifier(request);
    const rateLimit = checkRateLimit(clientId, {
      maxRequests: 30,
      windowMs: 60 * 1000, // 1 minute
    });
    
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Limit': '30',
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
    } catch (error) {
      console.error('Failed to parse request body:', error);
      return NextResponse.json(
        { error: 'Invalid request body. Expected JSON.' },
        { status: 400 }
      );
    }
    
    const { playerId, response } = body;

    // Validate input
    if (!playerId || typeof playerId !== 'string') {
      return NextResponse.json(
        { error: 'Player ID is required' },
        { status: 400 }
      );
    }

    // Validate player ID format
    if (!validateUUID(playerId)) {
      return NextResponse.json(
        { error: 'Invalid player ID format' },
        { status: 400 }
      );
    }

    if (!response || typeof response !== 'string') {
      return NextResponse.json(
        { error: 'Response text is required' },
        { status: 400 }
      );
    }

    // Sanitize and validate response
    const { sanitized, isValid, error } = sanitizeResponse(response);
    if (!isValid) {
      return NextResponse.json(
        { error: error || 'Invalid response' },
        { status: 400 }
      );
    }

    // Submit response with sanitized text
    const manager = new GameStateManager();
    const session = await manager.submitResponse(code, playerId, sanitized);

    // If phase transitioned to guessing, broadcast shuffled responses
    if (session.phase === 'guessing') {
      const currentRound = session.rounds[session.currentRound];
      const shuffledResponses = manager.getShuffledResponses(currentRound);
      await notifyResponsesReady(code, shuffledResponses);
    }

    // Return updated game state
    return NextResponse.json({
      success: true,
      phase: session.phase,
      responseCount: session.rounds[session.currentRound].responses.size,
      totalPlayers: session.players.size,
    }, { status: 200 });

  } catch (error) {
    console.error('Error submitting response:', error);
    
    if (error instanceof Error) {
      if (error.message === 'Game not found') {
        return NextResponse.json(
          { error: 'Game not found' },
          { status: 404 }
        );
      }
      
      if (error.message === 'Player not found') {
        return NextResponse.json(
          { error: 'Player not found' },
          { status: 404 }
        );
      }
      
      if (error.message === 'Not in responding phase') {
        return NextResponse.json(
          { error: 'Not in responding phase' },
          { status: 409 }
        );
      }
      
      if (error.message === 'Response already submitted') {
        return NextResponse.json(
          { error: 'Response already submitted' },
          { status: 409 }
        );
      }
      
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to submit response' },
      { status: 500 }
    );
  }
}
