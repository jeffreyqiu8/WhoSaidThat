'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { GameProvider } from '@/components/GameContext';
import GameBoard from '@/components/GameBoard';

export default function GamePage() {
  const params = useParams();
  const code = params.code as string;
  const [currentPlayerId, setCurrentPlayerId] = useState<string | undefined>(undefined);

  // Retrieve current player ID from localStorage
  useEffect(() => {
    const playerId = localStorage.getItem(`player_${code}`);
    setCurrentPlayerId(playerId || undefined);
  }, [code]);

  return (
    <GameProvider gameCode={code} currentPlayerId={currentPlayerId}>
      <GameBoard />
    </GameProvider>
  );
}
