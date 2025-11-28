# Deployment Checklist

Use this checklist to ensure a smooth deployment to Vercel.

## Pre-Deployment

### 1. Code Preparation
- [ ] All tests pass locally (`npm test`)
- [ ] Build succeeds locally (`npm run build`)
- [ ] No TypeScript errors (`npm run lint`)
- [ ] All environment variables are documented in `.env.example`
- [ ] Sensitive data is not committed to repository
- [ ] `.gitignore` includes `.env.local` and other sensitive files

### 2. External Services Setup

#### Upstash Redis
- [ ] Created Upstash Redis database
- [ ] Selected appropriate region (recommend: us-east-1)
- [ ] Copied `UPSTASH_REDIS_REST_URL`
- [ ] Copied `UPSTASH_REDIS_REST_TOKEN`
- [ ] Verified connection works locally

#### Pusher Channels
- [ ] Created Pusher Channels app
- [ ] Selected appropriate cluster
- [ ] Copied `PUSHER_APP_ID`
- [ ] Copied `PUSHER_SECRET`
- [ ] Copied `NEXT_PUBLIC_PUSHER_APP_KEY`
- [ ] Copied `NEXT_PUBLIC_PUSHER_CLUSTER`
- [ ] Verified connection works locally
- [ ] Checked plan supports expected concurrent connections

### 3. Repository Setup
- [ ] Code pushed to GitHub/GitLab/Bitbucket
- [ ] Repository is accessible to Vercel
- [ ] Main/master branch is up to date
- [ ] No uncommitted changes

## Deployment

### 4. Vercel Project Setup
- [ ] Logged into Vercel dashboard
- [ ] Created new project or selected existing
- [ ] Connected to Git repository
- [ ] Selected correct branch for deployment
- [ ] Framework preset detected as "Next.js"

### 5. Environment Variables Configuration

Set these in Vercel Dashboard → Project Settings → Environment Variables:

**Server-side (Private)**
- [ ] `UPSTASH_REDIS_REST_URL` - Set for Production, Preview, Development
- [ ] `UPSTASH_REDIS_REST_TOKEN` - Set for Production, Preview, Development
- [ ] `PUSHER_APP_ID` - Set for Production, Preview, Development
- [ ] `PUSHER_SECRET` - Set for Production, Preview, Development

**Client-side (Public)**
- [ ] `NEXT_PUBLIC_PUSHER_APP_KEY` - Set for Production, Preview, Development
- [ ] `NEXT_PUBLIC_PUSHER_CLUSTER` - Set for Production, Preview, Development

### 6. Deploy
- [ ] Clicked "Deploy" button
- [ ] Waited for build to complete
- [ ] No build errors occurred
- [ ] Deployment succeeded

## Post-Deployment Verification

### 7. Automated Tests
- [ ] Site is accessible at deployment URL
- [ ] Health check endpoint works: `https://your-app.vercel.app/healthz`
- [ ] Run verification script: `./scripts/verify-deployment.sh https://your-app.vercel.app`

### 8. Manual Testing

**Basic Functionality**
- [ ] Landing page loads correctly
- [ ] "Create Game" button works
- [ ] Game code is generated and displayed
- [ ] Game code can be copied to clipboard

**Join Flow**
- [ ] Join page loads with game code
- [ ] Nickname input accepts valid nicknames
- [ ] Invalid nicknames are rejected with error message
- [ ] Duplicate nicknames are rejected
- [ ] Invalid game codes show error

**Game Flow**
- [ ] Players appear in lobby in real-time
- [ ] Host can start round
- [ ] Prompt displays to all players
- [ ] Response submission works
- [ ] Waiting indicator shows correct count
- [ ] Guessing phase displays shuffled responses
- [ ] Guess submission works
- [ ] Results display correctly
- [ ] Penalties are calculated correctly
- [ ] Next round works

**Real-time Features**
- [ ] Player joins are broadcast immediately
- [ ] Phase transitions happen for all players
- [ ] Disconnections are detected
- [ ] Host transfer works if host disconnects

**Mobile Testing**
- [ ] Test on mobile device (iOS/Android)
- [ ] Layout is responsive
- [ ] Touch targets are appropriately sized
- [ ] No horizontal scrolling
- [ ] Keyboard doesn't break layout

**Cross-Browser Testing**
- [ ] Chrome/Edge
- [ ] Safari
- [ ] Firefox
- [ ] Mobile browsers

### 9. Performance & Monitoring

**Vercel Dashboard**
- [ ] Check function execution logs
- [ ] Verify no errors in logs
- [ ] Check function execution times (should be < 5s)
- [ ] Monitor bandwidth usage

**Upstash Dashboard**
- [ ] Verify Redis commands are executing
- [ ] Check connection count
- [ ] Monitor storage usage
- [ ] Verify TTL cleanup is working

**Pusher Dashboard**
- [ ] Check concurrent connections
- [ ] Verify messages are being sent
- [ ] Monitor connection errors
- [ ] Check if within plan limits

### 10. Security Verification
- [ ] Server-side secrets not exposed in browser
- [ ] Rate limiting is working
- [ ] Input validation is working (XSS prevention)
- [ ] CORS policies are appropriate
- [ ] No sensitive data in client-side code

## Production Readiness

### 11. Documentation
- [ ] README.md is up to date
- [ ] DEPLOYMENT.md has correct instructions
- [ ] Environment variables are documented
- [ ] Known issues are documented

### 12. Monitoring Setup (Optional but Recommended)
- [ ] Set up Vercel Analytics
- [ ] Configure error tracking (e.g., Sentry)
- [ ] Set up uptime monitoring
- [ ] Configure alerts for errors

### 13. Backup & Recovery
- [ ] Understand Redis data persistence model
- [ ] Document recovery procedures
- [ ] Know how to rollback deployment
- [ ] Have access to all service dashboards

## Troubleshooting

If any checks fail, refer to:
- [DEPLOYMENT.md](./DEPLOYMENT.md) - Detailed deployment guide
- Vercel function logs
- Browser console errors
- Upstash Redis logs
- Pusher debug console

## Sign-off

- [ ] All critical checks passed
- [ ] Deployment verified by: ________________
- [ ] Date: ________________
- [ ] Production URL: ________________

---

**Notes:**
- Keep this checklist updated as the project evolves
- Document any issues encountered during deployment
- Share learnings with the team
