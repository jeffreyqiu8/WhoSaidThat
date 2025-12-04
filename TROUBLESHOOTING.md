# Troubleshooting Guide

## Site Stopped Working After Less Than a Week?

Here are the most likely causes and how to fix them:

### 🔴 #1 Most Common: Pusher Free Tier Limits

**Symptoms:**
- Real-time updates stop working
- Players can't see each other join
- Game state doesn't sync between players

**Why it happens:**
- Pusher free tier: 100 concurrent connections, 200K messages/day
- Each player = 1 connection
- If connections aren't properly closed or you had many users, you hit the limit

**How to check:**
1. Go to https://dashboard.pusher.com/
2. Select your app
3. Check "Overview" for warnings
4. Check "Usage" tab for current metrics

**How to fix:**
- **Quick fix**: Wait 24 hours for daily quota to reset
- **Permanent fix**: Upgrade to paid plan ($49/month for 500 connections)
- **Alternative**: Switch to Ably (similar pricing)

---

### 🔴 #2 Upstash Redis Free Tier Limits

**Symptoms:**
- Can't create new games
- Games don't load
- "Internal Server Error" when creating/joining games

**Why it happens:**
- Free tier: 10K commands/day
- Each game operation = multiple Redis commands
- Active usage can exceed this quickly

**How to check:**
1. Go to https://console.upstash.com/
2. Select your database
3. Check "Metrics" tab for daily command count

**How to fix:**
- **Quick fix**: Wait 24 hours for daily quota to reset
- **Permanent fix**: Upgrade to pay-as-you-go plan (very affordable)
- **Optimization**: Reduce session TTL or implement cleanup

---

### 🟡 #3 Environment Variables Missing

**Symptoms:**
- Site loads but features don't work
- Console shows connection errors
- "Configuration error" messages

**Why it happens:**
- Variables not set for Production environment
- Credentials were rotated/regenerated
- Variables were accidentally deleted

**How to check:**
1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Verify these exist for **Production**:
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`
   - `PUSHER_APP_ID`
   - `PUSHER_SECRET`
   - `NEXT_PUBLIC_PUSHER_APP_KEY`
   - `NEXT_PUBLIC_PUSHER_CLUSTER`

**How to fix:**
1. Re-add any missing variables
2. Redeploy: Vercel Dashboard → Deployments → Redeploy

---

### 🟡 #4 Vercel Function Timeouts

**Symptoms:**
- Requests take forever then fail
- "Function execution timed out" errors
- Intermittent failures

**Why it happens:**
- Functions timeout after 10 seconds
- Redis or Pusher slow to respond
- Cold starts on free tier

**How to check:**
1. Go to Vercel Dashboard → Your Project → Logs
2. Filter by "Errors"
3. Look for "FUNCTION_INVOCATION_TIMEOUT"

**How to fix:**
- Check if Redis/Pusher are experiencing issues
- Increase timeout in `vercel.json` (requires paid plan for >10s)
- Optimize slow operations

---

## Quick Diagnostic

Run this command to test your deployment:

```bash
node scripts/diagnose-deployment.js https://your-app.vercel.app
```

Or manually test:

1. **Health check**: Visit `https://your-app.vercel.app/healthz`
   - Should return: `{"status":"ok"}`

2. **Create game**: Try creating a game from the homepage
   - Should generate a 4-letter code

3. **Browser console**: Open DevTools (F12) and check for errors

---

## Detailed Checklist

For a comprehensive checklist, see: [scripts/check-service-status.md](scripts/check-service-status.md)

---

## Service Status Pages

Check if services are experiencing outages:

- **Vercel**: https://www.vercel-status.com/
- **Pusher**: https://status.pusher.com/
- **Upstash**: https://status.upstash.com/

---

## Cost-Free Solutions

If you want to keep using free tiers:

### For Pusher Limits:
1. Implement connection cleanup (disconnect idle users after 5 minutes)
2. Reduce message frequency (batch updates)
3. Use Pusher's presence channels more efficiently

### For Redis Limits:
1. Reduce session TTL from 24 hours to 6 hours
2. Implement manual cleanup of completed games
3. Optimize Redis commands (use pipelines)

---

## When to Upgrade

Consider upgrading if:

- You have >50 concurrent users regularly
- You're running multiple games simultaneously
- You need 24/7 reliability
- Free tier limits are consistently hit

**Estimated costs for moderate usage:**
- Vercel: Free tier is usually sufficient
- Upstash: ~$5-10/month for pay-as-you-go
- Pusher: $49/month for 500 connections

---

## Still Having Issues?

1. Check Vercel function logs for specific errors
2. Test locally with production environment variables
3. Review recent code changes that might have introduced bugs
4. Check if the issue is browser-specific (try different browsers)

For more help, see [DEPLOYMENT.md](DEPLOYMENT.md) for full deployment guide.
