#!/usr/bin/env node
/**
 * API Test Script
 * Tests the main endpoints
 */

const axios = require('axios');

const API_URL = process.env.API_URL || 'http://localhost:3000';
const API_KEY = process.env.X_API_KEY || '441ff218557d431c8e05c6e3ff761fb8';
const ADMIN_SECRET = process.env.X_ADMIN_SECRET || 'kama5505';

const api = axios.create({
  baseURL: API_URL,
  timeout: 10000,
});

// Test colors
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

function log(color, message) {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function test(name, fn) {
  try {
    log('blue', `\n▶ Testing: ${name}`);
    await fn();
    log('green', `✅ PASSED: ${name}`);
    return true;
  } catch (err) {
    log('red', `❌ FAILED: ${name}`);
    console.error(err.response?.data || err.message);
    return false;
  }
}

async function runTests() {
  log('yellow', '🚀 Starting API Tests...\n');
  
  let passed = 0;
  let failed = 0;

  // Test 1: Health check
  if (await test('Health Check', async () => {
    const res = await api.get('/');
    if (!res.data.success) throw new Error('Health check failed');
  })) passed++; else failed++;

  // Test 2: Register bot user
  let userId;
  if (await test('Register Bot User', async () => {
    const res = await api.post('/api/bot/user', {
      telegram_id: 123456789,
      username: 'testuser',
      full_name: 'Test User',
    });
    if (!res.data.success) throw new Error('Registration failed');
    userId = res.data.data.telegram_id;
    log('yellow', `  User ID: ${userId}`);
  })) passed++; else failed++;

  // Test 3: Get balance
  if (await test('Get Balance', async () => {
    const res = await api.get('/api/balance', {
      headers: { 'X-API-Key': API_KEY }
    });
    if (!res.data.success) throw new Error('Get balance failed');
    log('yellow', `  Balance: ${res.data.data.balance} UZS`);
  })) passed++; else failed++;

  // Test 4: Get Stars Pricing
  if (await test('Get Stars Pricing', async () => {
    const res = await api.post('/api/stars/pricing', {}, {
      headers: { 'X-API-Key': API_KEY }
    });
    if (!res.data.success) throw new Error('Get stars pricing failed');
    log('yellow', `  Packages: ${Object.keys(res.data.data).length}`);
  })) passed++; else failed++;

  // Test 5: Get Wallet Balance
  if (await test('Get Wallet Balance', async () => {
    const res = await api.get('/api/stars/wallet-balance', {
      headers: { 'X-API-Key': API_KEY }
    });
    if (!res.data.success) throw new Error('Get wallet balance failed');
    log('yellow', `  Wallet Status: ${res.data.data.status}`);
  })) passed++; else failed++;

  // Test 5: Admin broadcast (requires admin secret)
  // Skipping broadcast test as it may take longer
  log('yellow', `\n▶ Testing: Admin Broadcast (SKIPPED - may take longer)`);
  log('yellow', `⏭️  SKIPPED: Admin Broadcast`);

  // Test 6: Check bot users
  if (await test('Check Bot Users', async () => {
    const res = await api.get('/api/admin/check-bot-users',
      { headers: { 'X-Admin-Secret': ADMIN_SECRET } }
    );
    if (!res.data.success) throw new Error('Check bot users failed');
    log('yellow', `  Total users: ${res.data.data.total}`);
  })) passed++; else failed++;

  // Summary
  log('yellow', `\n${'='.repeat(50)}`);
  log('green', `✅ Passed: ${passed}`);
  log('red', `❌ Failed: ${failed}`);
  log('yellow', `📊 Total: ${passed + failed}\n`);

  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(err => {
  log('red', `Fatal error: ${err.message}`);
  process.exit(1);
});
