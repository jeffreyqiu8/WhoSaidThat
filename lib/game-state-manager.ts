/**
 * Game State Manager
 * Manages game state transitions and business logic
 */

import { GameSession, Player, Response, PlayerGuesses, Round, RoundResults, GamePhase, validateNickname } from '@/types/game';
import { getGame, updateGame, createGame as createGameInRedis } from './redis';

export class GameStateManager {
  /**
   * Creates a new game session
   * @param hostNickname - The nickname of the host player
   * @returns The created GameSession
   */
  async createGame(hostNickname: string): Promise<GameSession> {
    if (!validateNickname(hostNickname)) {
      throw new Error('Invalid host nickname');
    }
    
    return await createGameInRedis(hostNickname);
  }

  /**
   * Adds a player to an existing game session
   * @param code - The game code
   * @param nickname - The player's nickname
   * @returns The updated GameSession and the new Player
   */
  async joinGame(code: string, nickname: string): Promise<{ session: GameSession; player: Player }> {
    // Validate nickname
    if (!validateNickname(nickname)) {
      throw new Error('Invalid nickname');
    }
    
    // Get game session
    const session = await getGame(code);
    if (!session) {
      throw new Error('Game not found');
    }
    
    // Check if game is in lobby phase
    if (session.phase !== 'lobby') {
      throw new Error('Cannot join game in progress');
    }
    
    // Check if game is full (max 8 players)
    if (session.players.size >= 8) {
      throw new Error('Game is full');
    }
    
    // Check for duplicate nickname
    for (const player of session.players.values()) {
      if (player.nickname.toLowerCase() === nickname.toLowerCase()) {
        throw new Error('Nickname already taken');
      }
    }
    
    // Create new player
    const playerId = crypto.randomUUID();
    const player: Player = {
      id: playerId,
      nickname,
      isHost: false,
      isConnected: true,
      joinedAt: new Date(),
    };
    
    // Add player to session
    session.players.set(playerId, player);
    
    // Update session in Redis
    await updateGame(session);
    
    return { session, player };
  }

  /**
   * Submits a player's response to the current prompt
   * @param code - The game code
   * @param playerId - The player's ID
   * @param responseText - The response text
   * @returns The updated GameSession
   */
  async submitResponse(code: string, playerId: string, responseText: string): Promise<GameSession> {
    // Get game session
    const session = await getGame(code);
    if (!session) {
      throw new Error('Game not found');
    }
    
    // Verify player exists
    if (!session.players.has(playerId)) {
      throw new Error('Player not found');
    }
    
    // Check if game is in responding phase
    if (session.phase !== 'responding') {
      throw new Error('Not in responding phase');
    }
    
    // Get current round
    const currentRound = session.rounds[session.currentRound];
    if (!currentRound) {
      throw new Error('No active round');
    }
    
    // Check if player has already submitted
    for (const response of currentRound.responses.values()) {
      if (response.playerId === playerId) {
        throw new Error('Response already submitted');
      }
    }
    
    // Validate response text
    if (!responseText || responseText.trim().length === 0) {
      throw new Error('Response cannot be empty');
    }
    
    // Create response
    const responseId = crypto.randomUUID();
    const response: Response = {
      id: responseId,
      playerId,
      text: responseText.trim(),
      submittedAt: new Date(),
    };
    
    // Add response to round
    currentRound.responses.set(responseId, response);
    
    // Check if all players have submitted
    if (currentRound.responses.size === session.players.size) {
      // Transition to guessing phase
      session.phase = 'guessing';
    }
    
    // Update session in Redis
    await updateGame(session);
    
    return session;
  }

  /**
   * Submits a player's guesses for who wrote each response
   * @param code - The game code
   * @param playerId - The player's ID
   * @param guesses - Map of responseId to guessed playerId
   * @returns The updated GameSession
   */
  async submitGuesses(code: string, playerId: string, guesses: Map<string, string>): Promise<GameSession> {
    // Get game session
    const session = await getGame(code);
    if (!session) {
      throw new Error('Game not found');
    }
    
    // Verify player exists
    if (!session.players.has(playerId)) {
      throw new Error('Player not found');
    }
    
    // Check if game is in guessing phase
    if (session.phase !== 'guessing') {
      throw new Error('Not in guessing phase');
    }
    
    // Get current round
    const currentRound = session.rounds[session.currentRound];
    if (!currentRound) {
      throw new Error('No active round');
    }
    
    // Check if player has already submitted guesses
    if (currentRound.guesses.has(playerId)) {
      throw new Error('Guesses already submitted');
    }
    
    // Validate guesses
    if (guesses.size !== currentRound.responses.size) {
      throw new Error('Must guess for all responses');
    }
    
    // Verify all response IDs are valid
    for (const responseId of guesses.keys()) {
      if (!currentRound.responses.has(responseId)) {
        throw new Error('Invalid response ID');
      }
    }
    
    // Verify all guessed player IDs are valid
    for (const guessedPlayerId of guesses.values()) {
      if (!session.players.has(guessedPlayerId)) {
        throw new Error('Invalid player ID in guess');
      }
    }
    
    // Create player guesses
    const playerGuesses: PlayerGuesses = {
      playerId,
      guesses,
      submittedAt: new Date(),
    };
    
    // Add guesses to round
    currentRound.guesses.set(playerId, playerGuesses);
    
    // Check if all players have submitted guesses
    if (currentRound.guesses.size === session.players.size) {
      // Calculate results and transition to reveal phase
      currentRound.results = this.calculateResults(session, currentRound);
      session.phase = 'reveal';
    }
    
    // Update session in Redis
    await updateGame(session);
    
    return session;
  }

  /**
   * Starts a new round with a prompt
   * @param code - The game code
   * @param hostId - The ID of the host (for authorization)
   * @param prompt - Optional prompt text. If not provided, a random prompt will be selected
   * @returns The updated GameSession
   */
  async startRound(code: string, hostId: string, prompt?: string): Promise<GameSession> {
    // Get game session
    const session = await getGame(code);
    if (!session) {
      throw new Error('Game not found');
    }
    
    // Verify host
    if (session.hostId !== hostId) {
      throw new Error('Only host can start rounds');
    }
    
    // Check if game is in lobby or reveal phase
    if (session.phase !== 'lobby' && session.phase !== 'reveal') {
      throw new Error('Cannot start round in current phase');
    }
    
    // Select prompt: use provided prompt or select random unused prompt
    let selectedPrompt: string;
    if (prompt && prompt.trim().length > 0) {
      selectedPrompt = prompt.trim();
    } else {
      // Import prompt selection function
      const { selectRandomPrompt } = await import('./prompts');
      selectedPrompt = selectRandomPrompt(session.usedPrompts);
    }
    
    // Create new round
    const roundNumber = session.rounds.length;
    const newRound: Round = {
      roundNumber,
      prompt: selectedPrompt,
      responses: new Map(),
      guesses: new Map(),
    };
    
    // Add round to session and track used prompt
    session.rounds.push(newRound);
    session.currentRound = roundNumber;
    session.phase = 'responding';
    session.usedPrompts.push(selectedPrompt);
    
    // Update session in Redis
    await updateGame(session);
    
    return session;
  }

  /**
   * Shuffles an array using Fisher-Yates algorithm
   * @param array - The array to shuffle
   * @returns A new shuffled array
   */
  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  /**
   * Gets shuffled responses for the guessing phase
   * @param round - The current round
   * @returns Array of responses in shuffled order
   */
  getShuffledResponses(round: Round): Response[] {
    const responses = Array.from(round.responses.values());
    return this.shuffleArray(responses);
  }

  /**
   * Calculates results for a round
   * @param session - The game session
   * @param round - The round to calculate results for
   * @returns The calculated RoundResults
   */
  private calculateResults(session: GameSession, round: Round): RoundResults {
    const penalties = new Map<string, number>();
    
    // Initialize penalties for all players
    for (const playerId of session.players.keys()) {
      penalties.set(playerId, 0);
    }
    
    // Build results structure
    const responses = Array.from(round.responses.values()).map(response => {
      const guessedBy = new Map<string, string>();
      
      // Collect all guesses for this response
      for (const [guessingPlayerId, playerGuesses] of round.guesses.entries()) {
        const guess = playerGuesses.guesses.get(response.id);
        if (guess) {
          guessedBy.set(guessingPlayerId, guess);
          
          // Calculate penalty if guess is wrong
          if (guess !== response.playerId) {
            const currentPenalty = penalties.get(guessingPlayerId) || 0;
            penalties.set(guessingPlayerId, currentPenalty + 1);
          }
        }
      }
      
      return {
        responseId: response.id,
        text: response.text,
        actualAuthor: session.players.get(response.playerId)!,
        guessedBy,
      };
    });
    
    return {
      responses,
      penalties,
    };
  }

  /**
   * Ends the game
   * @param code - The game code
   * @param hostId - The ID of the host (for authorization)
   * @returns The final GameSession
   */
  async endGame(code: string, hostId: string): Promise<GameSession> {
    // Get game session
    const session = await getGame(code);
    if (!session) {
      throw new Error('Game not found');
    }
    
    // Verify host
    if (session.hostId !== hostId) {
      throw new Error('Only host can end game');
    }
    
    // Game can be ended from any phase
    // No phase transition needed, just return the session
    // Cleanup will be handled by the API route
    
    return session;
  }

  /**
   * Handles a player disconnection
   * @param code - The game code
   * @param playerId - The ID of the disconnected player
   * @returns Object containing the updated session and optional new host info
   */
  async handlePlayerDisconnect(
    code: string,
    playerId: string
  ): Promise<{ session: GameSession; newHost?: Player; phaseChanged?: boolean }> {
    // Get game session
    const session = await getGame(code);
    if (!session) {
      throw new Error('Game not found');
    }
    
    // Get the player
    const player = session.players.get(playerId);
    if (!player) {
      throw new Error('Player not found');
    }
    
    // Mark player as disconnected
    player.isConnected = false;
    
    let newHost: Player | undefined;
    let phaseChanged = false;
    
    // If the disconnected player was the host, transfer host privileges
    if (player.isHost && session.hostId === playerId) {
      // Find the next connected player to become host
      // Prioritize by join order (earliest joiner becomes host)
      const connectedPlayers = Array.from(session.players.values())
        .filter(p => p.id !== playerId && p.isConnected)
        .sort((a, b) => a.joinedAt.getTime() - b.joinedAt.getTime());
      
      if (connectedPlayers.length > 0) {
        // Transfer host to the earliest connected player
        newHost = connectedPlayers[0];
        newHost.isHost = true;
        session.hostId = newHost.id;
        
        // Remove host status from disconnected player
        player.isHost = false;
      }
      // If no connected players remain, the game will effectively be abandoned
      // but we keep the session for potential reconnections
    }
    
    // Check if we need to auto-advance phases due to disconnection
    // Only consider connected players for phase transitions
    const connectedPlayers = Array.from(session.players.values()).filter(p => p.isConnected);
    const connectedPlayerCount = connectedPlayers.length;
    
    if (connectedPlayerCount > 0) {
      const currentRound = session.rounds[session.currentRound];
      
      // Handle responding phase - check if all connected players have submitted
      if (session.phase === 'responding' && currentRound) {
        const connectedPlayerIds = new Set(connectedPlayers.map(p => p.id));
        const submittedByConnected = Array.from(currentRound.responses.values())
          .filter(r => connectedPlayerIds.has(r.playerId));
        
        if (submittedByConnected.length === connectedPlayerCount) {
          session.phase = 'guessing';
          phaseChanged = true;
        }
      }
      
      // Handle guessing phase - check if all connected players have submitted guesses
      if (session.phase === 'guessing' && currentRound) {
        const connectedPlayerIds = new Set(connectedPlayers.map(p => p.id));
        const guessedByConnected = Array.from(currentRound.guesses.keys())
          .filter(pid => connectedPlayerIds.has(pid));
        
        if (guessedByConnected.length === connectedPlayerCount) {
          // Calculate results and transition to reveal phase
          currentRound.results = this.calculateResults(session, currentRound);
          session.phase = 'reveal';
          phaseChanged = true;
        }
      }
    }
    
    // Update session in Redis
    await updateGame(session);
    
    return { session, newHost, phaseChanged };
  }
}
