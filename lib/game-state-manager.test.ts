import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GameStateManager } from './game-state-manager';
import * as redis from './redis';

vi.mock('./redis', () => ({
  createGame: vi.fn(),
  getGame: vi.fn(),
  updateGame: vi.fn(),
  deleteGame: vi.fn(),
}));

describe('GameStateManager', () => {
  let manager: GameStateManager;

  beforeEach(() => {
    manager = new GameStateManager();
    vi.clearAllMocks();
  });

  describe('createGame', () => {
    it('should create a game with valid host nickname', async () => {
      const mockSession = {
        code: 'ABC123',
        hostId: 'host-id',
        players: new Map([['host-id', {
          id: 'host-id',
          nickname: 'TestHost',
          isHost: true,
          isConnected: true,
          joinedAt: new Date(),
        }]]),
        currentRound: 0,
        phase: 'lobby' as const,
        rounds: [],
        usedPrompts: [],
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      };

      vi.mocked(redis.createGame).mockResolvedValue(mockSession);

      const result = await manager.createGame('TestHost');

      expect(result).toBeDefined();
      expect(result.code).toBe('ABC123');
      expect(result.players.size).toBe(1);
      expect(redis.createGame).toHaveBeenCalledWith('TestHost');
    });

    it('should reject invalid host nickname', async () => {
      await expect(manager.createGame('ab')).rejects.toThrow('Invalid host nickname');
      await expect(manager.createGame('')).rejects.toThrow('Invalid host nickname');
    });
  });

  describe('joinGame', () => {
    it('should allow player to join existing game in lobby', async () => {
      const mockSession = {
        code: 'ABC123',
        hostId: 'host-id',
        players: new Map([['host-id', {
          id: 'host-id',
          nickname: 'Host',
          isHost: true,
          isConnected: true,
          joinedAt: new Date(),
        }]]),
        currentRound: 0,
        phase: 'lobby' as const,
        rounds: [],
        usedPrompts: [],
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      };

      vi.mocked(redis.getGame).mockResolvedValue(mockSession);
      vi.mocked(redis.updateGame).mockResolvedValue();

      const result = await manager.joinGame('ABC123', 'Player1');

      expect(result.session.players.size).toBe(2);
      expect(result.player.nickname).toBe('Player1');
      expect(result.player.isHost).toBe(false);
    });

    it('should reject duplicate nicknames', async () => {
      const mockSession = {
        code: 'ABC123',
        hostId: 'host-id',
        players: new Map([['host-id', {
          id: 'host-id',
          nickname: 'Host',
          isHost: true,
          isConnected: true,
          joinedAt: new Date(),
        }]]),
        currentRound: 0,
        phase: 'lobby' as const,
        rounds: [],
        usedPrompts: [],
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      };

      vi.mocked(redis.getGame).mockResolvedValue(mockSession);

      await expect(manager.joinGame('ABC123', 'Host')).rejects.toThrow('Nickname already taken');
    });

    it('should reject joining non-existent game', async () => {
      vi.mocked(redis.getGame).mockResolvedValue(null);

      await expect(manager.joinGame('INVALID', 'Player1')).rejects.toThrow('Game not found');
    });
  });

  describe('submitResponse', () => {
    it('should accept response in responding phase', async () => {
      const mockSession = {
        code: 'ABC123',
        hostId: 'player1',
        players: new Map([
          ['player1', { id: 'player1', nickname: 'P1', isHost: true, isConnected: true, joinedAt: new Date() }],
          ['player2', { id: 'player2', nickname: 'P2', isHost: false, isConnected: true, joinedAt: new Date() }],
        ]),
        currentRound: 0,
        phase: 'responding' as const,
        rounds: [{
          roundNumber: 0,
          prompt: 'Test prompt',
          responses: new Map(),
          guesses: new Map(),
        }],
        usedPrompts: [],
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      };

      vi.mocked(redis.getGame).mockResolvedValue(mockSession);
      vi.mocked(redis.updateGame).mockResolvedValue();

      const result = await manager.submitResponse('ABC123', 'player1', 'My response');

      expect(result.rounds[0].responses.size).toBe(1);
      expect(result.phase).toBe('responding');
    });

    it('should transition to guessing when all responses submitted', async () => {
      const mockSession = {
        code: 'ABC123',
        hostId: 'player1',
        players: new Map([
          ['player1', { id: 'player1', nickname: 'P1', isHost: true, isConnected: true, joinedAt: new Date() }],
          ['player2', { id: 'player2', nickname: 'P2', isHost: false, isConnected: true, joinedAt: new Date() }],
        ]),
        currentRound: 0,
        phase: 'responding' as const,
        rounds: [{
          roundNumber: 0,
          prompt: 'Test prompt',
          responses: new Map([
            ['resp1', { id: 'resp1', playerId: 'player1', text: 'Response 1', submittedAt: new Date() }],
          ]),
          guesses: new Map(),
        }],
        usedPrompts: [],
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      };

      vi.mocked(redis.getGame).mockResolvedValue(mockSession);
      vi.mocked(redis.updateGame).mockResolvedValue();

      const result = await manager.submitResponse('ABC123', 'player2', 'Response 2');

      expect(result.rounds[0].responses.size).toBe(2);
      expect(result.phase).toBe('guessing');
    });
  });

  describe('submitGuesses', () => {
    it('should accept guesses in guessing phase', async () => {
      const mockSession = {
        code: 'ABC123',
        hostId: 'player1',
        players: new Map([
          ['player1', { id: 'player1', nickname: 'P1', isHost: true, isConnected: true, joinedAt: new Date() }],
          ['player2', { id: 'player2', nickname: 'P2', isHost: false, isConnected: true, joinedAt: new Date() }],
        ]),
        currentRound: 0,
        phase: 'guessing' as const,
        rounds: [{
          roundNumber: 0,
          prompt: 'Test prompt',
          responses: new Map([
            ['resp1', { id: 'resp1', playerId: 'player1', text: 'Response 1', submittedAt: new Date() }],
            ['resp2', { id: 'resp2', playerId: 'player2', text: 'Response 2', submittedAt: new Date() }],
          ]),
          guesses: new Map(),
        }],
        usedPrompts: [],
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      };

      vi.mocked(redis.getGame).mockResolvedValue(mockSession);
      vi.mocked(redis.updateGame).mockResolvedValue();

      const guesses = new Map([
        ['resp1', 'player2'],
        ['resp2', 'player1'],
      ]);

      const result = await manager.submitGuesses('ABC123', 'player1', guesses);

      expect(result.rounds[0].guesses.size).toBe(1);
      expect(result.phase).toBe('guessing');
    });

    it('should transition to reveal and calculate penalties when all guesses submitted', async () => {
      const mockSession = {
        code: 'ABC123',
        hostId: 'player1',
        players: new Map([
          ['player1', { id: 'player1', nickname: 'P1', isHost: true, isConnected: true, joinedAt: new Date() }],
          ['player2', { id: 'player2', nickname: 'P2', isHost: false, isConnected: true, joinedAt: new Date() }],
        ]),
        currentRound: 0,
        phase: 'guessing' as const,
        rounds: [{
          roundNumber: 0,
          prompt: 'Test prompt',
          responses: new Map([
            ['resp1', { id: 'resp1', playerId: 'player1', text: 'Response 1', submittedAt: new Date() }],
            ['resp2', { id: 'resp2', playerId: 'player2', text: 'Response 2', submittedAt: new Date() }],
          ]),
          guesses: new Map([
            ['player1', {
              playerId: 'player1',
              guesses: new Map([['resp1', 'player2'], ['resp2', 'player1']]),
              submittedAt: new Date(),
            }],
          ]),
        }],
        usedPrompts: [],
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      };

      vi.mocked(redis.getGame).mockResolvedValue(mockSession);
      vi.mocked(redis.updateGame).mockResolvedValue();

      const guesses = new Map([
        ['resp1', 'player1'],
        ['resp2', 'player2'],
      ]);

      const result = await manager.submitGuesses('ABC123', 'player2', guesses);

      expect(result.phase).toBe('reveal');
      expect(result.rounds[0].results).toBeDefined();
      expect(result.rounds[0].results!.penalties).toBeDefined();
    });
  });

  describe('penalty calculation', () => {
    it('should calculate correct penalties for wrong guesses', async () => {
      const mockSession = {
        code: 'ABC123',
        hostId: 'player1',
        players: new Map([
          ['player1', { id: 'player1', nickname: 'P1', isHost: true, isConnected: true, joinedAt: new Date() }],
          ['player2', { id: 'player2', nickname: 'P2', isHost: false, isConnected: true, joinedAt: new Date() }],
        ]),
        currentRound: 0,
        phase: 'guessing' as const,
        rounds: [{
          roundNumber: 0,
          prompt: 'Test prompt',
          responses: new Map([
            ['resp1', { id: 'resp1', playerId: 'player1', text: 'Response 1', submittedAt: new Date() }],
            ['resp2', { id: 'resp2', playerId: 'player2', text: 'Response 2', submittedAt: new Date() }],
          ]),
          guesses: new Map([
            ['player1', {
              playerId: 'player1',
              guesses: new Map([['resp1', 'player2'], ['resp2', 'player1']]),
              submittedAt: new Date(),
            }],
          ]),
        }],
        usedPrompts: [],
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      };

      vi.mocked(redis.getGame).mockResolvedValue(mockSession);
      vi.mocked(redis.updateGame).mockResolvedValue();

      const guesses = new Map([
        ['resp1', 'player1'],
        ['resp2', 'player2'],
      ]);

      const result = await manager.submitGuesses('ABC123', 'player2', guesses);

      expect(result.rounds[0].results!.penalties.get('player1')).toBe(2);
      expect(result.rounds[0].results!.penalties.get('player2')).toBe(0);
    });
  });

  describe('response shuffling', () => {
    it('should shuffle responses', () => {
      const round = {
        roundNumber: 0,
        prompt: 'Test',
        responses: new Map([
          ['r1', { id: 'r1', playerId: 'p1', text: 'Response 1', submittedAt: new Date() }],
          ['r2', { id: 'r2', playerId: 'p2', text: 'Response 2', submittedAt: new Date() }],
          ['r3', { id: 'r3', playerId: 'p3', text: 'Response 3', submittedAt: new Date() }],
          ['r4', { id: 'r4', playerId: 'p4', text: 'Response 4', submittedAt: new Date() }],
        ]),
        guesses: new Map(),
      };

      const shuffled = manager.getShuffledResponses(round);

      expect(shuffled.length).toBe(4);
      expect(shuffled).toContainEqual(expect.objectContaining({ id: 'r1' }));
      expect(shuffled).toContainEqual(expect.objectContaining({ id: 'r2' }));
      expect(shuffled).toContainEqual(expect.objectContaining({ id: 'r3' }));
      expect(shuffled).toContainEqual(expect.objectContaining({ id: 'r4' }));
    });
  });

  describe('startRound', () => {
    it('should start a new round from lobby', async () => {
      const mockSession = {
        code: 'ABC123',
        hostId: 'host-id',
        players: new Map([['host-id', {
          id: 'host-id',
          nickname: 'Host',
          isHost: true,
          isConnected: true,
          joinedAt: new Date(),
        }]]),
        currentRound: 0,
        phase: 'lobby' as const,
        rounds: [],
        usedPrompts: [],
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      };

      vi.mocked(redis.getGame).mockResolvedValue(mockSession);
      vi.mocked(redis.updateGame).mockResolvedValue();

      const result = await manager.startRound('ABC123', 'host-id', 'What is your favorite color?');

      expect(result.rounds.length).toBe(1);
      expect(result.phase).toBe('responding');
      expect(result.rounds[0].prompt).toBe('What is your favorite color?');
      expect(result.usedPrompts).toContain('What is your favorite color?');
    });

    it('should automatically select a prompt when none is provided', async () => {
      const mockSession = {
        code: 'ABC123',
        hostId: 'host-id',
        players: new Map([['host-id', {
          id: 'host-id',
          nickname: 'Host',
          isHost: true,
          isConnected: true,
          joinedAt: new Date(),
        }]]),
        currentRound: 0,
        phase: 'lobby' as const,
        rounds: [],
        usedPrompts: [],
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      };

      vi.mocked(redis.getGame).mockResolvedValue(mockSession);
      vi.mocked(redis.updateGame).mockResolvedValue();

      const result = await manager.startRound('ABC123', 'host-id');

      expect(result.rounds.length).toBe(1);
      expect(result.phase).toBe('responding');
      expect(result.rounds[0].prompt).toBeTruthy();
      expect(result.rounds[0].prompt.length).toBeGreaterThan(0);
      expect(result.usedPrompts).toContain(result.rounds[0].prompt);
    });

    it('should not reuse prompts within the same game', async () => {
      const usedPrompt = 'What is your favorite color?';
      const mockSession = {
        code: 'ABC123',
        hostId: 'host-id',
        players: new Map([['host-id', {
          id: 'host-id',
          nickname: 'Host',
          isHost: true,
          isConnected: true,
          joinedAt: new Date(),
        }]]),
        currentRound: 0,
        phase: 'reveal' as const,
        rounds: [{
          roundNumber: 0,
          prompt: usedPrompt,
          responses: new Map(),
          guesses: new Map(),
        }],
        usedPrompts: [usedPrompt],
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      };

      vi.mocked(redis.getGame).mockResolvedValue(mockSession);
      vi.mocked(redis.updateGame).mockResolvedValue();

      const result = await manager.startRound('ABC123', 'host-id');

      expect(result.rounds.length).toBe(2);
      expect(result.rounds[1].prompt).not.toBe(usedPrompt);
      expect(result.usedPrompts).toContain(result.rounds[1].prompt);
      expect(result.usedPrompts.length).toBe(2);
    });

    it('should reject non-host starting round', async () => {
      const mockSession = {
        code: 'ABC123',
        hostId: 'host-id',
        players: new Map([
          ['host-id', { id: 'host-id', nickname: 'Host', isHost: true, isConnected: true, joinedAt: new Date() }],
          ['player-id', { id: 'player-id', nickname: 'Player', isHost: false, isConnected: true, joinedAt: new Date() }],
        ]),
        currentRound: 0,
        phase: 'lobby' as const,
        rounds: [],
        usedPrompts: [],
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      };

      vi.mocked(redis.getGame).mockResolvedValue(mockSession);

      await expect(manager.startRound('ABC123', 'player-id', 'Test prompt')).rejects.toThrow('Only host can start rounds');
    });
  });

  describe('handlePlayerDisconnect', () => {
    it('should mark player as disconnected', async () => {
      const mockSession = {
        code: 'ABC123',
        hostId: 'player1',
        players: new Map([
          ['player1', { id: 'player1', nickname: 'P1', isHost: true, isConnected: true, joinedAt: new Date() }],
          ['player2', { id: 'player2', nickname: 'P2', isHost: false, isConnected: true, joinedAt: new Date() }],
        ]),
        currentRound: 0,
        phase: 'lobby' as const,
        rounds: [],
        usedPrompts: [],
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      };

      vi.mocked(redis.getGame).mockResolvedValue(mockSession);
      vi.mocked(redis.updateGame).mockResolvedValue();

      const result = await manager.handlePlayerDisconnect('ABC123', 'player2');

      expect(result.session.players.get('player2')?.isConnected).toBe(false);
      expect(result.newHost).toBeUndefined();
      expect(result.phaseChanged).toBe(false);
    });

    it('should transfer host when host disconnects', async () => {
      const mockSession = {
        code: 'ABC123',
        hostId: 'player1',
        players: new Map([
          ['player1', { id: 'player1', nickname: 'P1', isHost: true, isConnected: true, joinedAt: new Date(Date.now() - 1000) }],
          ['player2', { id: 'player2', nickname: 'P2', isHost: false, isConnected: true, joinedAt: new Date() }],
        ]),
        currentRound: 0,
        phase: 'lobby' as const,
        rounds: [],
        usedPrompts: [],
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      };

      vi.mocked(redis.getGame).mockResolvedValue(mockSession);
      vi.mocked(redis.updateGame).mockResolvedValue();

      const result = await manager.handlePlayerDisconnect('ABC123', 'player1');

      expect(result.session.players.get('player1')?.isConnected).toBe(false);
      expect(result.session.players.get('player1')?.isHost).toBe(false);
      expect(result.newHost).toBeDefined();
      expect(result.newHost?.id).toBe('player2');
      expect(result.session.hostId).toBe('player2');
      expect(result.session.players.get('player2')?.isHost).toBe(true);
    });

    it('should auto-advance from responding phase when all connected players submitted', async () => {
      const mockSession = {
        code: 'ABC123',
        hostId: 'player1',
        players: new Map([
          ['player1', { id: 'player1', nickname: 'P1', isHost: true, isConnected: true, joinedAt: new Date() }],
          ['player2', { id: 'player2', nickname: 'P2', isHost: false, isConnected: true, joinedAt: new Date() }],
          ['player3', { id: 'player3', nickname: 'P3', isHost: false, isConnected: true, joinedAt: new Date() }],
        ]),
        currentRound: 0,
        phase: 'responding' as const,
        rounds: [{
          roundNumber: 0,
          prompt: 'Test prompt',
          responses: new Map([
            ['resp1', { id: 'resp1', playerId: 'player1', text: 'Response 1', submittedAt: new Date() }],
            ['resp2', { id: 'resp2', playerId: 'player2', text: 'Response 2', submittedAt: new Date() }],
          ]),
          guesses: new Map(),
        }],
        usedPrompts: [],
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      };

      vi.mocked(redis.getGame).mockResolvedValue(mockSession);
      vi.mocked(redis.updateGame).mockResolvedValue();

      const result = await manager.handlePlayerDisconnect('ABC123', 'player3');

      expect(result.session.players.get('player3')?.isConnected).toBe(false);
      expect(result.phaseChanged).toBe(true);
      expect(result.session.phase).toBe('guessing');
    });

    it('should auto-advance from guessing phase when all connected players submitted', async () => {
      const mockSession = {
        code: 'ABC123',
        hostId: 'player1',
        players: new Map([
          ['player1', { id: 'player1', nickname: 'P1', isHost: true, isConnected: true, joinedAt: new Date() }],
          ['player2', { id: 'player2', nickname: 'P2', isHost: false, isConnected: true, joinedAt: new Date() }],
          ['player3', { id: 'player3', nickname: 'P3', isHost: false, isConnected: true, joinedAt: new Date() }],
        ]),
        currentRound: 0,
        phase: 'guessing' as const,
        rounds: [{
          roundNumber: 0,
          prompt: 'Test prompt',
          responses: new Map([
            ['resp1', { id: 'resp1', playerId: 'player1', text: 'Response 1', submittedAt: new Date() }],
            ['resp2', { id: 'resp2', playerId: 'player2', text: 'Response 2', submittedAt: new Date() }],
            ['resp3', { id: 'resp3', playerId: 'player3', text: 'Response 3', submittedAt: new Date() }],
          ]),
          guesses: new Map([
            ['player1', {
              playerId: 'player1',
              guesses: new Map([['resp1', 'player1'], ['resp2', 'player2'], ['resp3', 'player3']]),
              submittedAt: new Date(),
            }],
            ['player2', {
              playerId: 'player2',
              guesses: new Map([['resp1', 'player1'], ['resp2', 'player2'], ['resp3', 'player3']]),
              submittedAt: new Date(),
            }],
          ]),
        }],
        usedPrompts: [],
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      };

      vi.mocked(redis.getGame).mockResolvedValue(mockSession);
      vi.mocked(redis.updateGame).mockResolvedValue();

      const result = await manager.handlePlayerDisconnect('ABC123', 'player3');

      expect(result.session.players.get('player3')?.isConnected).toBe(false);
      expect(result.phaseChanged).toBe(true);
      expect(result.session.phase).toBe('reveal');
      expect(result.session.rounds[0].results).toBeDefined();
    });

    it('should not auto-advance if not all connected players have submitted', async () => {
      const mockSession = {
        code: 'ABC123',
        hostId: 'player1',
        players: new Map([
          ['player1', { id: 'player1', nickname: 'P1', isHost: true, isConnected: true, joinedAt: new Date() }],
          ['player2', { id: 'player2', nickname: 'P2', isHost: false, isConnected: true, joinedAt: new Date() }],
          ['player3', { id: 'player3', nickname: 'P3', isHost: false, isConnected: true, joinedAt: new Date() }],
        ]),
        currentRound: 0,
        phase: 'responding' as const,
        rounds: [{
          roundNumber: 0,
          prompt: 'Test prompt',
          responses: new Map([
            ['resp1', { id: 'resp1', playerId: 'player1', text: 'Response 1', submittedAt: new Date() }],
          ]),
          guesses: new Map(),
        }],
        usedPrompts: [],
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      };

      vi.mocked(redis.getGame).mockResolvedValue(mockSession);
      vi.mocked(redis.updateGame).mockResolvedValue();

      const result = await manager.handlePlayerDisconnect('ABC123', 'player3');

      expect(result.session.players.get('player3')?.isConnected).toBe(false);
      expect(result.phaseChanged).toBe(false);
      expect(result.session.phase).toBe('responding');
    });

    it('should reject disconnect for non-existent player', async () => {
      const mockSession = {
        code: 'ABC123',
        hostId: 'player1',
        players: new Map([
          ['player1', { id: 'player1', nickname: 'P1', isHost: true, isConnected: true, joinedAt: new Date() }],
        ]),
        currentRound: 0,
        phase: 'lobby' as const,
        rounds: [],
        usedPrompts: [],
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      };

      vi.mocked(redis.getGame).mockResolvedValue(mockSession);

      await expect(manager.handlePlayerDisconnect('ABC123', 'invalid-player')).rejects.toThrow('Player not found');
    });
  });
});
