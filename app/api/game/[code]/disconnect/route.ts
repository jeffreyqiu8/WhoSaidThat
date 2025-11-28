/**
 * API Route: POST /api/game/[code]/disconnect
 * Handles player disconnection
 */

import { NextRequest, NextResponse } from 'next/server';
import { GameStateManager } from '@/lib/game-state-manager';
import { notifyPlayerDisconnected, notifyResponsesReady, notifyResultsReady } from '@/lib/game-events';
import { validateGameCode, validateUUID } from '@/lib/validation';
import { checkRateLimit, getClientIdentifier } from '@/lib/rate-limit';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    // Rate limiting: 30 disconnect requests per minute per client
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
    
    const body = await request.json();
    const { playerId } = body;

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

    // Handle disconnect
    const manager = new GameStateManager();
    const { session, newHost, phaseChanged } = await manager.handlePlayerDisconnect(code, playerId);

    // Get the disconnected player info
    const disconnectedPlayer = session.players.get(playerId);
    if (!disconnectedPlayer) {
      return NextResponse.json(
        { error: 'Player not found' },
        { status: 404 }
      );
    }

    // Broadcast disconnect event to all players
    await notifyPlayerDisconnected(
      code,
      playerId,
      disconnectedPlayer.nickname,
      disconnectedPlayer.isHost || (newHost !== undefined),
      newHost
    );

    // If phase changed due to disconnect, broadcast appropriate phase transition event
    if (phaseChanged) {
      const currentRound = session.rounds[session.currentRound];
      
      if (session.phase === 'guessing' && currentRound) {
        // Transitioned to guessing - broadcast responses ready
        const shuffledResponses = manager.getShuffledResponses(currentRound);
        await notifyResponsesReady(code, shuffledResponses);
      } else if (session.phase === 'reveal' && currentRound?.results) {
        // Transitioned to reveal - broadcast results
        await notifyResultsReady(code, currentRound.results);
      }
    }

    return NextResponse.json({
      success: true,
      newHostId: newHost?.id,
      newHostNickname: newHost?.nickname,
      phaseChanged,
    });
  } catch (error) {
    console.error('Error handling disconnect:', error);
    
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to handle disconnect' },
      { status: 500 }
    );
  }
}
