/**
 * Redis storage layer for game session management
 * Uses Upstash Redis for Vercel-compatible persistence
 */

import { Redis } from '@upstash/redis';
import { GameSession, Player, generateGameCode } from '@/types/game';

// Initialize Redis client
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// TTL for game sessions: 24 hours in seconds
const GAME_SESSION_TTL = 24 * 60 * 60;

/**
 * Serializes a GameSession for Redis storage
 * Converts Maps and Dates to JSON-serializable format
 */
function serializeGameSession(session: GameSession): string {
  const serializable = {
    ...session,
    players: Array.from(session.players.entries()),
    rounds: session.rounds.map(round => ({
      ...round,
      responses: Array.from(round.responses.entries()),
      guesses: Array.from(round.guesses.entries()).map(([playerId, playerGuesses]) => [
        playerId,
        {
          ...playerGuesses,
          guesses: Array.from(playerGuesses.guesses.entries()),
        }
      ]),
      results: round.results ? {
        ...round.results,
        guessedBy: round.results.responses.map(r => ({
          ...r,
          guessedBy: Array.from(r.guessedBy.entries()),
        })),
        penalties: Array.from(round.results.penalties.entries()),
      } : undefined,
    })),
    createdAt: session.createdAt.toISOString(),
    expiresAt: session.expiresAt.toISOString(),
  };
  
  return JSON.stringify(serializable);
}

/**
 * Deserializes a GameSession from Redis storage
 * Converts JSON format back to Maps and Dates
 */
function deserializeGameSession(data: string): GameSession {
  let parsed;
  try {
    parsed = JSON.parse(data);
  } catch (error) {
    console.error('Failed to parse game session data:', error);
    console.error('Data received:', data);
    console.error('Data type:', typeof data);
    throw new Error(`Invalid JSON in game session data: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
  
  return {
    ...parsed,
    players: new Map(parsed.players.map(([id, player]: [string, any]) => [
      id,
      {
        ...player,
        joinedAt: new Date(player.joinedAt),
      }
    ])),
    rounds: parsed.rounds.map((round: any) => ({
      ...round,
      responses: new Map(round.responses.map(([id, response]: [string, any]) => [
        id,
        {
          ...response,
          submittedAt: new Date(response.submittedAt),
        }
      ])),
      guesses: new Map(round.guesses.map(([playerId, playerGuesses]: [string, any]) => [
        playerId,
        {
          ...playerGuesses,
          guesses: new Map(playerGuesses.guesses),
          submittedAt: new Date(playerGuesses.submittedAt),
        }
      ])),
      results: round.results ? {
        responses: round.results.guessedBy.map((r: any) => ({
          ...r,
          guessedBy: new Map(r.guessedBy),
        })),
        penalties: new Map(round.results.penalties),
      } : undefined,
    })),
    createdAt: new Date(parsed.createdAt),
    expiresAt: new Date(parsed.expiresAt),
  };
}

/**
 * Creates a new game session in Redis
 * @param hostNickname - The nickname of the host player
 * @returns The created GameSession
 */
export async function createGame(hostNickname: string): Promise<GameSession> {
  // Generate unique game code
  let code = generateGameCode();
  let attempts = 0;
  const maxAttempts = 10;
  
  // Ensure code is unique
  while (attempts < maxAttempts) {
    const exists = await redis.exists(`game:${code}`);
    if (!exists) break;
    code = generateGameCode();
    attempts++;
  }
  
  if (attempts === maxAttempts) {
    throw new Error('Failed to generate unique game code');
  }
  
  // Create host player
  const hostId = crypto.randomUUID();
  const host: Player = {
    id: hostId,
    nickname: hostNickname,
    isHost: true,
    isConnected: true,
    joinedAt: new Date(),
  };
  
  // Create game session
  const now = new Date();
  const expiresAt = new Date(now.getTime() + GAME_SESSION_TTL * 1000);
  
  const session: GameSession = {
    code,
    hostId,
    players: new Map([[hostId, host]]),
    currentRound: 0,
    phase: 'lobby',
    rounds: [],
    usedPrompts: [],
    createdAt: now,
    expiresAt,
  };
  
  // Store in Redis with TTL
  const serialized = serializeGameSession(session);
  await redis.setex(`game:${code}`, GAME_SESSION_TTL, serialized);
  
  return session;
}

/**
 * Retrieves a game session from Redis
 * @param code - The game code
 * @returns The GameSession or null if not found
 */
export async function getGame(code: string): Promise<GameSession | null> {
  try {
    const data = await redis.get(`game:${code}`);
    
    if (!data) {
      return null;
    }
    
    // Upstash Redis automatically deserializes JSON, so data might already be an object
    // If it's a string, parse it. If it's already an object, use it directly.
    if (typeof data === 'string') {
      return deserializeGameSession(data);
    } else if (typeof data === 'object') {
      // Data is already parsed by Upstash, convert it back to string for our deserializer
      return deserializeGameSession(JSON.stringify(data));
    } else {
      console.error('Redis returned unexpected data type:', typeof data, data);
      throw new Error(`Invalid data type from Redis: expected string or object, got ${typeof data}`);
    }
  } catch (error) {
    console.error('Error in getGame:', error);
    console.error('Game code:', code);
    throw error;
  }
}

/**
 * Updates an existing game session in Redis
 * Uses Redis transaction to prevent race conditions
 * @param session - The updated GameSession
 */
export async function updateGame(session: GameSession): Promise<void> {
  const key = `game:${session.code}`;
  
  // Check if game exists
  const exists = await redis.exists(key);
  if (!exists) {
    throw new Error(`Game ${session.code} not found`);
  }
  
  // Calculate remaining TTL
  const ttl = await redis.ttl(key);
  const remainingTTL = ttl > 0 ? ttl : GAME_SESSION_TTL;
  
  // Serialize and update with transaction
  const serialized = serializeGameSession(session);
  
  // Use pipeline for atomic operation
  const pipeline = redis.pipeline();
  pipeline.setex(key, remainingTTL, serialized);
  await pipeline.exec();
}

/**
 * Deletes a game session from Redis
 * @param code - The game code
 */
export async function deleteGame(code: string): Promise<void> {
  await redis.del(`game:${code}`);
}

/**
 * Gets the Redis client instance for advanced operations
 * @returns The Redis client
 */
export function getRedisClient(): Redis {
  return redis;
}
