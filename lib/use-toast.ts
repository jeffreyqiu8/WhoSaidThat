/**
 * Custom hook for toast notifications
 * This provides a way to show toasts from any component
 */

import { useCallback } from 'react';
import { ToastMessage } from '@/components/Toast';

// Global toast state management
type ToastListener = (message: ToastMessage) => void;
const toastListeners: ToastListener[] = [];

export function subscribeToToasts(listener: ToastListener): () => void {
  toastListeners.push(listener);
  return () => {
    const index = toastListeners.indexOf(listener);
    if (index > -1) {
      toastListeners.splice(index, 1);
    }
  };
}

export function showToast(
  message: string,
  type: ToastMessage['type'] = 'info',
  duration?: number
) {
  const toast: ToastMessage = {
    id: `${Date.now()}-${Math.random()}`,
    message,
    type,
    duration,
  };
  
  toastListeners.forEach(listener => listener(toast));
}

/**
 * Hook to show toast notifications
 */
export function useToast() {
  const toast = useCallback((
    message: string,
    type: ToastMessage['type'] = 'info',
    duration?: number
  ) => {
    showToast(message, type, duration);
  }, []);
  
  const success = useCallback((message: string, duration?: number) => {
    showToast(message, 'success', duration);
  }, []);
  
  const error = useCallback((message: string, duration?: number) => {
    showToast(message, 'error', duration);
  }, []);
  
  const warning = useCallback((message: string, duration?: number) => {
    showToast(message, 'warning', duration);
  }, []);
  
  const info = useCallback((message: string, duration?: number) => {
    showToast(message, 'info', duration);
  }, []);
  
  return {
    toast,
    success,
    error,
    warning,
    info,
  };
}
