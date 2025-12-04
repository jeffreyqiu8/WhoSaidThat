#!/usr/bin/env node
/**
 * Deployment Diagnostics Script
 * Tests the health of your deployed application
 * 
 * Usage: node scripts/diagnose-deployment.js https://your-app.vercel.app
 */

const https = require('https');
const http = require('http');

const DEPLOYMENT_URL = process.argv[2];

if (!DEPLOYMENT_URL) {
  console.error('❌ Error: Please provide your Vercel deployment URL');
  console.error('Usage: node scripts/diagnose-deployment.js https://your-app.vercel.app');
  process.exit(1);
}

console.log('🔍 Who Said That - Deployment Diagnostics');
console.log('==========================================');
console.log('');
console.log(`📍 Testing deployment: ${DEPLOYMENT_URL}`);
console.log('');

// Helper function to make HTTP requests
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const protocol = urlObj.protocol === 'https:' ? https : http;
    
    const reqOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: options.headers || {},
    };
    
    const req = protocol.request(reqOptions, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          body: data,
          headers: res.headers,
        });
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    if (options.body) {
      req.write(options.body);
    }
    
    req.end();
  });
}

// Test 1: Health endpoint
async function testHealth() {
  console.log('1️⃣  Testing health endpoint...');
  try {
    const response = await makeRequest(`${DEPLOYMENT_URL}/healthz`);
    if (response.statusCode === 200) {
      console.log(`   ✅ Health check passed (HTTP ${response.statusCode})`);
      return true;
    } else {
      console.log(`   ❌ Health check failed (HTTP ${response.statusCode})`);
      console.log(`   Response: ${response.body}`);
      return false;
    }
  } catch (error) {
    console.log(`   ❌ Health check error: ${error.message}`);
    return false;
  }
}

// Test 2: Create game endpoint
async function testCreateGame() {
  console.log('2️⃣  Testing game creation...');
  try {
    const response = await makeRequest(`${DEPLOYMENT_URL}/api/game/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ hostNickname: 'DiagnosticTest' }),
    });
    
    if (response.statusCode === 200) {
      console.log(`   ✅ Game creation successful (HTTP ${response.statusCode})`);
      try {
        const data = JSON.parse(response.body);
        console.log(`   📝 Game code: ${data.code}`);
        return data.code;
      } catch (e) {
        console.log(`   ⚠️  Could not parse response: ${response.body}`);
        return null;
      }
    } else {
      console.log(`   ❌ Game creation failed (HTTP ${response.statusCode})`);
      console.log(`   Response: ${response.body}`);
      return null;
    }
  } catch (error) {
    console.log(`   ❌ Game creation error: ${error.message}`);
    return null;
  }
}

// Test 3: Fetch game endpoint
async function testFetchGame(gameCode) {
  if (!gameCode) {
    console.log('3️⃣  Skipping game retrieval test (no game code)');
    return false;
  }
  
  console.log('3️⃣  Testing game retrieval...');
  try {
    const response = await makeRequest(`${DEPLOYMENT_URL}/api/game/${gameCode}`);
    if (response.statusCode === 200) {
      console.log(`   ✅ Game retrieval successful (HTTP ${response.statusCode})`);
      return true;
    } else {
      console.log(`   ❌ Game retrieval failed (HTTP ${response.statusCode})`);
      console.log(`   Response: ${response.body}`);
      return false;
    }
  } catch (error) {
    console.log(`   ❌ Game retrieval error: ${error.message}`);
    return false;
  }
}

// Run all tests
async function runDiagnostics() {
  const healthPassed = await testHealth();
  console.log('');
  
  const gameCode = await testCreateGame();
  console.log('');
  
  const fetchPassed = await testFetchGame(gameCode);
  console.log('');
  
  // Summary
  console.log('==========================================');
  console.log('📊 Diagnostic Summary');
  console.log('==========================================');
  console.log('');
  
  if (healthPassed && gameCode && fetchPassed) {
    console.log('✅ All tests passed! Your deployment appears healthy.');
    console.log('');
    console.log('If users are still experiencing issues, check:');
    console.log('  • Pusher Dashboard for connection/message limits');
    console.log('  • Upstash Console for Redis usage limits');
    console.log('  • Vercel Logs for runtime errors');
  } else {
    console.log('❌ Some tests failed. Common issues:');
    console.log('');
    console.log('  1. Missing environment variables in Vercel');
    console.log('     → Check: Vercel Dashboard → Settings → Environment Variables');
    console.log('');
    console.log('  2. Upstash Redis credentials expired/invalid');
    console.log('     → Check: https://console.upstash.com/');
    console.log('');
    console.log('  3. Pusher credentials expired/invalid or limits exceeded');
    console.log('     → Check: https://dashboard.pusher.com/');
    console.log('');
    console.log('  4. Function timeout or cold start issues');
    console.log('     → Check: Vercel Dashboard → Logs');
    console.log('');
    console.log('For detailed troubleshooting, see: scripts/check-service-status.md');
  }
  console.log('');
}

// Run diagnostics
runDiagnostics().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
