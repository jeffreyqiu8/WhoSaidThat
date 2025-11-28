/**
 * Integration layer between game state management and real-time events
 * Provides helper functions to broadcast game state changes
 */

import { GameSession, Player, Response, RoundResults } from '@/types/game';
import {
  broadcastPlayerJoined,
  broadcastPlayerDisconnected,
  broadcastPromptStarted,
  broadcastResponsesReady,
  broadcastResultsReady,
  broadcastGameEnded,
  PlayerJoinedPayload,
  PlayerDisconnectedPayload,
  PromptStartedPayload,
  ResponsesReadyPayload,
  ResultsReadyPayload,
  GameEndedPayload,
} from './pusher-server';

/**
 * Notify all players when a new player joins
 */
export async function notifyPlayerJoined(
  gameCode: string,
  player: Player,
  totalPlayers: number
): Promise<void> {
  const payload: PlayerJoinedPayload = {
    player: {
      id: player.id,
      nickname: player.nickname,
      isHost: player.isHost,
    },
    playerCount: totalPlayers,
  };
  
  await broadcastPlayerJoined(gameCode, payload);
}

/**
 * Notify all players when a player disconnects
 */
export async function notifyPlayerDisconnected(
  gameCode: string,
  playerId: string,
  nickname: string,
  wasHost: boolean,
  newHost?: Player
): Promise<void> {
  const payload: PlayerDisconnectedPayload = {
    playerId,
    nickname,
    wasHost,
    newHostId: newHost?.id,
    newHostNickname: newHost?.nickname,
  };
  
  await broadcastPlayerDisconnected(gameCode, payload);
}

/**
 * Notify all players when a new round starts with a prompt
 */
export async function notifyPromptStarted(
  gameCode: string,
  prompt: string,
  roundNumber: number
): Promise<void> {
  const payload: PromptStartedPayload = {
    prompt,
    roundNumber,
  };
  
  await broadcastPromptStarted(gameCode, payload);
}

/**
 * Notify all players when responses are ready for guessing
 * Note: Response authors are intentionally hidden
 */
export async function notifyResponsesReady(
  gameCode: string,
  responses: Response[]
): Promise<void> {
  const payload: ResponsesReadyPayload = {
    responses: responses.map(r => ({
      id: r.id,
      text: r.text,
      // playerId intentionally omitted for anonymity
    })),
  };
  
  await broadcastResponsesReady(gameCode, payload);
}

/**
 * Notify all players when results are ready (after guessing)
 */
export async function notifyResultsReady(
  gameCode: string,
  results: RoundResults
): Promise<void> {
  // Convert Map to Record for JSON serialization
  const payload: ResultsReadyPayload = {
    results: {
      responses: results.responses.map(r => ({
        responseId: r.responseId,
        text: r.text,
        actualAuthor: {
          id: r.actualAuthor.id,
          nickname: r.actualAuthor.nickname,
        },
        guessedBy: Object.fromEntries(r.guessedBy),
      })),
      penalties: Object.fromEntries(results.penalties),
    },
  };
  
  await broadcastResultsReady(gameCode, payload);
}

/**
 * Notify all players when the game ends
 */
export async function notifyGameEnded(
  gameCode: string,
  reason: string,
  gameSession?: GameSession
): Promise<void> {
  let finalStats;
  
  if (gameSession) {
    // Calculate total penalties for each player across all rounds
    const playerPenalties = new Map<string, number>();
    
    for (const round of gameSession.rounds) {
      if (round.results) {
        for (const [playerId, penalties] of round.results.penalties) {
          const current = playerPenalties.get(playerId) || 0;
          playerPenalties.set(playerId, current + penalties);
        }
      }
    }
    
    finalStats = {
      totalRounds: gameSession.rounds.length,
      players: Array.from(gameSession.players.values()).map(player => ({
        nickname: player.nickname,
        totalPenalties: playerPenalties.get(player.id) || 0,
      })),
    };
  }
  
  const payload: GameEndedPayload = {
    reason,
    finalStats,
  };
  
  await broadcastGameEnded(gameCode, payload);
}
