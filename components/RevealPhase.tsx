'use client';

import React, { useState } from 'react';
import { GameSession } from '@/types/game';
import { apiClient, getErrorMessage } from '@/lib/api-client';
import { useToast } from '@/lib/use-toast';
import LoadingSpinner from './LoadingSpinner';

interface RevealPhaseProps {
  gameSession: GameSession;
  currentPlayerId: string;
  onRefresh: () => void;
}

export default function RevealPhase({ gameSession, currentPlayerId, onRefresh }: RevealPhaseProps) {
  const [isStartingRound, setIsStartingRound] = useState(false);
  const [isEndingGame, setIsEndingGame] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();

  const currentRound = gameSession.rounds[gameSession.currentRound];
  const isHost = gameSession.hostId === currentPlayerId;
  const results = currentRound?.results;

  if (!results) {
    return (
      <div className="bg-white rounded-lg shadow-xl p-6">
        <div className="text-center py-12">
          <p className="text-gray-600 text-lg">Loading results...</p>
        </div>
      </div>
    );
  }

  const handleNextRound = async () => {
    setIsStartingRound(true);
    setError(null);

    try {
      // Let the server select a random prompt
      await apiClient.post(
        `/api/game/${gameSession.code}/start-round`,
        {
          hostId: currentPlayerId,
          // No prompt provided - server will select random unused prompt
        },
        {},
        { maxRetries: 2, retryDelay: 1000 }
      );

      toast.success('Next round started!');
      
      // Refresh game state to show the new round
      await onRefresh();
    } catch (err) {
      console.error('Error starting next round:', err);
      const errorMessage = getErrorMessage(err);
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsStartingRound(false);
    }
  };

  const handleEndGame = async () => {
    if (!confirm('Are you sure you want to end the game? This cannot be undone.')) {
      return;
    }

    setIsEndingGame(true);
    setError(null);

    try {
      await apiClient.post(
        `/api/game/${gameSession.code}/end`,
        {
          hostId: currentPlayerId,
        },
        {},
        { maxRetries: 1, retryDelay: 500 }
      );

      toast.info('Game ended');
      
      // Game ended successfully - the real-time event will trigger the game-over screen
      // No need to refresh here as the event handler will update the UI
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
      {/* Header */}
      <div className="text-center mb-5 sm:mb-6">
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">
          Round {currentRound.roundNumber + 1} Results
        </h2>
        <p className="text-sm sm:text-base text-gray-600">
          Here's who said what!
        </p>
      </div>

      {/* Results Display */}
      <div className="space-y-4 sm:space-y-6 mb-6 sm:mb-8">
        {results.responses.map((result, index) => {
          const actualAuthor = result.actualAuthor;
          
          return (
            <div
              key={result.responseId}
              className="bg-gradient-to-r from-purple-50 to-blue-50 border-2 border-purple-200 rounded-lg p-4 sm:p-5"
            >
              {/* Response Text */}
              <div className="mb-3 sm:mb-4">
                <p className="text-xs sm:text-sm font-semibold text-purple-600 mb-2">
                  Response {index + 1}
                </p>
                <p className="text-sm sm:text-base md:text-lg text-gray-800 font-medium mb-3 break-words">
                  "{result.text}"
                </p>
                <div className="flex items-center space-x-2">
                  <span className="text-xl sm:text-2xl">✍️</span>
                  <p className="text-base sm:text-lg font-bold text-purple-700 truncate">
                    Written by: {actualAuthor.nickname}
                  </p>
                </div>
              </div>

              {/* Guesses */}
              <div className="bg-white rounded-lg p-3 sm:p-4 border border-purple-100">
                <p className="text-xs sm:text-sm font-semibold text-gray-700 mb-2 sm:mb-3">
                  Who guessed what:
                </p>
                <div className="space-y-2">
                  {Array.from(result.guessedBy.entries()).map(([guessingPlayerId, guessedPlayerId]) => {
                    const guessingPlayer = gameSession.players.get(guessingPlayerId);
                    const guessedPlayer = gameSession.players.get(guessedPlayerId);
                    const isCorrect = guessedPlayerId === actualAuthor.id;
                    
                    return (
                      <div
                        key={guessingPlayerId}
                        className={`flex items-center justify-between p-2 rounded gap-2 ${
                          isCorrect
                            ? 'bg-green-50 border border-green-200'
                            : 'bg-red-50 border border-red-200'
                        }`}
                      >
                        <span className="text-xs sm:text-sm text-gray-700 min-w-0 flex-1">
                          <span className="font-semibold">{guessingPlayer?.nickname}</span> guessed{' '}
                          <span className="font-semibold">{guessedPlayer?.nickname}</span>
                        </span>
                        <span className="text-base sm:text-lg flex-shrink-0">
                          {isCorrect ? '✅' : '❌'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Drinking Penalties */}
      <div className="bg-gradient-to-r from-orange-50 to-red-50 border-2 border-orange-200 rounded-lg p-4 sm:p-6 mb-5 sm:mb-6">
        <h3 className="text-xl sm:text-2xl font-bold text-gray-800 mb-3 sm:mb-4 text-center">
          🍺 Drinking Penalties 🍺
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
          {Array.from(results.penalties.entries())
            .sort((a, b) => b[1] - a[1]) // Sort by penalty count (highest first)
            .map(([playerId, penaltyCount]) => {
              const player = gameSession.players.get(playerId);
              if (!player) return null;
              
              return (
                <div
                  key={playerId}
                  className={`p-3 sm:p-4 rounded-lg border-2 ${
                    penaltyCount > 0
                      ? 'bg-red-100 border-red-300'
                      : 'bg-green-100 border-green-300'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-sm sm:text-base text-gray-800 truncate">
                        {player.nickname}
                        {player.id === currentPlayerId && ' (You)'}
                      </p>
                      <p className="text-xs sm:text-sm text-gray-600">
                        {penaltyCount === 0
                          ? 'Perfect score!'
                          : `${penaltyCount} wrong guess${penaltyCount !== 1 ? 'es' : ''}`
                        }
                      </p>
                    </div>
                    <div className="text-xl sm:text-2xl flex-shrink-0">
                      {penaltyCount > 0 ? (
                        <span>
                          {'🍺'.repeat(Math.min(penaltyCount, 5))}
                          {penaltyCount > 5 && ` ×${penaltyCount}`}
                        </span>
                      ) : (
                        <span>🎉</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
        </div>
      </div>

      {/* Host Controls */}
      {isHost && (
        <div className="space-y-3 sm:space-y-4">
          {/* Next Round Button */}
          <div className="text-center">
            <button
              onClick={handleNextRound}
              disabled={isStartingRound}
              className="bg-purple-600 text-white px-6 sm:px-8 py-4 rounded-lg font-bold text-base sm:text-lg hover:bg-purple-700 active:bg-purple-800 transition-all hover:scale-105 shadow-lg disabled:bg-gray-300 disabled:cursor-not-allowed disabled:hover:scale-100 min-h-[44px]"
            >
              {isStartingRound ? (
                <span className="flex items-center justify-center">
                  <LoadingSpinner size="md" className="mr-2 text-white" />
                  Starting Next Round...
                </span>
              ) : (
                'Start Next Round 🎮'
              )}
            </button>
            
            {error && (
              <p className="text-red-600 text-xs sm:text-sm mt-3">
                {error}
              </p>
            )}
          </div>

          {/* End Game Button */}
          <div className="text-center">
            <button
              onClick={handleEndGame}
              disabled={isStartingRound || isEndingGame}
              className="bg-red-600 text-white px-5 sm:px-6 py-3 rounded-lg font-semibold hover:bg-red-700 active:bg-red-800 transition-all disabled:bg-gray-300 disabled:cursor-not-allowed min-h-[44px]"
            >
              {isEndingGame ? (
                <span className="flex items-center justify-center">
                  <LoadingSpinner size="md" className="mr-2 text-white" />
                  Ending Game...
                </span>
              ) : (
                'End Game 🏁'
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
              Waiting for host to start the next round...
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
