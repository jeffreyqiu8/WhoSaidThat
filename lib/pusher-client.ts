/**
 * Client-side Pusher configuration
 * Handles real-time event subscriptions for game clients
 */

import Pusher from 'pusher-js';
import { GameEvent } from './pusher-server';

// Client-side Pusher instance
let pusherInstance: Pusher | null = null;

/**
 * Get or create Pusher client instance
 * Lazy initialization for client-side usage
 */
export function getPusherClient(): Pusher {
  if (!pusherInstance) {
    pusherInstance = new Pusher(process.env.NEXT_PUBLIC_PUSHER_APP_KEY || '', {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || '',
    });
  }
  
  return pusherInstance;
}

/**
 * Get channel name for a game session
 * Convention: game-${code}
 */
export function getGameChannel(code: string): string {
  return `game-${code}`;
}

/**
 * Subscribe to a game channel
 * @param code - Game code
 * @returns Channel instance
 */
export function subscribeToGame(code: string) {
  const pusher = getPusherClient();
  const channelName = getGameChannel(code);
  return pusher.subscribe(channelName);
}

/**
 * Unsubscribe from a game channel
 * @param code - Game code
 */
export function unsubscribeFromGame(code: string): void {
  const pusher = getPusherClient();
  const channelName = getGameChannel(code);
  pusher.unsubscribe(channelName);
}

/**
 * Disconnect Pusher client
 */
export function disconnectPusher(): void {
  if (pusherInstance) {
    pusherInstance.disconnect();
    pusherInstance = null;
  }
}

// Re-export GameEvent enum for convenience
export { GameEvent };
