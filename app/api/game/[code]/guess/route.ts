/**
 * POST /api/game/[code]/guess
 * Submit guesses for who wrote each response
 */

import { NextRequest, NextResponse } from 'next/server';
import { GameStateManager } from '@/lib/game-state-manager';
import { notifyResultsReady } from '@/lib/game-events';
import { validateGameCode, validateUUID } from '@/lib/validation';
import { checkRateLimit, getClientIdentifier } from '@/lib/rate-limit';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    // Rate limiting: 30 guess submissions per minute per client
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
    const { playerId, guesses } = body;

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

    if (!guesses || typeof guesses !== 'object') {
      return NextResponse.json(
        { error: 'Guesses are required' },
        { status: 400 }
      );
    }

    // Validate all UUIDs in guesses
    for (const [responseId, guessedPlayerId] of Object.entries(guesses)) {
      if (!validateUUID(responseId) || !validateUUID(guessedPlayerId as string)) {
        return NextResponse.json(
          { error: 'Invalid ID format in guesses' },
          { status: 400 }
        );
      }
    }

    // Convert guesses object to Map
    const guessesMap = new Map<string, string>(Object.entries(guesses));

    // Submit guesses
    const manager = new GameStateManager();
    const session = await manager.submitGuesses(code, playerId, guessesMap);

    // If phase transitioned to reveal, broadcast results
    if (session.phase === 'reveal') {
      const currentRound = session.rounds[session.currentRound];
      if (currentRound.results) {
        await notifyResultsReady(code, currentRound.results);
      }
    }

    // Return updated game state
    return NextResponse.json({
      success: true,
      phase: session.phase,
      guessCount: session.rounds[session.currentRound].guesses.size,
      totalPlayers: session.players.size,
    }, { status: 200 });

  } catch (error) {
    console.error('Error submitting guesses:', error);
    
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
      
      if (error.message === 'Not in guessing phase') {
        return NextResponse.json(
          { error: 'Not in guessing phase' },
          { status: 409 }
        );
      }
      
      if (error.message === 'Guesses already submitted') {
        return NextResponse.json(
          { error: 'Guesses already submitted' },
          { status: 409 }
        );
      }
      
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to submit guesses' },
      { status: 500 }
    );
  }
}
