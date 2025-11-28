'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { GameSession, GamePhase, Player } from '@/types/game';
import { subscribeToGame, unsubscribeFromGame, GameEvent } from '@/lib/pusher-client';
import type { Channel } from 'pusher-js';
import {
  PlayerJoinedPayload,
  PlayerDisconnectedPayload,
  PromptStartedPayload,
  ResponsesReadyPayload,
  ResultsReadyPayload,
  GameEndedPayload,
} from '@/lib/pusher-server';
import ToastContainer, { ToastMessage } from './Toast';
import { subscribeToToasts } from '@/lib/use-toast';
import { fetchWithRetry, getErrorMessage } from '@/lib/api-client';

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'reconnecting';

interface GameContextValue {
  gameSession: GameSession | null;
  connectionStatus: ConnectionStatus;
  error: string | null;
  isGameEnded: boolean;
  gameEndedReason: string | null;
  refreshGameState: () => Promise<void>;
}

const GameContext = createContext<GameContextValue | undefined>(undefined);

interface GameProviderProps {
  gameCode: string;
  currentPlayerId?: string;
  children: React.ReactNode;
}

export function GameProvider({ gameCode, currentPlayerId, children }: GameProviderProps) {
  const [gameSession, setGameSession] = useState<GameSession | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connecting');
  const [error, setError] = useState<string | null>(null);
  const [isGameEnded, setIsGameEnded] = useState(false);
  const [gameEndedReason, setGameEndedReason] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  
  const channelRef = useRef<Channel | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 10;
  const hasNotifiedDisconnectRef = useRef(false);

  // Add toast notification
  const addToast = useCallback((message: string, type: ToastMessage['type'] = 'info', duration?: number) => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts(prev => [...prev, { id, message, type, duration }]);
  }, []);

  // Remove toast notification
  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  // Subscribe to global toast events
  useEffect(() => {
    const unsubscribe = subscribeToToasts((toast) => {
      setToasts(prev => [...prev, toast]);
    });
    
    return unsubscribe;
  }, []);

  // Fetch game state from API with retry logic
  const refreshGameState = useCallback(async () => {
    try {
      const response = await fetchWithRetry(`/api/game/${gameCode}`, {}, {
        maxRetries: 2,
        retryDelay: 500,
      });
      
      if (!response.ok) {
        if (response.status === 404) {
          setError('Game not found');
        } else {
          setError('Failed to load game');
        }
        return;
      }

      const data = await response.json();
      
      // Convert API response to GameSession format
      // Note: API returns a simplified structure, not the full GameSession
      const rounds: any[] = [];
      
      // If there's current round info, add it to rounds array
      if (data.currentRoundInfo) {
        const roundInfo = data.currentRoundInfo;
        rounds.push({
          roundNumber: roundInfo.roundNumber,
          prompt: roundInfo.prompt,
          responses: new Map((roundInfo.responses || []).map((r: any) => [
            r.id as string,
            {
              id: r.id,
              text: r.text,
              playerId: r.playerId || '',
              submittedAt: new Date(),
            },
          ])),
          guesses: new Map(),
          results: roundInfo.results ? {
            responses: (roundInfo.results.responses || []).map((r: any) => ({
              responseId: r.responseId,
              text: r.text,
              actualAuthor: r.actualAuthor,
              guessedBy: new Map(Object.entries(r.guessedBy || {})),
            })),
            penalties: new Map(Object.entries(roundInfo.results.penalties || {})),
          } : undefined,
        });
      }
      
      const session: GameSession = {
        code: data.code,
        hostId: data.hostId,
        phase: data.phase,
        currentRound: data.currentRound,
        // Convert players array to Map
        players: new Map((data.players || []).map((player: any) => [
          player.id,
          {
            ...player,
            joinedAt: new Date(player.joinedAt),
          },
        ])),
        rounds,
        usedPrompts: [],
        createdAt: new Date(data.createdAt),
        expiresAt: new Date(data.expiresAt),
      };

      setGameSession(session);
      setError(null);
    } catch (err) {
      console.error('Error fetching game state:', err);
      const errorMessage = getErrorMessage(err);
      setError(errorMessage);
      addToast(errorMessage, 'error');
    }
  }, [gameCode, addToast]);

  // Notify server of disconnect
  const notifyDisconnect = useCallback(async () => {
    if (!currentPlayerId || hasNotifiedDisconnectRef.current) {
      return;
    }

    hasNotifiedDisconnectRef.current = true;

    try {
      await fetch(`/api/game/${gameCode}/disconnect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          playerId: currentPlayerId,
        }),
      });
    } catch (err) {
      console.error('Error notifying disconnect:', err);
    }
  }, [gameCode, currentPlayerId]);

  // Exponential backoff reconnection logic
  const attemptReconnect = useCallback(() => {
    if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
      setConnectionStatus('disconnected');
      setError('Unable to reconnect. Please refresh the page.');
      // Notify server of disconnect after max attempts
      notifyDisconnect();
      return;
    }

    const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
    reconnectAttemptsRef.current += 1;
    
    setConnectionStatus('reconnecting');
    
    reconnectTimeoutRef.current = setTimeout(() => {
      console.log(`Reconnection attempt ${reconnectAttemptsRef.current}/${maxReconnectAttempts}`);
      
      // Unsubscribe from old channel if it exists
      if (channelRef.current) {
        unsubscribeFromGame(gameCode);
        channelRef.current = null;
      }
      
      // Try to resubscribe
      setupRealtimeConnection();
    }, delay);
  }, [gameCode, notifyDisconnect]);

  // Set up real-time event subscriptions
  const setupRealtimeConnection = useCallback(() => {
    try {
      const channel = subscribeToGame(gameCode);
      channelRef.current = channel;

      // Handle successful connection
      channel.bind('pusher:subscription_succeeded', () => {
        console.log('Successfully subscribed to game channel');
        setConnectionStatus('connected');
        reconnectAttemptsRef.current = 0; // Reset reconnect attempts on success
        
        // Fetch initial game state
        refreshGameState();
      });

      // Handle subscription error
      channel.bind('pusher:subscription_error', (status: any) => {
        console.error('Subscription error:', status);
        setConnectionStatus('disconnected');
        attemptReconnect();
      });

      // Listen for player joined events
      channel.bind(GameEvent.PLAYER_JOINED, (data: PlayerJoinedPayload) => {
        console.log('Player joined:', data);
        refreshGameState();
      });

      // Listen for prompt started events
      channel.bind(GameEvent.PROMPT_STARTED, (data: PromptStartedPayload) => {
        console.log('Prompt started - Round', data.roundNumber);
        refreshGameState();
      });

      // Listen for responses ready events
      channel.bind(GameEvent.RESPONSES_READY, (data: ResponsesReadyPayload) => {
        console.log('Responses ready:', data);
        refreshGameState();
      });

      // Listen for results ready events
      channel.bind(GameEvent.RESULTS_READY, (data: ResultsReadyPayload) => {
        console.log('Results ready:', data);
        refreshGameState();
      });

      // Listen for game ended events
      channel.bind(GameEvent.GAME_ENDED, (data: GameEndedPayload) => {
        console.log('Game ended:', data);
        setIsGameEnded(true);
        setGameEndedReason(data.reason);
        refreshGameState();
      });

      // Listen for player disconnected events
      channel.bind(GameEvent.PLAYER_DISCONNECTED, (data: PlayerDisconnectedPayload) => {
        console.log('Player disconnected:', data);
        
        // Show toast notification for disconnect
        if (data.playerId !== currentPlayerId) {
          let message = `${data.nickname} has disconnected`;
          
          if (data.wasHost && data.newHostNickname) {
            message += `. ${data.newHostNickname} is now the host.`;
            addToast(message, 'warning', 7000);
          } else {
            addToast(message, 'info', 5000);
          }
        }
        
        refreshGameState();
      });

      setConnectionStatus('connected');
    } catch (err) {
      console.error('Error setting up real-time connection:', err);
      setConnectionStatus('disconnected');
      attemptReconnect();
    }
  }, [gameCode, refreshGameState, attemptReconnect]);

  // Initialize connection on mount
  useEffect(() => {
    setupRealtimeConnection();

    // Handle page visibility changes
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Page is hidden - user might be leaving
        console.log('Page hidden - potential disconnect');
      } else {
        // Page is visible again - reset disconnect notification flag
        hasNotifiedDisconnectRef.current = false;
        // Refresh game state when returning
        if (connectionStatus === 'connected') {
          refreshGameState();
        }
      }
    };

    // Handle beforeunload (page close/refresh)
    const handleBeforeUnload = () => {
      // Notify server of disconnect when user closes/refreshes page
      if (currentPlayerId && !hasNotifiedDisconnectRef.current) {
        // Use sendBeacon for reliable delivery during page unload
        const data = JSON.stringify({ playerId: currentPlayerId });
        navigator.sendBeacon(`/api/game/${gameCode}/disconnect`, data);
        hasNotifiedDisconnectRef.current = true;
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    // Cleanup on unmount
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      
      // Notify disconnect on unmount
      notifyDisconnect();
      
      if (channelRef.current) {
        unsubscribeFromGame(gameCode);
        channelRef.current = null;
      }
      
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };
  }, [gameCode, setupRealtimeConnection, currentPlayerId, notifyDisconnect, connectionStatus, refreshGameState]);

  const value: GameContextValue = {
    gameSession,
    connectionStatus,
    error,
    isGameEnded,
    gameEndedReason,
    refreshGameState,
  };

  return (
    <GameContext.Provider value={value}>
      <ToastContainer messages={toasts} onDismiss={removeToast} />
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const context = useContext(GameContext);
  
  if (context === undefined) {
    throw new Error('useGame must be used within a GameProvider');
  }
  
  return context;
}
