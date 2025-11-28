# Quick Start Guide

Get the Who Said That Game running locally or deployed to Vercel in minutes.

## Local Development (5 minutes)

### 1. Clone and Install
```bash
git clone <your-repo-url>
cd who-said-that-game
npm install
```

### 2. Set Up Services

**Upstash Redis** (2 minutes)
1. Go to [console.upstash.com](https://console.upstash.com/)
2. Create account (free tier available)
3. Click "Create Database"
4. Copy the REST URL and Token

**Pusher Channels** (2 minutes)
1. Go to [pusher.com](https://pusher.com/)
2. Create account (free tier: 100 connections)
3. Create a new Channels app
4. Copy App ID, Key, Secret, and Cluster

### 3. Configure Environment
```bash
cp .env.example .env.local
```

Edit `.env.local` with your credentials:
```env
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_token_here
PUSHER_APP_ID=your_app_id
PUSHER_SECRET=your_secret
NEXT_PUBLIC_PUSHER_APP_KEY=your_key
NEXT_PUBLIC_PUSHER_CLUSTER=us2
```

### 4. Run
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### 5. Test
Open two browser windows:
1. Window 1: Create a game
2. Window 2: Join with the game code
3. Play a round!

## Deploy to Vercel (10 minutes)

### Option 1: One-Click Deploy
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/yourusername/who-said-that-game)

Then add environment variables in Vercel dashboard.

### Option 2: Manual Deploy

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Initial commit"
   git push origin main
   ```

2. **Import to Vercel**
   - Go to [vercel.com/dashboard](https://vercel.com/dashboard)
   - Click "Add New Project"
   - Import your repository
   - Vercel auto-detects Next.js

3. **Add Environment Variables**
   In Vercel project settings, add all 6 variables from `.env.example`

4. **Deploy**
   Click "Deploy" and wait ~2 minutes

5. **Verify**
   ```bash
   ./scripts/verify-deployment.sh https://your-app.vercel.app
   ```

## Troubleshooting

### "Redis connection failed"
- Check `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`
- Verify Redis database is active in Upstash console

### "Real-time updates not working"
- Check all Pusher variables are set correctly
- Verify `NEXT_PUBLIC_PUSHER_CLUSTER` matches your Pusher app
- Check browser console for WebSocket errors

### "Build failed on Vercel"
- Check build logs in Vercel dashboard
- Ensure all dependencies are in `package.json`
- Try building locally: `npm run build`

### "Tests failing"
```bash
npm test
```
Check test output for specific failures.

## Next Steps

- Read [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment guide
- Check [DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md) before going live
- Review [README.md](./README.md) for project structure

## Support

- **Vercel Issues**: [vercel.com/docs](https://vercel.com/docs)
- **Upstash Issues**: [docs.upstash.com](https://docs.upstash.com/)
- **Pusher Issues**: [pusher.com/docs](https://pusher.com/docs)

## Cost Estimate

Free tier is sufficient for development and small-scale use:
- **Vercel**: Free (hobby projects)
- **Upstash**: Free (10K commands/day)
- **Pusher**: Free (100 concurrent connections)

For production with 100+ concurrent users, expect ~$50-100/month.
