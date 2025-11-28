#!/bin/bash

# Deployment Verification Script
# Run this after deploying to Vercel to verify everything works

set -e

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if DEPLOYMENT_URL is provided
if [ -z "$1" ]; then
  echo -e "${RED}Error: Please provide your Vercel deployment URL${NC}"
  echo "Usage: ./scripts/verify-deployment.sh https://your-app.vercel.app"
  exit 1
fi

DEPLOYMENT_URL=$1

echo -e "${YELLOW}Starting deployment verification for: ${DEPLOYMENT_URL}${NC}\n"

# Test 1: Check if the site is accessible
echo -e "${YELLOW}Test 1: Checking site accessibility...${NC}"
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "${DEPLOYMENT_URL}")
if [ "$HTTP_STATUS" -eq 200 ]; then
  echo -e "${GREEN}✓ Site is accessible (HTTP ${HTTP_STATUS})${NC}\n"
else
  echo -e "${RED}✗ Site returned HTTP ${HTTP_STATUS}${NC}\n"
  exit 1
fi

# Test 2: Check if API route is accessible
echo -e "${YELLOW}Test 2: Checking API routes...${NC}"
API_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "${DEPLOYMENT_URL}/api/game/TEST123")
if [ "$API_STATUS" -eq 404 ] || [ "$API_STATUS" -eq 200 ]; then
  echo -e "${GREEN}✓ API routes are accessible${NC}\n"
else
  echo -e "${RED}✗ API routes returned unexpected status: ${API_STATUS}${NC}\n"
  exit 1
fi

# Test 3: Try creating a game
echo -e "${YELLOW}Test 3: Testing game creation...${NC}"
CREATE_RESPONSE=$(curl -s -X POST "${DEPLOYMENT_URL}/api/game/create" \
  -H "Content-Type: application/json" \
  -d '{"hostNickname":"TestHost"}')

if echo "$CREATE_RESPONSE" | grep -q "code"; then
  GAME_CODE=$(echo "$CREATE_RESPONSE" | grep -o '"code":"[^"]*"' | cut -d'"' -f4)
  echo -e "${GREEN}✓ Game creation successful (Code: ${GAME_CODE})${NC}\n"
else
  echo -e "${RED}✗ Game creation failed${NC}"
  echo "Response: $CREATE_RESPONSE\n"
  exit 1
fi

# Test 4: Try joining the game
echo -e "${YELLOW}Test 4: Testing game join...${NC}"
JOIN_RESPONSE=$(curl -s -X POST "${DEPLOYMENT_URL}/api/game/${GAME_CODE}/join" \
  -H "Content-Type: application/json" \
  -d '{"nickname":"TestPlayer"}')

if echo "$JOIN_RESPONSE" | grep -q "playerId"; then
  echo -e "${GREEN}✓ Game join successful${NC}\n"
else
  echo -e "${RED}✗ Game join failed${NC}"
  echo "Response: $JOIN_RESPONSE\n"
  exit 1
fi

# Test 5: Check environment variables are set
echo -e "${YELLOW}Test 5: Verifying environment configuration...${NC}"
echo -e "${YELLOW}Please manually verify in Vercel Dashboard:${NC}"
echo "  - UPSTASH_REDIS_REST_URL is set"
echo "  - UPSTASH_REDIS_REST_TOKEN is set"
echo "  - PUSHER_APP_ID is set"
echo "  - PUSHER_SECRET is set"
echo "  - NEXT_PUBLIC_PUSHER_APP_KEY is set"
echo "  - NEXT_PUBLIC_PUSHER_CLUSTER is set"
echo ""

# Summary
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}All automated tests passed!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${YELLOW}Manual verification steps:${NC}"
echo "1. Open ${DEPLOYMENT_URL} in a browser"
echo "2. Create a game and note the game code"
echo "3. Open the join URL in another browser/device"
echo "4. Complete a full game round"
echo "5. Verify real-time updates work correctly"
echo ""
echo -e "${GREEN}Deployment verification complete!${NC}"
