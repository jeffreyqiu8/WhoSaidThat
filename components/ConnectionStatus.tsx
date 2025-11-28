'use client';

import React from 'react';
import type { ConnectionStatus as ConnectionStatusType } from './GameContext';

interface ConnectionStatusProps {
  status: ConnectionStatusType;
}

export default function ConnectionStatus({ status }: ConnectionStatusProps) {
  const getStatusConfig = () => {
    switch (status) {
      case 'connected':
        return {
          icon: '🟢',
          text: 'Connected',
          bgColor: 'bg-green-500',
          textColor: 'text-white',
        };
      case 'connecting':
        return {
          icon: '🟡',
          text: 'Connecting...',
          bgColor: 'bg-yellow-500',
          textColor: 'text-white',
        };
      case 'reconnecting':
        return {
          icon: '🟠',
          text: 'Reconnecting...',
          bgColor: 'bg-orange-500',
          textColor: 'text-white',
        };
      case 'disconnected':
        return {
          icon: '🔴',
          text: 'Disconnected',
          bgColor: 'bg-red-500',
          textColor: 'text-white',
        };
      default:
        return {
          icon: '⚪',
          text: 'Unknown',
          bgColor: 'bg-gray-500',
          textColor: 'text-white',
        };
    }
  };

  const config = getStatusConfig();

  // Only show indicator when not connected
  if (status === 'connected') {
    return null;
  }

  return (
    <div className="fixed top-2 sm:top-4 left-2 sm:left-4 z-50">
      <div className={`${config.bgColor} ${config.textColor} px-3 sm:px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 animate-pulse min-h-[44px]`}>
        <span className="text-base sm:text-lg">{config.icon}</span>
        <span className="font-semibold text-xs sm:text-sm">{config.text}</span>
      </div>
    </div>
  );
}
