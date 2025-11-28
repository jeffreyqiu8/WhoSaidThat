/**
 * POST /api/game/[code]/start-round
 * Start a new round with a prompt (host only)
 */

import { NextRequest, NextResponse } from 'next/server';
import { GameStateManager } from '@/lib/game-state-manager';
import { notifyPromptStarted } from '@/lib/game-events';
import { validateGameCode, validateUUID, sanitizeText } from '@/lib/validation';
import { checkRateLimit, getClientIdentifier } from '@/lib/rate-limit';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    // Rate limiting: 20 round starts per minute per client
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
    } catch (error) {
      console.error('Failed to parse request body:', error);
      return NextResponse.json(
        { error: 'Invalid request body. Expected JSON.' },
        { status: 400 }
      );
    }
    
    const { hostId, prompt } = body;

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

    // Prompt is optional - if not provided, a random one will be selected
    // If provided, sanitize it
    let sanitizedPrompt: string | undefined;
    if (prompt !== undefined) {
      if (typeof prompt !== 'string') {
        return NextResponse.json(
          { error: 'Prompt must be a string if provided' },
          { status: 400 }
        );
      }
      sanitizedPrompt = sanitizeText(prompt, 500);
    }

    // Start round with sanitized prompt
    const manager = new GameStateManager();
    const session = await manager.startRound(code, hostId, sanitizedPrompt);

    // Broadcast prompt to all players
    const currentRound = session.rounds[session.currentRound];
    await notifyPromptStarted(code, currentRound.prompt, currentRound.roundNumber);

    // Return updated game state
    return NextResponse.json({
      success: true,
      phase: session.phase,
      roundNumber: session.currentRound,
      prompt: currentRound.prompt,
    }, { status: 200 });

  } catch (error) {
    console.error('Error starting round:', error);
    
    if (error instanceof Error) {
      if (error.message === 'Game not found') {
        return NextResponse.json(
          { error: 'Game not found' },
          { status: 404 }
        );
      }
      
      if (error.message === 'Only host can start rounds') {
        return NextResponse.json(
          { error: 'Only host can start rounds' },
          { status: 403 }
        );
      }
      
      if (error.message === 'Cannot start round in current phase') {
        return NextResponse.json(
          { error: 'Cannot start round in current phase' },
          { status: 409 }
        );
      }
      
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to start round' },
      { status: 500 }
    );
  }
}
