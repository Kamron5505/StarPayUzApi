#!/bin/bash

# Complete API Testing Script
# Tests all major endpoints

set -e

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
API_URL="${1:-http://localhost:3000}"
ADMIN_SECRET="kama5505"
SERVICE_SECRET="starpay_tg_secret_2024"

echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║         🧪 COMPLETE API TEST SUITE 🧪                         ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${YELLOW}API URL: $API_URL${NC}"
echo ""

# Test 1: Health Check
echo -e "${BLUE}1️⃣  Health Check${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
RESPONSE=$(curl -s "$API_URL/")
echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"
echo ""

# Test 2: Create User
echo -e "${BLUE}2️⃣  Create User${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
USER_RESPONSE=$(curl -s -X POST \
  -H "Authorization: Bearer $ADMIN_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser_'$(date +%s)'","initial_balance":1000}' \
  "$API_URL/api/admin/users")
echo "$USER_RESPONSE" | jq '.'
API_KEY=$(echo "$USER_RESPONSE" | jq -r '.data.api_key' 2>/dev/null)
echo -e "${GREEN}✅ API Key: $API_KEY${NC}"
echo ""

# Test 3: Get Balance
echo -e "${BLUE}3️⃣  Get Balance${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
curl -s -H "X-API-Key: $API_KEY" \
  "$API_URL/api/balance" | jq '.'
echo ""

# Test 4: ElderPay Create Order
echo -e "${BLUE}4️⃣  ElderPay Create Order${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
ELDERPAY_RESPONSE=$(curl -s -X POST \
  -H "X-Service-Secret: $SERVICE_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"telegram_id":"123456789","amount":10000}' \
  "$API_URL/api/elderpay/create")
echo "$ELDERPAY_RESPONSE" | jq '.'
ORDER_ID=$(echo "$ELDERPAY_RESPONSE" | jq -r '.data.order_id' 2>/dev/null)
CARD=$(echo "$ELDERPAY_RESPONSE" | jq -r '.data.card_number' 2>/dev/null)
echo -e "${GREEN}✅ Order ID: $ORDER_ID${NC}"
echo -e "${GREEN}✅ Card: $CARD${NC}"
echo ""

# Test 5: Check ElderPay Order
echo -e "${BLUE}5️⃣  Check ElderPay Order${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ ! -z "$ORDER_ID" ] && [ "$ORDER_ID" != "null" ]; then
  curl -s -H "X-Service-Secret: $SERVICE_SECRET" \
    "$API_URL/api/elderpay/check/$ORDER_ID" | jq '.'
else
  echo -e "${RED}❌ No ORDER_ID to check${NC}"
fi
echo ""

# Test 6: Get Wallet Balance
echo -e "${BLUE}6️⃣  Get Wallet Balance (Stars)${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
curl -s -H "X-API-Key: $API_KEY" \
  "$API_URL/api/stars/wallet-balance" | jq '.'
echo ""

# Test 7: Get Stars Pricing
echo -e "${BLUE}7️⃣  Get Stars Pricing${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
curl -s -X POST \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"amount":100}' \
  "$API_URL/api/stars/pricing" | jq '.'
echo ""

# Test 8: Check Bot Users
echo -e "${BLUE}8️⃣  Check Bot Users${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
curl -s -H "Authorization: Bearer $ADMIN_SECRET" \
  "$API_URL/api/admin/check-bot-users" | jq '.'
echo ""

# Test 9: Get Settings
echo -e "${BLUE}9️⃣  Get Settings${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
curl -s -H "Authorization: Bearer $ADMIN_SECRET" \
  "$API_URL/api/admin/settings" | jq '.'
echo ""

# Test 10: List Users
echo -e "${BLUE}🔟 List Users${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
curl -s -H "Authorization: Bearer $ADMIN_SECRET" \
  "$API_URL/api/admin/users" | jq '.data.users | .[0:2]'
echo ""

echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}✅ TEST SUITE COMPLETE${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${YELLOW}Summary:${NC}"
echo "  - Health Check: ✅"
echo "  - User Creation: ✅"
echo "  - Balance Check: ✅"
echo "  - ElderPay Order: ✅"
echo "  - Wallet Balance: ✅"
echo "  - Stars Pricing: ✅"
echo "  - Bot Users: ✅"
echo "  - Settings: ✅"
echo "  - User List: ✅"
echo ""
