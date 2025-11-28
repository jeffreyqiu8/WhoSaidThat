# Vercel Deployment Guide

This guide walks you through deploying the Who Said That Game to Vercel.

## Prerequisites

1. A [Vercel account](https://vercel.com/signup)
2. An [Upstash Redis](https://upstash.com/) database
3. A [Pusher Channels](https://pusher.com/) account (or Ably as alternative)

## Step 1: Set Up Upstash Redis

1. Go to [Upstash Console](https://console.upstash.com/)
2. Create a new Redis database
3. Select a region close to your Vercel deployment region (recommended: `us-east-1`)
4. Copy the following credentials:
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`

## Step 2: Set Up Pusher Channels

1. Go to [Pusher Dashboard](https://dashboard.pusher.com/)
2. Create a new Channels app
3. Select a cluster close to your users
4. Copy the following credentials:
   - `PUSHER_APP_ID`
   - `PUSHER_SECRET`
   - `NEXT_PUBLIC_PUSHER_APP_KEY` (App Key)
   - `NEXT_PUBLIC_PUSHER_CLUSTER` (Cluster)

## Step 3: Deploy to Vercel

### Option A: Deploy via Vercel Dashboard

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "Add New Project"
3. Import your Git repository
4. Vercel will auto-detect Next.js configuration
5. Add environment variables (see Step 4)
6. Click "Deploy"

### Option B: Deploy via Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy
vercel
```

## Step 4: Configure Environment Variables

In the Vercel dashboard, go to your project settings and add the following environment variables:

### Production Environment Variables

| Variable Name | Value | Description |
|--------------|-------|-------------|
| `UPSTASH_REDIS_REST_URL` | `https://your-redis.upstash.io` | Upstash Redis REST URL |
| `UPSTASH_REDIS_REST_TOKEN` | `your-token` | Upstash Redis REST Token |
| `PUSHER_APP_ID` | `your-app-id` | Pusher App ID (server-side) |
| `PUSHER_SECRET` | `your-secret` | Pusher Secret (server-side) |
| `NEXT_PUBLIC_PUSHER_APP_KEY` | `your-key` | Pusher App Key (client-side) |
| `NEXT_PUBLIC_PUSHER_CLUSTER` | `us2` | Pusher Cluster (e.g., us2, eu) |

**Important Notes:**
- Variables prefixed with `NEXT_PUBLIC_` are exposed to the browser
- Server-side variables (`PUSHER_SECRET`, `UPSTASH_REDIS_REST_TOKEN`) remain private
- Set these for all environments: Production, Preview, and Development

## Step 5: Verify Deployment

After deployment completes:

1. Visit your deployment URL (e.g., `https://your-app.vercel.app`)
2. Test creating a game:
   - Click "Create Game"
   - Verify a game code is generated
   - Check that Redis is storing the session
3. Test joining a game:
   - Open the join URL in another browser/device
   - Enter a nickname and join
   - Verify real-time connection works
4. Test a complete game flow:
   - Start a round
   - Submit responses
   - Submit guesses
   - View results

## Troubleshooting

### Redis Connection Issues

If you see Redis connection errors:
- Verify `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` are correct
- Check that your Upstash database is active
- Ensure the region is accessible from Vercel

### Pusher Connection Issues

If real-time updates aren't working:
- Verify all Pusher environment variables are set correctly
- Check that `NEXT_PUBLIC_PUSHER_APP_KEY` and `NEXT_PUBLIC_PUSHER_CLUSTER` match your Pusher app
- Ensure your Pusher app is on a plan that supports the number of concurrent connections
- Check browser console for WebSocket connection errors

### Function Timeout Issues

If API routes are timing out:
- The `vercel.json` sets a 10-second timeout for API routes
- For longer operations, consider increasing `maxDuration` in `vercel.json`
- Check Vercel function logs for specific errors

### Build Failures

If the build fails:
- Check the build logs in Vercel dashboard
- Ensure all dependencies are in `package.json`
- Verify TypeScript compilation succeeds locally: `npm run build`
- Check for missing environment variables during build

## Monitoring and Logs

- **Function Logs**: View in Vercel Dashboard → Your Project → Logs
- **Redis Monitoring**: Check Upstash Console for connection stats
- **Pusher Monitoring**: Check Pusher Dashboard for connection metrics

## Performance Optimization

For production use, consider:

1. **Redis Connection Pooling**: Already configured via `@upstash/redis`
2. **Pusher Connection Limits**: Monitor concurrent connections in Pusher dashboard
3. **Vercel Analytics**: Enable in project settings for performance insights
4. **Edge Functions**: Consider using Vercel Edge Functions for lower latency

## Scaling Considerations

The application is designed to scale horizontally on Vercel:

- **Serverless Functions**: Auto-scale based on traffic
- **Redis**: Upstash handles scaling automatically
- **Pusher**: Scales with your plan (check concurrent connection limits)
- **Session Isolation**: Each game session is independent

## Security Checklist

Before going live:

- [ ] All environment variables are set correctly
- [ ] Server-side secrets are not exposed to client
- [ ] Rate limiting is enabled (configured in code)
- [ ] Input validation is working (nicknames, responses)
- [ ] CORS policies are appropriate
- [ ] Redis TTL is set (24-hour cleanup)

## Cost Estimation

Approximate costs for moderate usage:

- **Vercel**: Free tier supports hobby projects; Pro plan ~$20/month
- **Upstash Redis**: Free tier includes 10K commands/day; Pay-as-you-go beyond
- **Pusher**: Free tier supports 100 concurrent connections; Paid plans start at $49/month

## Alternative: Ably Instead of Pusher

If you prefer Ably over Pusher:

1. Create an [Ably account](https://ably.com/)
2. Get your API key
3. Update environment variables:
   - `NEXT_PUBLIC_ABLY_API_KEY`
4. Modify `lib/pusher-client.ts` and `lib/pusher-server.ts` to use Ably SDK

## Support

For issues specific to:
- **Vercel**: [Vercel Documentation](https://vercel.com/docs)
- **Upstash**: [Upstash Documentation](https://docs.upstash.com/)
- **Pusher**: [Pusher Documentation](https://pusher.com/docs)
