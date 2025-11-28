'use client';

import { useState, FormEvent } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { validateNickname } from '@/types/game';
import { apiClient, getErrorMessage } from '@/lib/api-client';
import LoadingSpinner from '@/components/LoadingSpinner';

export default function JoinPage() {
  const router = useRouter();
  const params = useParams();
  const code = params.code as string;
  
  const [nickname, setNickname] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    // Client-side validation
    if (!validateNickname(nickname)) {
      if (!nickname || nickname.trim().length === 0) {
        setError('Nickname cannot be empty');
      } else if (nickname.trim().length < 3) {
        setError('Nickname must be at least 3 characters');
      } else if (nickname.trim().length > 20) {
        setError('Nickname must be 20 characters or less');
      } else if (!/^[a-zA-Z0-9 ]+$/.test(nickname)) {
        setError('Nickname can only contain letters, numbers, and spaces');
      } else {
        setError('Invalid nickname');
      }
      return;
    }

    setIsLoading(true);

    try {
      const data = await apiClient.post<{ playerId: string }>(
        `/api/game/${code}/join`,
        { nickname: nickname.trim() },
        {},
        { maxRetries: 2, retryDelay: 1000 }
      );

      // Store player ID in localStorage for reconnection
      localStorage.setItem(`player_${code}`, data.playerId);

      // Redirect to game page
      router.push(`/game/${code}`);
    } catch (err) {
      console.error('Error joining game:', err);
      const errorMessage = getErrorMessage(err);
      setError(errorMessage);
      setIsLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 sm:p-6 bg-gradient-to-br from-purple-50 to-blue-50">
      <div className="max-w-md w-full space-y-6 sm:space-y-8">
        <div className="text-center">
          <h1 className="text-3xl sm:text-4xl font-bold mb-2 text-gray-900">
            Join Game
          </h1>
          <p className="text-base sm:text-lg text-gray-600">
            Game Code: <span className="font-mono font-bold text-purple-600">{code}</span>
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-lg p-6 sm:p-8 space-y-5 sm:space-y-6">
          <div>
            <label htmlFor="nickname" className="block text-sm font-medium text-gray-700 mb-2">
              Enter your nickname
            </label>
            <input
              type="text"
              id="nickname"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="Your nickname"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all min-h-[44px] text-base"
              disabled={isLoading}
              autoFocus
              maxLength={20}
            />
            <p className="mt-2 text-xs sm:text-sm text-gray-500">
              3-20 characters, letters, numbers, and spaces only
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading || !nickname}
            className="w-full bg-purple-600 hover:bg-purple-700 active:bg-purple-800 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200 shadow-lg hover:shadow-xl min-h-[44px]"
          >
            {isLoading ? (
              <span className="flex items-center justify-center">
                <LoadingSpinner size="md" className="mr-3 text-white" />
                Joining...
              </span>
            ) : (
              'Join Game'
            )}
          </button>
        </form>

        <div className="text-center">
          <button
            onClick={() => router.push('/')}
            className="text-gray-600 hover:text-gray-900 active:text-black underline min-h-[44px] inline-flex items-center justify-center px-4"
          >
            Back to home
          </button>
        </div>
      </div>
    </main>
  );
}
