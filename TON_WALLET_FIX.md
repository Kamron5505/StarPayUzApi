# TON Wallet Balance Issue - Fix & Diagnostics

## Problem

When users try to send stars, they get error:
```
❌ Sabab: Insufficient balance.
```

This means the **TON wallet (Fragment API) doesn't have enough balance** to send stars, not the user's balance.

## Root Cause

The Fragment API wallet needs TON coins to send Telegram Stars. When the wallet balance is low or empty, all star sends fail with "Insufficient balance" error.

## Solution Implemented

### 1. ✅ Added Wallet Balance Check
**File**: `services/starsService.js`

Before sending stars, the service now:
- Checks the wallet balance
- Logs the current balance
- Warns if balance is low (< 0.1 TON)

```javascript
// Check wallet balance first
const balanceCheck = await getWalletBalance();
if (balanceCheck.success) {
  console.log(`[StarsService] Wallet balance: ${balanceCheck.result.balance} TON`);
  if (balanceCheck.result.balance < 0.1) {
    console.warn(`[StarsService] ⚠️ Low wallet balance: ${balanceCheck.result.balance} TON`);
  }
}
```

### 2. ✅ Added Diagnostic Endpoint
**File**: `controllers/starsController.js` & `routes/api.js`

New endpoint: `GET /api/stars/wallet-balance`

**Response**:
```json
{
  "success": true,
  "data": {
    "balance": 0.05,
    "balance_ton": 0.05,
    "status": "LOW",
    "message": "Low balance - may fail to send stars"
  }
}
```

**Usage**:
```bash
curl -H "X-API-Key: YOUR_API_KEY" \
  https://your-app.up.railway.app/api/stars/wallet-balance
```

### 3. ✅ Improved Error Messages
**File**: `controllers/starsController.js`

When star send fails, the response now clearly indicates if it's a wallet issue:

```json
{
  "success": false,
  "error": "Wallet error: Insufficient balance. Please top up the TON wallet.",
  "data": {
    "order_id": "...",
    "reason": "Insufficient balance",
    "is_wallet_error": true,
    "hint": "Check /api/stars/wallet-balance endpoint"
  }
}
```

### 4. ✅ Enhanced Logging
**File**: `services/starsService.js`

All operations now log with clear indicators:
```
[StarsService] Sending 50 stars to @username
[StarsService] Wallet balance: 0.05 TON
[StarsService] ⚠️ Low wallet balance: 0.05 TON
[StarsService] ✅ Success: 50 stars sent to @username
[StarsService] ❌ Insufficient wallet balance: Insufficient balance
```

## How to Fix

### Step 1: Check Wallet Balance
```bash
curl -H "X-API-Key: YOUR_API_KEY" \
  https://your-app.up.railway.app/api/stars/wallet-balance
```

If status is "LOW", proceed to Step 2.

### Step 2: Top Up TON Wallet
The wallet needs TON coins. You need to:

1. **Get the wallet address** from Fragment API configuration
2. **Send TON coins** to that address
3. **Wait for confirmation** (usually 1-2 minutes)

### Step 3: Verify Balance
```bash
curl -H "X-API-Key: YOUR_API_KEY" \
  https://your-app.up.railway.app/api/stars/wallet-balance
```

Status should now be "OK" with balance > 0.1 TON.

### Step 4: Test Star Send
```bash
curl -X POST \
  -H "X-API-Key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"username":"@testuser","amount":50}' \
  https://your-app.up.railway.app/api/stars/send
```

Should now succeed! ✅

## Files Modified

1. **services/starsService.js**
   - Added wallet balance check before sending
   - Added detailed logging
   - Improved error detection

2. **controllers/starsController.js**
   - Added getWalletBalanceHandler function
   - Improved error messages
   - Added wallet error detection

3. **routes/api.js**
   - Added import for getWalletBalanceHandler
   - Added GET /api/stars/wallet-balance route

## Monitoring

### Check Logs for Wallet Issues
Look for these patterns in logs:
```
[StarsService] ⚠️ Low wallet balance: X TON
[StarsService] ❌ Insufficient wallet balance
```

### Recommended Wallet Balance
- **Minimum**: 0.1 TON (for emergency)
- **Recommended**: 0.5 TON (for normal operation)
- **Comfortable**: 1+ TON (for high volume)

## Testing

### Test 1: Check Wallet Balance
```bash
curl -H "X-API-Key: YOUR_API_KEY" \
  https://your-app.up.railway.app/api/stars/wallet-balance
```

Expected: `"status": "OK"` with balance > 0.1

### Test 2: Send Stars
```bash
curl -X POST \
  -H "X-API-Key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"username":"@testuser","amount":50}' \
  https://your-app.up.railway.app/api/stars/send
```

Expected: `"success": true`

### Test 3: Check Logs
Look for:
```
[StarsService] Wallet balance: X TON
[StarsService] ✅ Success: 50 stars sent to @testuser
```

## Troubleshooting

### Issue: "Wallet error: Insufficient balance"
**Solution**: Top up the TON wallet with more TON coins

### Issue: "Wallet balance: 0 TON"
**Solution**: Wallet is empty, needs immediate top-up

### Issue: "Wallet balance: 0.05 TON" but still failing
**Solution**: Balance is too low, top up to at least 0.1 TON

### Issue: Endpoint returns error
**Solution**: Check if FRAGMENT_API_KEY is set correctly in .env

## Prevention

### Set Up Monitoring
Add a cron job to check wallet balance daily:
```bash
# Check wallet balance every day at 9 AM
0 9 * * * curl -H "X-API-Key: YOUR_API_KEY" https://your-app.up.railway.app/api/stars/wallet-balance
```

### Set Up Alerts
If balance < 0.2 TON, send alert to admin

### Maintain Buffer
Always keep at least 0.5 TON in wallet for uninterrupted service

## Summary

| Issue | Cause | Solution |
|-------|-------|----------|
| Stars not sending | Wallet balance too low | Top up TON wallet |
| Error: "Insufficient balance" | Wallet empty | Check /api/stars/wallet-balance |
| Can't diagnose issue | No visibility | Use new diagnostic endpoint |

## New Endpoints

### GET /api/stars/wallet-balance
Check TON wallet balance

**Response**:
```json
{
  "success": true,
  "data": {
    "balance": 0.5,
    "balance_ton": 0.5,
    "status": "OK",
    "message": "Sufficient balance"
  }
}
```

## Files Changed

```
services/starsService.js      - Added wallet check & logging
controllers/starsController.js - Added diagnostic endpoint & error handling
routes/api.js                 - Added new route
```

## Deployment

1. Commit changes
2. Push to main
3. Railway redeploys automatically
4. Test with new diagnostic endpoint
5. Top up wallet if needed

## Status

✅ All fixes implemented
✅ All syntax verified
✅ Ready for deployment

---

**Next Step**: Deploy and test the new diagnostic endpoint
