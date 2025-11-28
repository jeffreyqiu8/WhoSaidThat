'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();
  const [gameCode, setGameCode] = useState('');
  const [showJoinInput, setShowJoinInput] = useState(false);

  const handleJoinGame = () => {
    if (gameCode.trim()) {
      router.push(`/join/${gameCode.trim().toUpperCase()}`);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 sm:p-6 bg-gradient-to-br from-purple-50 to-blue-50">
      <div className="max-w-md w-full space-y-6 sm:space-y-8 text-center">
        <div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-3 sm:mb-4 text-gray-900 px-2">
            Who Said That?
          </h1>
          <p className="text-base sm:text-lg text-gray-600 px-2">
            A multiplayer drinking game where you guess who said what
          </p>
        </div>

        <div className="space-y-3 sm:space-y-4 pt-4 sm:pt-8">
          <Link
            href="/host"
            className="block w-full bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white font-semibold py-4 px-6 rounded-lg transition-colors duration-200 shadow-lg hover:shadow-xl min-h-[44px] text-base sm:text-lg"
          >
            Create Game
          </Link>

          {!showJoinInput ? (
            <button
              onClick={() => setShowJoinInput(true)}
              className="block w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold py-4 px-6 rounded-lg transition-colors duration-200 shadow-lg hover:shadow-xl min-h-[44px] text-base sm:text-lg"
            >
              Join Game
            </button>
          ) : (
            <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6 space-y-3 sm:space-y-4">
              <input
                type="text"
                value={gameCode}
                onChange={(e) => setGameCode(e.target.value.toUpperCase())}
                placeholder="Enter game code"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-center font-mono text-lg sm:text-xl min-h-[44px]"
                maxLength={6}
                autoFocus
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleJoinGame();
                  }
                }}
              />
              <div className="flex gap-2">
                <button
                  onClick={handleJoinGame}
                  disabled={!gameCode.trim()}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 sm:px-6 rounded-lg transition-colors duration-200 min-h-[44px]"
                >
                  Continue
                </button>
                <button
                  onClick={() => {
                    setShowJoinInput(false);
                    setGameCode('');
                  }}
                  className="px-4 sm:px-6 py-3 text-gray-600 hover:text-gray-900 active:text-black font-medium min-h-[44px] min-w-[44px]"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="pt-6 sm:pt-8 text-xs sm:text-sm text-gray-500">
          <p>4-8 players • Mobile friendly • Real-time</p>
        </div>
      </div>
    </main>
  );
}
