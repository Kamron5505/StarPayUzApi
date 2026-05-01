#!/bin/bash

# Quick Test - Tests critical endpoints only

API_URL="${1:-http://localhost:3000}"
ADMIN_SECRET="kama5505"
SERVICE_SECRET="starpay_tg_secret_2024"

echo "🧪 QUICK TEST"
echo "============================================"
echo "API URL: $API_URL"
echo ""

# Test 1: Health
echo "1️⃣  Health Check..."
curl -s "$API_URL/" | jq '.service' 2>/dev/null && echo "✅ Server running" || echo "❌ Server not responding"
echo ""

# Test 2: ElderPay Create
echo "2️⃣  ElderPay Create Order..."
RESPONSE=$(curl -s -X POST \
  -H "X-Service-Secret: $SERVICE_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"telegram_id":"123456789","amount":10000}' \
  "$API_URL/api/elderpay/create")

SUCCESS=$(echo "$RESPONSE" | jq -r '.success' 2>/dev/null)
ORDER_ID=$(echo "$RESPONSE" | jq -r '.data.order_id' 2>/dev/null)
CARD=$(echo "$RESPONSE" | jq -r '.data.card_number' 2>/dev/null)
OWNER=$(echo "$RESPONSE" | jq -r '.data.card_owner' 2>/dev/null)

if [ "$SUCCESS" = "true" ]; then
  echo "✅ Order Created"
  echo "   Order ID: $ORDER_ID"
  echo "   Card: $CARD"
  echo "   Owner: $OWNER"
else
  echo "❌ Order Failed"
  echo "$RESPONSE" | jq '.'
fi
echo ""

# Test 3: Check Order
echo "3️⃣  Check Order Status..."
if [ ! -z "$ORDER_ID" ] && [ "$ORDER_ID" != "null" ]; then
  CHECK=$(curl -s -H "X-Service-Secret: $SERVICE_SECRET" \
    "$API_URL/api/elderpay/check/$ORDER_ID")
  STATUS=$(echo "$CHECK" | jq -r '.data.status' 2>/dev/null)
  echo "✅ Status: $STATUS"
else
  echo "⚠️  No order to check"
fi
echo ""

# Test 4: Wallet Balance
echo "4️⃣  Wallet Balance..."
curl -s -H "X-API-Key: test" \
  "$API_URL/api/stars/wallet-balance" 2>/dev/null | jq '.data.status' 2>/dev/null && echo "✅ Wallet endpoint working" || echo "⚠️  Wallet check skipped"
echo ""

echo "============================================"
echo "✅ QUICK TEST COMPLETE"
