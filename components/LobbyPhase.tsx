'use client';

import React, { useState } from 'react';
import { useGame } from './GameContext';
import { Player } from '@/types/game';
import { apiClient, getErrorMessage } from '@/lib/api-client';
import { useToast } from '@/lib/use-toast';
import LoadingSpinner from './LoadingSpinner';

interface LobbyPhaseProps {
  gameCode: string;
  players: Map<string, Player>;
  hostId: string;
  currentPlayerId?: string;
}

export default function LobbyPhase({ gameCode, players, hostId, currentPlayerId }: LobbyPhaseProps) {
  const { refreshGameState } = useGame();
  const [isStarting, setIsStarting] = useState(false);
  const [isEndingGame, setIsEndingGame] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();

  const isHost = currentPlayerId === hostId;
  const playerCount = players.size;
  const minPlayers = 4;
  const canStartGame = isHost && playerCount >= minPlayers;

  const handleStartGame = async () => {
    if (!canStartGame) return;

    setIsStarting(true);
    setError(null);

    try {
      // For now, we'll use a default prompt
      // In task 14, this will be replaced with random prompt selection
      const defaultPrompt = "What's the most embarrassing thing that happened to you this week?";
      
      await apiClient.post(
        `/api/game/${gameCode}/start-round`,
        {
          hostId: currentPlayerId,
          prompt: defaultPrompt,
        },
        {},
        { maxRetries: 2, retryDelay: 1000 }
      );

      toast.success('Game started!');
      
      // Refresh game state to show the new phase
      await refreshGameState();
    } catch (err) {
      console.error('Error starting game:', err);
      const errorMessage = getErrorMessage(err);
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsStarting(false);
    }
  };

  const handleEndGame = async () => {
    if (!confirm('Are you sure you want to cancel this game? All players will be disconnected.')) {
      return;
    }

    setIsEndingGame(true);
    setError(null);

    try {
      await apiClient.post(
        `/api/game/${gameCode}/end`,
        {
          hostId: currentPlayerId,
        },
        {},
        { maxRetries: 1, retryDelay: 500 }
      );

      toast.info('Game ended');
      
      // Game ended successfully - the real-time event will trigger the game-over screen
    } catch (err) {
      console.error('Error ending game:', err);
      const errorMessage = getErrorMessage(err);
      setError(errorMessage);
      toast.error(errorMessage);
      setIsEndingGame(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-xl p-4 sm:p-6">
      {/* Lobby Header */}
      <div className="text-center mb-6 sm:mb-8">
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">Game Lobby</h2>
        <p className="text-sm sm:text-base text-gray-600">
          Waiting for players to join...
        </p>
        <p className="text-xs sm:text-sm text-gray-500 mt-2">
          {playerCount < minPlayers 
            ? `Need at least ${minPlayers} players to start (${playerCount}/${minPlayers})`
            : `${playerCount} players ready!`
          }
        </p>
      </div>

      {/* Players List */}
      <div className="mb-6 sm:mb-8">
        <h3 className="text-lg sm:text-xl font-semibold text-gray-800 mb-3 sm:mb-4">
          Players ({playerCount})
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
          {Array.from(players.values()).map((player) => (
            <div
              key={player.id}
              className={`p-3 sm:p-4 rounded-lg border-2 transition-all ${
                player.isConnected
                  ? 'border-green-500 bg-green-50'
                  : 'border-gray-300 bg-gray-100 opacity-75'
              } ${player.id === currentPlayerId ? 'ring-2 ring-purple-500' : ''}`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center space-x-2 min-w-0 flex-1">
                  <span className="text-xl sm:text-2xl flex-shrink-0">
                    {player.isHost ? '👑' : '🎮'}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className={`font-semibold text-sm sm:text-base truncate ${player.isConnected ? 'text-gray-800' : 'text-gray-500 line-through'}`}>
                      {player.nickname}
                      {player.id === currentPlayerId && ' (You)'}
                    </p>
                    <p className="text-xs text-gray-600">
                      {player.isHost ? 'Host' : 'Player'}
                      {!player.isConnected && ' - Disconnected'}
                    </p>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <span className={`text-xs font-medium ${
                    player.isConnected ? 'text-green-600' : 'text-red-500'
                  }`}>
                    {player.isConnected ? '🟢' : '🔴'}
                    <span className="hidden sm:inline ml-1">{player.isConnected ? 'Online' : 'Offline'}</span>
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Game Instructions */}
      <div className="bg-purple-50 border-2 border-purple-200 rounded-lg p-3 sm:p-4 mb-5 sm:mb-6">
        <h4 className="font-semibold text-sm sm:text-base text-purple-900 mb-2">How to Play:</h4>
        <ol className="text-xs sm:text-sm text-purple-800 space-y-1 list-decimal list-inside">
          <li>Everyone answers the same prompt anonymously</li>
          <li>Guess who wrote each response</li>
          <li>Wrong guesses = drinking penalties! 🍺</li>
          <li>Play multiple rounds and have fun!</li>
        </ol>
      </div>

      {/* Host Controls */}
      {isHost && (
        <div className="space-y-3 sm:space-y-4">
          {/* Start Game Button */}
          <div className="text-center">
            <button
              onClick={handleStartGame}
              disabled={!canStartGame || isStarting || isEndingGame}
              className={`px-6 sm:px-8 py-4 rounded-lg font-bold text-base sm:text-lg transition-all min-h-[44px] ${
                canStartGame && !isStarting && !isEndingGame
                  ? 'bg-purple-600 text-white hover:bg-purple-700 active:bg-purple-800 hover:scale-105 shadow-lg'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              {isStarting ? (
                <span className="flex items-center justify-center">
                  <LoadingSpinner size="md" className="mr-2 text-white" />
                  Starting Game...
                </span>
              ) : !canStartGame ? (
                `Need ${minPlayers - playerCount} More Player${minPlayers - playerCount !== 1 ? 's' : ''}`
              ) : (
                'Start Game! 🎮'
              )}
            </button>
            
            {error && (
              <p className="text-red-600 text-xs sm:text-sm mt-3">
                {error}
              </p>
            )}
          </div>

          {/* Cancel Game Button */}
          <div className="text-center">
            <button
              onClick={handleEndGame}
              disabled={isStarting || isEndingGame}
              className="bg-red-600 text-white px-5 sm:px-6 py-2 rounded-lg font-semibold hover:bg-red-700 active:bg-red-800 transition-all disabled:bg-gray-300 disabled:cursor-not-allowed text-sm min-h-[44px]"
            >
              {isEndingGame ? (
                <span className="flex items-center justify-center">
                  <LoadingSpinner size="md" className="mr-2 text-white" />
                  Canceling...
                </span>
              ) : (
                'Cancel Game'
              )}
            </button>
          </div>
        </div>
      )}

      {/* Waiting Message (Non-Host) */}
      {!isHost && (
        <div className="text-center">
          <div className="inline-flex items-center space-x-2 text-gray-600">
            <span className="animate-pulse text-xl sm:text-2xl">⏳</span>
            <p className="text-base sm:text-lg">
              Waiting for host to start the game...
            </p>
          </div>
        </div>
      )}

      {/* Share Game Code */}
      <div className="mt-5 sm:mt-6 pt-5 sm:pt-6 border-t-2 border-gray-200">
        <div className="text-center">
          <p className="text-xs sm:text-sm text-gray-600 mb-2">Share this code with friends:</p>
          <div className="inline-flex items-center space-x-2 sm:space-x-3 bg-purple-100 px-4 sm:px-6 py-2 sm:py-3 rounded-lg">
            <span className="text-2xl sm:text-3xl font-mono font-bold text-purple-700">
              {gameCode}
            </span>
            <button
              onClick={() => {
                navigator.clipboard.writeText(gameCode);
              }}
              className="text-purple-600 hover:text-purple-800 active:text-purple-900 transition-colors text-xl sm:text-2xl min-h-[44px] min-w-[44px] flex items-center justify-center"
              title="Copy game code"
            >
              📋
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
