'use client';

import React, { useEffect, useState } from 'react';
import { useGame } from './GameContext';
import ConnectionStatus from '@/components/ConnectionStatus';
import LobbyPhase from '@/components/LobbyPhase';
import PromptPhase from '@/components/PromptPhase';
import GuessingPhase from '@/components/GuessingPhase';
import RevealPhase from '@/components/RevealPhase';
import GameOver from '@/components/GameOver';

export default function GameBoard() {
  const { gameSession, connectionStatus, error, isGameEnded, gameEndedReason, refreshGameState } = useGame();
  const [currentPlayerId, setCurrentPlayerId] = useState<string | null>(null);

  // Retrieve current player ID from localStorage
  useEffect(() => {
    if (gameSession) {
      const playerId = localStorage.getItem(`player_${gameSession.code}`);
      setCurrentPlayerId(playerId);
    }
  }, [gameSession]);

  // Show error state
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl p-6 sm:p-8 max-w-md w-full text-center">
          <div className="text-red-500 text-5xl sm:text-6xl mb-4">⚠️</div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-800 mb-4">Error</h1>
          <p className="text-sm sm:text-base text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => window.location.href = '/'}
            className="bg-purple-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-purple-700 active:bg-purple-800 transition-colors min-h-[44px]"
          >
            Return to Home
          </button>
        </div>
      </div>
    );
  }

  // Show loading state
  if (!gameSession) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl p-6 sm:p-8 max-w-md w-full text-center">
          <div className="animate-spin text-5xl sm:text-6xl mb-4">⏳</div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-800 mb-4">Loading Game...</h1>
          <p className="text-sm sm:text-base text-gray-600">Connecting to game session</p>
        </div>
      </div>
    );
  }

  // Show game over screen if game has ended
  if (isGameEnded && gameSession) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-600 to-blue-600 p-3 sm:p-4">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="bg-white rounded-lg shadow-xl p-4 sm:p-6 mb-3 sm:mb-4">
            <div className="flex justify-between items-center">
              <div className="flex-1 min-w-0">
                <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-800 truncate">Who Said That?</h1>
                <p className="text-sm sm:text-base text-gray-600 mt-1">
                  Game Code: <span className="font-mono font-bold text-purple-600">{gameSession.code}</span>
                </p>
              </div>
            </div>
          </div>

          {/* Game Over Screen */}
          <GameOver 
            gameSession={gameSession} 
            reason={gameEndedReason || 'Game ended'} 
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 to-blue-600 p-3 sm:p-4">
      {/* Connection Status Indicator */}
      <ConnectionStatus status={connectionStatus} />

      {/* Game Board Container */}
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-xl p-4 sm:p-6 mb-3 sm:mb-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0">
            <div className="flex-1 min-w-0">
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-800 truncate">Who Said That?</h1>
              <p className="text-sm sm:text-base text-gray-600 mt-1">
                Game Code: <span className="font-mono font-bold text-purple-600">{gameSession.code}</span>
              </p>
            </div>
            <div className="text-left sm:text-right">
              <p className="text-xs sm:text-sm text-gray-600">Round {gameSession.currentRound}</p>
              <p className="text-xs sm:text-sm text-gray-600 capitalize">Phase: {gameSession.phase}</p>
            </div>
          </div>
        </div>

        {/* Players List */}
        <div className="bg-white rounded-lg shadow-xl p-4 sm:p-6 mb-3 sm:mb-4">
          <h2 className="text-lg sm:text-xl font-bold text-gray-800 mb-3 sm:mb-4">Players ({gameSession.players.size})</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3">
            {Array.from(gameSession.players.values()).map((player) => (
              <div
                key={player.id}
                className={`p-2 sm:p-3 rounded-lg border-2 ${
                  player.isConnected
                    ? 'border-green-500 bg-green-50'
                    : 'border-gray-300 bg-gray-50'
                }`}
              >
                <p className="font-semibold text-sm sm:text-base text-gray-800 truncate">
                  {player.nickname}
                  {player.isHost && ' 👑'}
                </p>
                <p className="text-xs text-gray-600">
                  {player.isConnected ? '🟢 Online' : '🔴 Offline'}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Game Content Area */}
        {gameSession.phase === 'lobby' && (
          <LobbyPhase
            gameCode={gameSession.code}
            players={gameSession.players}
            hostId={gameSession.hostId}
            currentPlayerId={currentPlayerId || undefined}
          />
        )}

        {(gameSession.phase === 'prompt' || gameSession.phase === 'responding') && currentPlayerId && (
          <PromptPhase
            gameSession={gameSession}
            currentPlayerId={currentPlayerId}
            onRefresh={refreshGameState}
          />
        )}

        {gameSession.phase === 'guessing' && currentPlayerId && (
          <GuessingPhase
            gameSession={gameSession}
            currentPlayerId={currentPlayerId}
            onRefresh={refreshGameState}
          />
        )}

        {gameSession.phase === 'reveal' && currentPlayerId && (
          <RevealPhase
            gameSession={gameSession}
            currentPlayerId={currentPlayerId}
            onRefresh={refreshGameState}
          />
        )}
      </div>
    </div>
  );
}
