/**
 * Health check endpoint for monitoring
 * Verifies Redis and Pusher connectivity
 */

import { NextResponse } from 'next/server';
import { getRedisClient } from '@/lib/redis';
import { getPusherServer } from '@/lib/pusher-server';

export async function GET() {
  const checks = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {
      redis: 'unknown',
      pusher: 'unknown',
    },
  };

  try {
    // Check Redis connectivity
    const redis = getRedisClient();
    await redis.ping();
    checks.services.redis = 'connected';
  } catch (error) {
    checks.services.redis = 'error';
    checks.status = 'degraded';
  }

  try {
    // Check Pusher configuration
    const pusher = getPusherServer();
    if (pusher) {
      checks.services.pusher = 'configured';
    }
  } catch (error) {
    checks.services.pusher = 'error';
    checks.status = 'degraded';
  }

  const statusCode = checks.status === 'healthy' ? 200 : 503;

  return NextResponse.json(checks, { status: statusCode });
}
