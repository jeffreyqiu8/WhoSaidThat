'use client';

import React, { useState, useEffect } from 'react';
import { GameSession } from '@/types/game';
import { apiClient, getErrorMessage } from '@/lib/api-client';
import { useToast } from '@/lib/use-toast';
import LoadingSpinner from './LoadingSpinner';

interface PromptPhaseProps {
  gameSession: GameSession;
  currentPlayerId: string;
  onRefresh: () => void;
}

export default function PromptPhase({ gameSession, currentPlayerId, onRefresh }: PromptPhaseProps) {
  const [response, setResponse] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const toast = useToast();

  const currentRound = gameSession.rounds[gameSession.currentRound];
  const responseCount = currentRound?.responses?.size || 0;
  // Only count connected players for progress tracking
  const connectedPlayers = Array.from(gameSession.players.values()).filter(p => p.isConnected);
  const totalPlayers = connectedPlayers.length;

  // Check if current player has already submitted
  useEffect(() => {
    if (currentRound?.responses) {
      const playerResponse = Array.from(currentRound.responses.values()).find(
        r => r.playerId === currentPlayerId
      );
      setHasSubmitted(!!playerResponse);
    }
  }, [currentRound, currentPlayerId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!response.trim()) {
      setError('Please enter a response');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await apiClient.post(
        `/api/game/${gameSession.code}/response`,
        {
          playerId: currentPlayerId,
          response: response.trim(),
        },
        {},
        { maxRetries: 2, retryDelay: 1000 }
      );

      setHasSubmitted(true);
      setResponse('');
      toast.success('Response submitted successfully!');
      
      // Refresh game state to get updated response count
      onRefresh();
    } catch (err) {
      console.error('Error submitting response:', err);
      const errorMessage = getErrorMessage(err);
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-xl p-4 sm:p-6">
      {/* Prompt Display */}
      <div className="mb-5 sm:mb-6">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-3 sm:mb-4 text-center">
          Round {currentRound?.roundNumber || gameSession.currentRound + 1}
        </h2>
        <div className="bg-gradient-to-r from-purple-100 to-blue-100 rounded-lg p-4 sm:p-6 mb-4">
          <p className="text-base sm:text-lg md:text-xl font-semibold text-gray-800 text-center">
            {currentRound?.prompt || 'Loading prompt...'}
          </p>
        </div>
      </div>

      {/* Response Input or Waiting State */}
      {!hasSubmitted ? (
        <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
          <div>
            <label htmlFor="response" className="block text-sm font-medium text-gray-700 mb-2">
              Your Response
            </label>
            <textarea
              id="response"
              value={response}
              onChange={(e) => setResponse(e.target.value)}
              placeholder="Type your answer here..."
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none resize-none text-base"
              rows={4}
              maxLength={500}
              disabled={isSubmitting}
            />
            <p className="text-xs sm:text-sm text-gray-500 mt-1">
              {response.length}/500 characters
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-red-600 text-xs sm:text-sm">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting || !response.trim()}
            className="w-full bg-purple-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-purple-700 active:bg-purple-800 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed min-h-[44px]"
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center">
                <LoadingSpinner size="md" className="mr-3 text-white" />
                Submitting...
              </span>
            ) : (
              'Submit Response'
            )}
          </button>
        </form>
      ) : (
        <div className="text-center py-6 sm:py-8">
          <div className="text-5xl sm:text-6xl mb-4">✅</div>
          <h3 className="text-lg sm:text-xl font-bold text-gray-800 mb-2">Response Submitted!</h3>
          <p className="text-sm sm:text-base text-gray-600 mb-5 sm:mb-6">
            Waiting for other players to submit their responses...
          </p>
          
          {/* Waiting Indicator */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4">
            <div className="flex items-center justify-center space-x-2 mb-2">
              <div className="animate-pulse text-xl sm:text-2xl">⏳</div>
              <p className="text-base sm:text-lg font-semibold text-gray-800">
                {responseCount} / {totalPlayers} players submitted
              </p>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 sm:h-3 overflow-hidden">
              <div
                className="bg-purple-600 h-full transition-all duration-500 ease-out"
                style={{ width: `${(responseCount / totalPlayers) * 100}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Show waiting indicator even when not submitted */}
      {!hasSubmitted && responseCount > 0 && (
        <div className="mt-3 sm:mt-4 bg-gray-50 border border-gray-200 rounded-lg p-3">
          <p className="text-xs sm:text-sm text-gray-600 text-center">
            {responseCount} / {totalPlayers} players have submitted
          </p>
        </div>
      )}
    </div>
  );
}
