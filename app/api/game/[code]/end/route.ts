/**
 * POST /api/game/[code]/end
 * End the game (host only)
 */

import { NextRequest, NextResponse } from 'next/server';
import { GameStateManager } from '@/lib/game-state-manager';
import { notifyGameEnded } from '@/lib/game-events';
import { deleteGame } from '@/lib/redis';
import { validateGameCode, validateUUID } from '@/lib/validation';
import { checkRateLimit, getClientIdentifier } from '@/lib/rate-limit';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    // Rate limiting: 10 game ends per minute per client
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

    const { code } = await params;
    
    // Validate game code format
    if (!validateGameCode(code)) {
      return NextResponse.json(
        { error: 'Invalid game code format' },
        { status: 400 }
      );
    }
    
    const body = await request.json();
    const { hostId } = body;

    // Validate input
    if (!hostId || typeof hostId !== 'string') {
      return NextResponse.json(
        { error: 'Host ID is required' },
        { status: 400 }
      );
    }

    // Validate host ID format
    if (!validateUUID(hostId)) {
      return NextResponse.json(
        { error: 'Invalid host ID format' },
        { status: 400 }
      );
    }

    // End game
    const manager = new GameStateManager();
    const session = await manager.endGame(code, hostId);

    // Broadcast game ended event with final stats
    await notifyGameEnded(code, 'Host ended the game', session);

    // Delete game from Redis
    await deleteGame(code);

    // Return final game stats
    return NextResponse.json({
      success: true,
      message: 'Game ended',
      totalRounds: session.rounds.length,
    }, { status: 200 });

  } catch (error) {
    console.error('Error ending game:', error);
    
    if (error instanceof Error) {
      if (error.message === 'Game not found') {
        return NextResponse.json(
          { error: 'Game not found' },
          { status: 404 }
        );
      }
      
      if (error.message === 'Only host can end game') {
        return NextResponse.json(
          { error: 'Only host can end game' },
          { status: 403 }
        );
      }
      
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to end game' },
      { status: 500 }
    );
  }
}
