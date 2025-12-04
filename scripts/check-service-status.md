# Service Status Checklist

Use this checklist to diagnose why your Vercel deployment stopped working.

## 🔴 Critical Checks (Do These First)

### 1. Pusher Status
- [ ] Go to https://dashboard.pusher.com/
- [ ] Check your app's "Overview" tab
- [ ] Look for warnings about:
  - Connection limits exceeded
  - Message quota exceeded
  - Account suspended
  - Expired trial
- [ ] Check "Usage" tab for current metrics

**Common Issue**: Free tier only allows 100 concurrent connections. If exceeded, new connections fail.

### 2. Upstash Redis Status
- [ ] Go to https://console.upstash.com/
- [ ] Select your database
- [ ] Check "Metrics" tab for:
  - Daily command count (free tier: 10K/day)
  - Storage usage
  - Connection errors
- [ ] Verify database is "Active" (not paused/deleted)

**Common Issue**: Free tier has 10K commands/day. If exceeded, all Redis operations fail.

### 3. Vercel Environment Variables
- [ ] Go to Vercel Dashboard → Your Project → Settings → Environment Variables
- [ ] Verify ALL these variables are set for Production:
  - `UPSTASH_REDIS_REST_URL`
  - `UPSTASH_REDIS_REST_TOKEN`
  - `PUSHER_APP_ID`
  - `PUSHER_SECRET`
  - `NEXT_PUBLIC_PUSHER_APP_KEY`
  - `NEXT_PUBLIC_PUSHER_CLUSTER`
- [ ] Check if any credentials were recently rotated

**Common Issue**: Variables not set for Production environment, or credentials expired.

## 🟡 Secondary Checks

### 4. Vercel Function Logs
- [ ] Go to Vercel Dashboard → Your Project → Logs
- [ ] Filter by "Errors" or "Functions"
- [ ] Look for:
  - Timeout errors (>10 seconds)
  - Redis connection errors
  - Pusher authentication errors
  - 500 Internal Server Errors

### 5. Vercel Deployment Status
- [ ] Go to Vercel Dashboard → Your Project → Deployments
- [ ] Check if latest deployment is "Ready" (not "Error" or "Canceled")
- [ ] Verify the deployment is from the correct branch (main)
- [ ] Check build logs for any warnings

### 6. Browser Console (Client-Side)
- [ ] Open your deployed site
- [ ] Open browser DevTools (F12)
- [ ] Check Console tab for:
  - Pusher connection errors
  - WebSocket connection failures
  - API request failures (4xx/5xx errors)
- [ ] Check Network tab for failed requests

## 🟢 Quick Tests

### Test 1: Health Check
```bash
curl https://your-app.vercel.app/healthz
```
Expected: `{"status":"ok"}`

### Test 2: Create Game
```bash
curl -X POST https://your-app.vercel.app/api/game/create \
  -H "Content-Type: application/json" \
  -d '{"hostNickname":"Test"}'
```
Expected: JSON with `code` field

### Test 3: Manual Test
1. Visit your deployed URL
2. Click "Create Game"
3. Note any error messages
4. Check browser console for errors

## 📋 Common Solutions

### If Pusher Limits Exceeded:
1. Upgrade to paid plan ($49/month for 500 connections)
2. Or switch to Ably (similar pricing)
3. Or implement connection cleanup (disconnect idle users)

### If Redis Limits Exceeded:
1. Upgrade Upstash plan (pay-as-you-go)
2. Or reduce session TTL (currently 24 hours)
3. Or implement manual cleanup of old sessions

### If Environment Variables Missing:
1. Re-add all variables in Vercel Dashboard
2. Redeploy the application
3. Test again

### If Credentials Expired:
1. Generate new credentials in Pusher/Upstash
2. Update environment variables in Vercel
3. Redeploy

## 🆘 Still Not Working?

Run the diagnostic script:
```bash
chmod +x scripts/diagnose-deployment.sh
./scripts/diagnose-deployment.sh https://your-app.vercel.app
```

Or check specific service status pages:
- Vercel Status: https://www.vercel-status.com/
- Pusher Status: https://status.pusher.com/
- Upstash Status: https://status.upstash.com/
