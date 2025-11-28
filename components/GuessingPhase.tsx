'use client';

import React, { useState, useEffect } from 'react';
import { GameSession } from '@/types/game';
import { apiClient, getErrorMessage } from '@/lib/api-client';
import { useToast } from '@/lib/use-toast';
import LoadingSpinner from './LoadingSpinner';

interface GuessingPhaseProps {
  gameSession: GameSession;
  currentPlayerId: string;
  onRefresh: () => void;
}

export default function GuessingPhase({ gameSession, currentPlayerId, onRefresh }: GuessingPhaseProps) {
  const [guesses, setGuesses] = useState<Map<string, string>>(new Map());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const toast = useToast();

  const currentRound = gameSession.rounds[gameSession.currentRound];
  const responses = currentRound?.responses ? Array.from(currentRound.responses.entries()) : [];
  const players = Array.from(gameSession.players.values());
  const guessCount = currentRound?.guesses?.size || 0;
  // Only count connected players for progress tracking
  const connectedPlayers = Array.from(gameSession.players.values()).filter(p => p.isConnected);
  const totalPlayers = connectedPlayers.length;

  // Check if current player has already submitted guesses
  useEffect(() => {
    if (currentRound?.guesses) {
      const playerGuesses = currentRound.guesses.get(currentPlayerId);
      setHasSubmitted(!!playerGuesses);
    }
  }, [currentRound, currentPlayerId]);

  const handleGuessChange = (responseId: string, playerId: string) => {
    setGuesses(prev => {
      const newGuesses = new Map(prev);
      newGuesses.set(responseId, playerId);
      return newGuesses;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate that all responses have guesses
    if (guesses.size !== responses.length) {
      setError('Please make a guess for all responses');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const guessesObject = Object.fromEntries(guesses);
      
      await apiClient.post(
        `/api/game/${gameSession.code}/guess`,
        {
          playerId: currentPlayerId,
          guesses: guessesObject,
        },
        {},
        { maxRetries: 2, retryDelay: 1000 }
      );

      setHasSubmitted(true);
      toast.success('Guesses submitted successfully!');
      
      // Refresh game state to get updated guess count
      onRefresh();
    } catch (err) {
      console.error('Error submitting guesses:', err);
      const errorMessage = getErrorMessage(err);
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-xl p-4 sm:p-6">
      <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-3 sm:mb-4 text-center">
        Who Said What?
      </h2>
      
      <p className="text-sm sm:text-base text-gray-600 text-center mb-5 sm:mb-6">
        Match each response to the player you think wrote it
      </p>

      {!hasSubmitted ? (
        <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
          {/* Display shuffled responses with dropdowns */}
          <div className="space-y-3 sm:space-y-4">
            {responses.map(([responseId, response], index) => (
              <div
                key={responseId}
                className="bg-gray-50 border-2 border-gray-200 rounded-lg p-3 sm:p-4"
              >
                <div className="mb-3">
                  <p className="text-xs sm:text-sm font-semibold text-gray-500 mb-2">
                    Response {index + 1}
                  </p>
                  <p className="text-gray-800 text-sm sm:text-base md:text-lg break-words">
                    "{response.text}"
                  </p>
                </div>
                
                <div>
                  <label
                    htmlFor={`guess-${responseId}`}
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Who said this?
                  </label>
                  <select
                    id={`guess-${responseId}`}
                    value={guesses.get(responseId) || ''}
                    onChange={(e) => handleGuessChange(responseId, e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none text-base min-h-[44px]"
                    required
                  >
                    <option value="">Select a player...</option>
                    {players.map((player) => (
                      <option key={player.id} value={player.id}>
                        {player.nickname}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ))}
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-red-600 text-xs sm:text-sm">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting || guesses.size !== responses.length}
            className="w-full bg-purple-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-purple-700 active:bg-purple-800 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed text-base sm:text-lg min-h-[44px]"
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center">
                <LoadingSpinner size="md" className="mr-3 text-white" />
                Submitting...
              </span>
            ) : (
              'Submit Guesses'
            )}
          </button>
          
          {guesses.size > 0 && guesses.size < responses.length && (
            <p className="text-xs sm:text-sm text-gray-500 text-center">
              {guesses.size} / {responses.length} guesses made
            </p>
          )}
        </form>
      ) : (
        <div className="text-center py-6 sm:py-8">
          <div className="text-5xl sm:text-6xl mb-4">✅</div>
          <h3 className="text-lg sm:text-xl font-bold text-gray-800 mb-2">Guesses Submitted!</h3>
          <p className="text-sm sm:text-base text-gray-600 mb-5 sm:mb-6">
            Waiting for other players to submit their guesses...
          </p>
          
          {/* Waiting Indicator */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4">
            <div className="flex items-center justify-center space-x-2 mb-2">
              <div className="animate-pulse text-xl sm:text-2xl">⏳</div>
              <p className="text-base sm:text-lg font-semibold text-gray-800">
                {guessCount} / {totalPlayers} players submitted
              </p>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 sm:h-3 overflow-hidden">
              <div
                className="bg-purple-600 h-full transition-all duration-500 ease-out"
                style={{ width: `${(guessCount / totalPlayers) * 100}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Show waiting indicator even when not submitted */}
      {!hasSubmitted && guessCount > 0 && (
        <div className="mt-3 sm:mt-4 bg-gray-50 border border-gray-200 rounded-lg p-3">
          <p className="text-xs sm:text-sm text-gray-600 text-center">
            {guessCount} / {totalPlayers} players have submitted
          </p>
        </div>
      )}
    </div>
  );
}
