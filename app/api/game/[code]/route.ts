/**
 * GET /api/game/[code]
 * Get current game state
 */

import { NextRequest, NextResponse } from 'next/server';
import { getGame } from '@/lib/redis';
import { validateGameCode } from '@/lib/validation';
import { checkRateLimit, getClientIdentifier } from '@/lib/rate-limit';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    // Rate limiting: 60 game state requests per minute per client
    const clientId = getClientIdentifier(request);
    const rateLimit = checkRateLimit(clientId, {
      maxRequests: 60,
      windowMs: 60 * 1000, // 1 minute
    });
    
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Limit': '60',
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

    // Get game from Redis
    const session = await getGame(code);

    if (!session) {
      return NextResponse.json(
        { error: 'Game not found' },
        { status: 404 }
      );
    }

    // Convert Maps to objects for JSON serialization
    const players = Array.from(session.players.values()).map(player => ({
      id: player.id,
      nickname: player.nickname,
      isHost: player.isHost,
      isConnected: player.isConnected,
      joinedAt: player.joinedAt.toISOString(),
    }));

    // Get current round info (if exists)
    let currentRoundInfo: any = null;
    if (session.rounds.length > 0) {
      const currentRound = session.rounds[session.currentRound];
      
      // Build round info based on current phase
      currentRoundInfo = {
        roundNumber: currentRound.roundNumber,
        prompt: currentRound.prompt,
        responseCount: currentRound.responses.size,
        guessCount: currentRound.guesses.size,
      };

      // Include responses if in guessing or reveal phase
      if (session.phase === 'guessing' || session.phase === 'reveal') {
        currentRoundInfo.responses = Array.from(currentRound.responses.values()).map(r => ({
          id: r.id,
          text: r.text,
          // Only include author in reveal phase
          ...(session.phase === 'reveal' && { playerId: r.playerId }),
        }));
      }

      // Include results if in reveal phase
      if (session.phase === 'reveal' && currentRound.results) {
        currentRoundInfo.results = {
          responses: currentRound.results.responses.map(r => ({
            responseId: r.responseId,
            text: r.text,
            actualAuthor: {
              id: r.actualAuthor.id,
              nickname: r.actualAuthor.nickname,
            },
            guessedBy: Object.fromEntries(r.guessedBy),
          })),
          penalties: Object.fromEntries(currentRound.results.penalties),
        };
      }
    }

    // Return game state
    return NextResponse.json({
      code: session.code,
      hostId: session.hostId,
      phase: session.phase,
      currentRound: session.currentRound,
      totalRounds: session.rounds.length,
      players,
      currentRoundInfo,
      createdAt: session.createdAt.toISOString(),
      expiresAt: session.expiresAt.toISOString(),
    }, { status: 200 });

  } catch (error) {
    console.error('Error getting game state:', error);
    
    return NextResponse.json(
      { error: 'Failed to get game state' },
      { status: 500 }
    );
  }
}
