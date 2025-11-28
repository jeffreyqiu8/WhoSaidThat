'use client';

import React from 'react';
import { GameSession } from '@/types/game';

interface GameOverProps {
  gameSession: GameSession;
  reason: string;
}

export default function GameOver({ gameSession, reason }: GameOverProps) {
  // Calculate total penalties for each player across all rounds
  const playerStats = Array.from(gameSession.players.values()).map(player => {
    let totalPenalties = 0;
    
    for (const round of gameSession.rounds) {
      if (round.results) {
        totalPenalties += round.results.penalties.get(player.id) || 0;
      }
    }
    
    return {
      nickname: player.nickname,
      totalPenalties,
      isHost: player.isHost,
    };
  });

  // Sort by penalties (ascending - fewer penalties is better)
  playerStats.sort((a, b) => a.totalPenalties - b.totalPenalties);

  const winner = playerStats[0];
  const totalRounds = gameSession.rounds.length;

  return (
    <div className="bg-white rounded-lg shadow-xl p-4 sm:p-6">
      {/* Header */}
      <div className="text-center mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-800 mb-2">
          🏁 Game Over! 🏁
        </h1>
        <p className="text-sm sm:text-base md:text-lg text-gray-600">
          {reason}
        </p>
        <p className="text-xs sm:text-sm text-gray-500 mt-2">
          Total Rounds Played: {totalRounds}
        </p>
      </div>

      {/* Winner Announcement */}
      {winner && (
        <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border-4 border-yellow-400 rounded-lg p-4 sm:p-6 mb-6 sm:mb-8">
          <div className="text-center">
            <div className="text-5xl sm:text-6xl mb-3">🏆</div>
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">
              {winner.nickname} Wins!
            </h2>
            <p className="text-sm sm:text-base md:text-lg text-gray-600">
              {winner.totalPenalties === 0 
                ? 'Perfect score - no wrong guesses!' 
                : `Only ${winner.totalPenalties} wrong guess${winner.totalPenalties !== 1 ? 'es' : ''}!`
              }
            </p>
          </div>
        </div>
      )}

      {/* Final Standings */}
      <div className="mb-6 sm:mb-8">
        <h3 className="text-xl sm:text-2xl font-bold text-gray-800 mb-3 sm:mb-4 text-center">
          Final Standings
        </h3>
        <div className="space-y-2 sm:space-y-3">
          {playerStats.map((player, index) => (
            <div
              key={player.nickname}
              className={`p-3 sm:p-4 rounded-lg border-2 ${
                index === 0
                  ? 'bg-yellow-50 border-yellow-400'
                  : index === 1
                  ? 'bg-gray-50 border-gray-400'
                  : index === 2
                  ? 'bg-orange-50 border-orange-400'
                  : 'bg-white border-gray-300'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center space-x-2 sm:space-x-3 min-w-0 flex-1">
                  <span className="text-lg sm:text-xl md:text-2xl font-bold text-gray-600 w-6 sm:w-8 flex-shrink-0">
                    #{index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-sm sm:text-base md:text-lg text-gray-800 truncate">
                      {player.nickname}
                      {player.isHost && ' 👑'}
                    </p>
                    <p className="text-xs sm:text-sm text-gray-600">
                      {player.totalPenalties} wrong guess{player.totalPenalties !== 1 ? 'es' : ''}
                    </p>
                  </div>
                </div>
                <div className="text-2xl sm:text-3xl flex-shrink-0">
                  {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : ''}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Drinking Summary */}
      <div className="bg-gradient-to-r from-red-50 to-orange-50 border-2 border-red-200 rounded-lg p-4 sm:p-6 mb-6 sm:mb-8">
        <h3 className="text-xl sm:text-2xl font-bold text-gray-800 mb-3 sm:mb-4 text-center">
          🍺 Total Drinks 🍺
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
          {playerStats.map(player => (
            <div
              key={player.nickname}
              className="bg-white rounded-lg p-3 sm:p-4 border-2 border-red-200"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="font-semibold text-sm sm:text-base text-gray-800 truncate flex-1 min-w-0">
                  {player.nickname}
                </p>
                <div className="text-xl sm:text-2xl flex-shrink-0">
                  {player.totalPenalties > 0 ? (
                    <span>
                      {'🍺'.repeat(Math.min(player.totalPenalties, 5))}
                      {player.totalPenalties > 5 && ` ×${player.totalPenalties}`}
                    </span>
                  ) : (
                    <span>✨</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="text-center space-y-3">
        <button
          onClick={() => window.location.href = '/'}
          className="bg-purple-600 text-white px-6 sm:px-8 py-4 rounded-lg font-bold text-base sm:text-lg hover:bg-purple-700 active:bg-purple-800 transition-all hover:scale-105 shadow-lg min-h-[44px]"
        >
          Play Again 🎮
        </button>
        <p className="text-gray-500 text-xs sm:text-sm">
          Thanks for playing Who Said That!
        </p>
      </div>
    </div>
  );
}
