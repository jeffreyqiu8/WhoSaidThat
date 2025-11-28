'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient, getErrorMessage } from '@/lib/api-client';
import LoadingSpinner from '@/components/LoadingSpinner';

export default function HostPage() {
  const router = useRouter();
  const [nickname, setNickname] = useState('');
  const [gameCode, setGameCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleCreateGame = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const data = await apiClient.post<{ code: string; hostId: string; host: { id: string } }>(
        '/api/game/create',
        { hostNickname: nickname },
        {},
        { maxRetries: 2, retryDelay: 1000 }
      );

      setGameCode(data.code);
      
      // Store player ID in localStorage so the host is recognized in the game
      localStorage.setItem(`player_${data.code}`, data.hostId);
    } catch (err) {
      const errorMessage = getErrorMessage(err);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCode = async () => {
    if (gameCode) {
      try {
        await navigator.clipboard.writeText(gameCode);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error('Failed to copy:', err);
      }
    }
  };

  const handleStartGame = () => {
    if (gameCode) {
      router.push(`/game/${gameCode}`);
    }
  };

  if (gameCode) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-4 sm:p-6 bg-gradient-to-br from-purple-50 to-blue-50">
        <div className="max-w-md w-full space-y-6 sm:space-y-8 text-center">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold mb-3 sm:mb-4 text-gray-900">
              Game Created!
            </h1>
            <p className="text-gray-600 text-sm sm:text-base">
              Share this code with your friends
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-xl p-6 sm:p-8 space-y-5 sm:space-y-6">
            <div>
              <p className="text-xs sm:text-sm text-gray-500 mb-2">Game Code</p>
              <div className="text-5xl sm:text-6xl font-bold text-purple-600 tracking-wider mb-4">
                {gameCode}
              </div>
            </div>

            <button
              onClick={handleCopyCode}
              className="w-full bg-gray-100 hover:bg-gray-200 active:bg-gray-300 text-gray-800 font-semibold py-3 px-6 rounded-lg transition-colors duration-200 min-h-[44px]"
            >
              {copied ? '✓ Copied!' : 'Copy Code'}
            </button>

            <div className="pt-4 border-t border-gray-200">
              <p className="text-sm text-gray-600 mb-4">
                Waiting for players to join...
              </p>
              <button
                onClick={handleStartGame}
                className="w-full bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white font-semibold py-4 px-6 rounded-lg transition-colors duration-200 shadow-lg hover:shadow-xl min-h-[44px]"
              >
                Go to Game Lobby
              </button>
            </div>
          </div>

          <div className="text-xs sm:text-sm text-gray-500 px-2">
            <p className="break-all">Players can join at: yoursite.com/join/{gameCode}</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 sm:p-6 bg-gradient-to-br from-purple-50 to-blue-50">
      <div className="max-w-md w-full space-y-6 sm:space-y-8">
        <div className="text-center">
          <h1 className="text-3xl sm:text-4xl font-bold mb-3 sm:mb-4 text-gray-900">
            Create a Game
          </h1>
          <p className="text-gray-600 text-sm sm:text-base">
            Enter your nickname to get started
          </p>
        </div>

        <form onSubmit={handleCreateGame} className="space-y-5 sm:space-y-6">
          <div>
            <label
              htmlFor="nickname"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Your Nickname
            </label>
            <input
              type="text"
              id="nickname"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="Enter nickname (3-20 characters)"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all min-h-[44px] text-base"
              minLength={3}
              maxLength={20}
              required
              disabled={loading}
            />
            <p className="mt-2 text-xs sm:text-sm text-gray-500">
              Alphanumeric characters and spaces only
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || nickname.length < 3}
            className="w-full bg-purple-600 hover:bg-purple-700 active:bg-purple-800 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold py-4 px-6 rounded-lg transition-colors duration-200 shadow-lg hover:shadow-xl min-h-[44px]"
          >
            {loading ? (
              <span className="flex items-center justify-center">
                <LoadingSpinner size="md" className="mr-3 text-white" />
                Creating Game...
              </span>
            ) : (
              'Create Game'
            )}
          </button>
        </form>

        <div className="text-center">
          <a
            href="/"
            className="text-purple-600 hover:text-purple-700 active:text-purple-800 text-sm font-medium inline-block min-h-[44px] flex items-center justify-center"
          >
            ← Back to Home
          </a>
        </div>
      </div>
    </main>
  );
}
