'use client';

import React, { useEffect, useState } from 'react';

export interface ToastMessage {
  id: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  duration?: number;
}

interface ToastProps {
  message: ToastMessage;
  onDismiss: (id: string) => void;
}

function Toast({ message, onDismiss }: ToastProps) {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const duration = message.duration || 5000;
    const timer = setTimeout(() => {
      setIsExiting(true);
      setTimeout(() => onDismiss(message.id), 300);
    }, duration);

    return () => clearTimeout(timer);
  }, [message, onDismiss]);

  const getTypeStyles = () => {
    switch (message.type) {
      case 'success':
        return 'bg-green-500 text-white';
      case 'error':
        return 'bg-red-500 text-white';
      case 'warning':
        return 'bg-orange-500 text-white';
      case 'info':
      default:
        return 'bg-blue-500 text-white';
    }
  };

  const getIcon = () => {
    switch (message.type) {
      case 'success':
        return '✅';
      case 'error':
        return '❌';
      case 'warning':
        return '⚠️';
      case 'info':
      default:
        return 'ℹ️';
    }
  };

  return (
    <div
      className={`${getTypeStyles()} px-4 sm:px-6 py-3 sm:py-4 rounded-lg shadow-lg flex items-center gap-2 sm:gap-3 min-w-[280px] sm:min-w-[300px] max-w-[calc(100vw-2rem)] sm:max-w-md transition-all duration-300 ${
        isExiting ? 'opacity-0 translate-x-full' : 'opacity-100 translate-x-0'
      }`}
    >
      <span className="text-lg sm:text-xl flex-shrink-0">{getIcon()}</span>
      <p className="font-medium flex-1 text-sm sm:text-base break-words">{message.message}</p>
      <button
        onClick={() => {
          setIsExiting(true);
          setTimeout(() => onDismiss(message.id), 300);
        }}
        className="text-white hover:text-gray-200 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center flex-shrink-0"
      >
        ✕
      </button>
    </div>
  );
}

interface ToastContainerProps {
  messages: ToastMessage[];
  onDismiss: (id: string) => void;
}

export default function ToastContainer({ messages, onDismiss }: ToastContainerProps) {
  return (
    <div className="fixed top-2 sm:top-4 right-2 sm:right-4 z-50 flex flex-col gap-2 sm:gap-3">
      {messages.map((message) => (
        <Toast key={message.id} message={message} onDismiss={onDismiss} />
      ))}
    </div>
  );
}
