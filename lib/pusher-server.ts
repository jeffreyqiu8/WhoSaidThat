/**
 * Server-side Pusher configuration and event broadcasting
 * Handles real-time communication for game events
 */

import Pusher from 'pusher';

// Initialize Pusher server instance
let pusherInstance: Pusher | null = null;

/**
 * Get or create Pusher server instance
 * Lazy initialization to avoid issues during build time
 */
export function getPusherServer(): Pusher {
  if (!pusherInstance) {
    pusherInstance = new Pusher({
      appId: process.env.PUSHER_APP_ID || '',
      key: process.env.NEXT_PUBLIC_PUSHER_APP_KEY || '',
      secret: process.env.PUSHER_SECRET || '',
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || '',
      useTLS: true,
    });
  }
  
  return pusherInstance;
}

/**
 * Get channel name for a game session
 * Convention: game-${code}
 */
export function getGameChannel(code: string): string {
  return `game-${code}`;
}

/**
 * Event types that can be broadcast to clients
 */
export enum GameEvent {
  PLAYER_JOINED = 'playerJoined',
  PLAYER_DISCONNECTED = 'playerDisconnected',
  PROMPT_STARTED = 'promptStarted',
  RESPONSES_READY = 'responsesReady',
  RESULTS_READY = 'resultsReady',
  GAME_ENDED = 'gameEnded',
}

/**
 * Event payload types
 */
export interface PlayerJoinedPayload {
  player: {
    id: string;
    nickname: string;
    isHost: boolean;
  };
  playerCount: number;
}

export interface PlayerDisconnectedPayload {
  playerId: string;
  nickname: string;
  wasHost: boolean;
  newHostId?: string;
  newHostNickname?: string;
}

export interface PromptStartedPayload {
  prompt: string;
  roundNumber: number;
}

export interface ResponsesReadyPayload {
  responses: Array<{
    id: string;
    text: string;
    // playerId is intentionally omitted for anonymity
  }>;
}

export interface ResultsReadyPayload {
  results: {
    responses: Array<{
      responseId: string;
      text: string;
      actualAuthor: {
        id: string;
        nickname: string;
      };
      guessedBy: Record<string, string>; // playerId -> guessedPlayerId
    }>;
    penalties: Record<string, number>; // playerId -> number of drinks
  };
}

export interface GameEndedPayload {
  reason: string;
  finalStats?: {
    totalRounds: number;
    players: Array<{
      nickname: string;
      totalPenalties: number;
    }>;
  };
}

/**
 * Broadcast player joined event
 */
export async function broadcastPlayerJoined(
  code: string,
  payload: PlayerJoinedPayload
): Promise<void> {
  const pusher = getPusherServer();
  const channel = getGameChannel(code);
  
  await pusher.trigger(channel, GameEvent.PLAYER_JOINED, payload);
}

/**
 * Broadcast player disconnected event
 */
export async function broadcastPlayerDisconnected(
  code: string,
  payload: PlayerDisconnectedPayload
): Promise<void> {
  const pusher = getPusherServer();
  const channel = getGameChannel(code);
  
  await pusher.trigger(channel, GameEvent.PLAYER_DISCONNECTED, payload);
}

/**
 * Broadcast prompt started event
 */
export async function broadcastPromptStarted(
  code: string,
  payload: PromptStartedPayload
): Promise<void> {
  const pusher = getPusherServer();
  const channel = getGameChannel(code);
  
  await pusher.trigger(channel, GameEvent.PROMPT_STARTED, payload);
}

/**
 * Broadcast responses ready event (when all players have submitted)
 */
export async function broadcastResponsesReady(
  code: string,
  payload: ResponsesReadyPayload
): Promise<void> {
  const pusher = getPusherServer();
  const channel = getGameChannel(code);
  
  await pusher.trigger(channel, GameEvent.RESPONSES_READY, payload);
}

/**
 * Broadcast results ready event (after guessing phase)
 */
export async function broadcastResultsReady(
  code: string,
  payload: ResultsReadyPayload
): Promise<void> {
  const pusher = getPusherServer();
  const channel = getGameChannel(code);
  
  await pusher.trigger(channel, GameEvent.RESULTS_READY, payload);
}

/**
 * Broadcast game ended event
 */
export async function broadcastGameEnded(
  code: string,
  payload: GameEndedPayload
): Promise<void> {
  const pusher = getPusherServer();
  const channel = getGameChannel(code);
  
  await pusher.trigger(channel, GameEvent.GAME_ENDED, payload);
}
