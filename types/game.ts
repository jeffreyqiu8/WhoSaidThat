/**
 * Core data models and types for the Who Said That Game
 */

export type GamePhase = 'lobby' | 'prompt' | 'responding' | 'guessing' | 'reveal';

export interface Player {
  id: string;                // UUID
  nickname: string;
  isHost: boolean;
  isConnected: boolean;
  joinedAt: Date;
}

export interface Response {
  id: string;                // UUID
  playerId: string;          // Hidden until reveal
  text: string;
  submittedAt: Date;
}

export interface PlayerGuesses {
  playerId: string;
  guesses: Map<string, string>; // responseId -> guessedPlayerId
  submittedAt: Date;
}

export interface RoundResults {
  responses: Array<{
    responseId: string;
    text: string;
    actualAuthor: Player;
    guessedBy: Map<string, string>; // playerId -> guessedPlayerId
  }>;
  penalties: Map<string, number>; // playerId -> number of wrong guesses (drinks)
}

export interface Round {
  roundNumber: number;
  prompt: string;
  responses: Map<string, Response>;
  guesses: Map<string, PlayerGuesses>;
  results?: RoundResults;
}

export interface GameSession {
  code: string;              // 6-character unique code
  hostId: string;            // Player ID of host
  players: Map<string, Player>;
  currentRound: number;
  phase: GamePhase;
  rounds: Round[];
  usedPrompts: string[];     // Track prompts used in this game to avoid repeats
  createdAt: Date;
  expiresAt: Date;           // Auto-cleanup after 24 hours
}

/**
 * Generates a unique 6-character alphanumeric game code
 * @returns A 6-character game code (uppercase letters and numbers)
 */
export function generateGameCode(): string {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  
  for (let i = 0; i < 6; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    code += characters[randomIndex];
  }
  
  return code;
}

/**
 * Validates a player nickname according to game rules
 * @param nickname - The nickname to validate
 * @returns true if valid, false otherwise
 * 
 * Rules:
 * - Must be between 3 and 20 characters
 * - Can only contain alphanumeric characters and spaces
 * - Cannot be empty or only whitespace
 */
export function validateNickname(nickname: string): boolean {
  // Check if nickname exists and is not just whitespace
  if (!nickname || nickname.trim().length === 0) {
    return false;
  }
  
  // Trim the nickname for length check
  const trimmed = nickname.trim();
  
  // Check length constraints (3-20 characters)
  if (trimmed.length < 3 || trimmed.length > 20) {
    return false;
  }
  
  // Check if contains only alphanumeric characters and spaces
  const validPattern = /^[a-zA-Z0-9 ]+$/;
  if (!validPattern.test(nickname)) {
    return false;
  }
  
  return true;
}
