# Testing Guide - ElderPay Integration

## Prerequisites

1. **Get your Railway URL**
   - Go to Railway dashboard
   - Find your app URL (e.g., `https://your-app.up.railway.app`)

2. **Have curl installed**
   - Windows: Use Git Bash or WSL
   - Mac/Linux: Already installed

## Quick Test (5 minutes)

### Step 1: Test Health Check
```bash
curl https://your-app.up.railway.app/
```

Expected response:
```json
{
  "success": true,
  "service": "Telegram Stars API",
  "version": "1.0.0"
}
```

### Step 2: Test ElderPay Create Order
```bash
curl -X POST \
  -H "X-Service-Secret: starpay_tg_secret_2024" \
  -H "Content-Type: application/json" \
  -d '{"telegram_id":"123456789","amount":10000}' \
  https://your-app.up.railway.app/api/elderpay/create
```

Expected response:
```json
{
  "success": true,
  "data": {
    "order_id": "ORDER_ID",
    "amount": 10000,
    "card_number": "9860 1801 0171 2578",
    "card_owner": "Isxakova A.",
    "expires_in": 300
  }
}
```

**Key things to check:**
- ✅ `success: true`
- ✅ `card_number` is present
- ✅ `card_owner` is present
- ✅ `order_id` is not null

### Step 3: Check Order Status
```bash
curl -H "X-Service-Secret: starpay_tg_secret_2024" \
  https://your-app.up.railway.app/api/elderpay/check/ORDER_ID
```

Replace `ORDER_ID` with the order_id from Step 2.

Expected response:
```json
{
  "success": true,
  "data": {
    "order_id": "ORDER_ID",
    "status": "pending",
    "amount": 10000
  }
}
```

## Full Test Suite

### Create User
```bash
curl -X POST \
  -H "Authorization: Bearer kama5505" \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser_'$(date +%s)'","initial_balance":1000}' \
  https://your-app.up.railway.app/api/admin/users
```

Save the `api_key` from response.

### Get Balance
```bash
curl -H "X-API-Key: YOUR_API_KEY" \
  https://your-app.up.railway.app/api/balance
```

### Get Wallet Balance
```bash
curl -H "X-API-Key: YOUR_API_KEY" \
  https://your-app.up.railway.app/api/stars/wallet-balance
```

### Get Stars Pricing
```bash
curl -X POST \
  -H "X-API-Key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"amount":100}' \
  https://your-app.up.railway.app/api/stars/pricing
```

### Check Bot Users
```bash
curl -H "Authorization: Bearer kama5505" \
  https://your-app.up.railway.app/api/admin/check-bot-users
```

## Checking Logs

### In Railway Dashboard
1. Go to your app
2. Click "Logs" tab
3. Look for `[ElderPay]` entries

Expected logs:
```
[ElderPay] Creating order: telegram_id=123456789, amount=10000
[ElderPay] Config: SHOP_ID=304216, API_URL=https://...
[ElderPay] Card: 9860 1801 0171 2578, Owner: Isxakova A.
[ElderPay] ✅ Success response: {...}
[ElderPay] ✅ Order created: ORDER_ID, amount=10000
[ElderPay] ✅ Returning card: 9860 1801 0171 2578, owner: Isxakova A.
```

## Troubleshooting

### Issue: "success": false
**Check**:
1. Is the API URL correct?
2. Are the headers correct?
3. Check Railway logs for error details

### Issue: Card not in response
**Check**:
1. Look for `[ElderPay] ✅ Returning card` in logs
2. If not there, check for `[ElderPay] ❌ Error response`
3. Verify ELDERPAY_SHOP_ID and ELDERPAY_SHOP_KEY in Railway env vars

### Issue: Order creation fails
**Check**:
1. Is amount between 1000 and 10000000?
2. Check Railway logs for ElderPay API errors
3. Verify ElderPay service is online

## Test Checklist

- [ ] Health check returns success
- [ ] ElderPay create returns order_id
- [ ] Card number is in response
- [ ] Card owner is in response
- [ ] Order check returns status
- [ ] Logs show [ElderPay] entries
- [ ] No errors in logs
- [ ] SHOP_ID is 304216
- [ ] SHOP_KEY is 5QLEKZ625U

## Expected Results

### Success
```
✅ Server running
✅ Order Created
   Order ID: 12345
   Card: 9860 1801 0171 2578
   Owner: Isxakova A.
✅ Status: pending
✅ Wallet endpoint working
```

### Failure
```
❌ Server not responding
❌ Order Failed
❌ No order to check
```

## Next Steps

1. **If all tests pass**: ✅ Ready for production
2. **If tests fail**: Check logs and troubleshoot
3. **If card not showing**: Check ElderPay logs in Railway

---

**Testing URL**: Replace `your-app` with your actual Railway app name
