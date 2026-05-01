#!/bin/bash

# TON Wallet Balance Test Script
# Usage: ./TEST_WALLET_ENDPOINT.sh YOUR_API_KEY YOUR_RAILWAY_APP_URL

API_KEY="${1:-YOUR_API_KEY}"
APP_URL="${2:-https://your-railway-app.up.railway.app}"

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║         TON Wallet Balance Test                               ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
echo "API Key: ${API_KEY:0:10}..."
echo "App URL: $APP_URL"
echo ""

# Test 1: Check wallet balance
echo "1️⃣  Testing: GET /api/stars/wallet-balance"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
curl -s -H "X-API-Key: $API_KEY" \
  "$APP_URL/api/stars/wallet-balance" | jq '.'

echo ""
echo ""

# Test 2: Get user info (optional)
echo "2️⃣  Testing: POST /api/stars/user-info (optional)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Enter username to check (or press Enter to skip):"
read -r USERNAME

if [ -n "$USERNAME" ]; then
  curl -s -X POST \
    -H "X-API-Key: $API_KEY" \
    -H "Content-Type: application/json" \
    -d "{\"username\":\"$USERNAME\"}" \
    "$APP_URL/api/stars/user-info" | jq '.'
else
  echo "Skipped"
fi

echo ""
echo ""

# Test 3: Get pricing (optional)
echo "3️⃣  Testing: POST /api/stars/pricing (optional)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Enter amount to check pricing (or press Enter to skip):"
read -r AMOUNT

if [ -n "$AMOUNT" ]; then
  curl -s -X POST \
    -H "X-API-Key: $API_KEY" \
    -H "Content-Type: application/json" \
    -d "{\"amount\":$AMOUNT}" \
    "$APP_URL/api/stars/pricing" | jq '.'
else
  echo "Skipped"
fi

echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║                    Test Complete                              ║"
echo "╚════════════════════════════════════════════════════════════════╝"
