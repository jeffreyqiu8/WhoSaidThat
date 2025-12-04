#!/bin/bash
# Deployment Diagnostics Script
# Run this to check the health of your deployed application

echo "🔍 Who Said That - Deployment Diagnostics"
echo "=========================================="
echo ""

# Check if we have a deployment URL
if [ -z "$1" ]; then
  echo "❌ Error: Please provide your Vercel deployment URL"
  echo "Usage: ./scripts/diagnose-deployment.sh https://your-app.vercel.app"
  exit 1
fi

DEPLOYMENT_URL=$1

echo "📍 Testing deployment: $DEPLOYMENT_URL"
echo ""

# Test 1: Health endpoint
echo "1️⃣  Testing health endpoint..."
HEALTH_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "$DEPLOYMENT_URL/healthz")
if [ "$HEALTH_RESPONSE" = "200" ]; then
  echo "   ✅ Health check passed (HTTP $HEALTH_RESPONSE)"
else
  echo "   ❌ Health check failed (HTTP $HEALTH_RESPONSE)"
fi
echo ""

# Test 2: Create game endpoint
echo "2️⃣  Testing game creation..."
CREATE_RESPONSE=$(curl -s -X POST "$DEPLOYMENT_URL/api/game/create" \
  -H "Content-Type: application/json" \
  -d '{"hostNickname":"DiagnosticTest"}' \
  -w "\nHTTP_CODE:%{http_code}")

HTTP_CODE=$(echo "$CREATE_RESPONSE" | grep "HTTP_CODE" | cut -d: -f2)
RESPONSE_BODY=$(echo "$CREATE_RESPONSE" | grep -v "HTTP_CODE")

if [ "$HTTP_CODE" = "200" ]; then
  echo "   ✅ Game creation successful (HTTP $HTTP_CODE)"
  GAME_CODE=$(echo "$RESPONSE_BODY" | grep -o '"code":"[^"]*"' | cut -d'"' -f4)
  echo "   📝 Game code: $GAME_CODE"
else
  echo "   ❌ Game creation failed (HTTP $HTTP_CODE)"
  echo "   Response: $RESPONSE_BODY"
fi
echo ""

# Test 3: Fetch game endpoint (if we have a code)
if [ ! -z "$GAME_CODE" ]; then
  echo "3️⃣  Testing game retrieval..."
  FETCH_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "$DEPLOYMENT_URL/api/game/$GAME_CODE")
  if [ "$FETCH_RESPONSE" = "200" ]; then
    echo "   ✅ Game retrieval successful (HTTP $FETCH_RESPONSE)"
  else
    echo "   ❌ Game retrieval failed (HTTP $FETCH_RESPONSE)"
  fi
else
  echo "3️⃣  Skipping game retrieval test (no game code)"
fi
echo ""

# Summary
echo "=========================================="
echo "📊 Diagnostic Summary"
echo "=========================================="
echo ""

if [ "$HEALTH_RESPONSE" = "200" ] && [ "$HTTP_CODE" = "200" ]; then
  echo "✅ All tests passed! Your deployment appears healthy."
  echo ""
  echo "If users are still experiencing issues, check:"
  echo "  • Pusher Dashboard for connection/message limits"
  echo "  • Upstash Console for Redis usage limits"
  echo "  • Vercel Logs for runtime errors"
else
  echo "❌ Some tests failed. Common issues:"
  echo ""
  echo "  1. Missing environment variables in Vercel"
  echo "     → Check: Vercel Dashboard → Settings → Environment Variables"
  echo ""
  echo "  2. Upstash Redis credentials expired/invalid"
  echo "     → Check: https://console.upstash.com/"
  echo ""
  echo "  3. Pusher credentials expired/invalid or limits exceeded"
  echo "     → Check: https://dashboard.pusher.com/"
  echo ""
  echo "  4. Function timeout or cold start issues"
  echo "     → Check: Vercel Dashboard → Logs"
fi
echo ""
