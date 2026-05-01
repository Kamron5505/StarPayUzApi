# Deploy and Test TON Wallet Fix

## Step 1: Commit Changes

### In Submodule (star_payuz_bot copy)
```bash
cd "star_payuz_bot copy"
git add .
git commit -m "Fix: Add TON wallet balance diagnostics

- Add wallet balance check before sending stars
- Add GET /api/stars/wallet-balance diagnostic endpoint
- Improve error messages for wallet issues
- Add detailed logging for wallet operations"
git push
```

### In Parent Repo
```bash
cd ..
git add "star_payuz_bot copy"
git commit -m "Update: TON wallet balance diagnostics"
git push
```

## Step 2: Wait for Railway Deployment

After pushing:
1. Go to Railway dashboard
2. Check the deployment status
3. Wait for "Deployment successful" message
4. Usually takes 1-2 minutes

## Step 3: Get Your API Key

You need your API key to test. Get it from:
1. Create a user via `/api/users` endpoint
2. Or use an existing user's API key

## Step 4: Test Wallet Balance Endpoint

### Command
```bash
curl -H "X-API-Key: YOUR_API_KEY" \
  https://your-railway-app.up.railway.app/api/stars/wallet-balance
```

### Replace:
- `YOUR_API_KEY` - Your actual API key
- `your-railway-app` - Your Railway app name

### Expected Response (if wallet has balance)
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

### Expected Response (if wallet is low)
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

## Step 5: Check Logs

Go to Railway dashboard and check logs for:
```
[StarsService] Wallet balance: X TON
```

This confirms the endpoint is working.

## Step 6: If Wallet is Low

If balance < 0.1 TON:
1. Top up the TON wallet with more TON coins
2. Wait 1-2 minutes for confirmation
3. Test again

## Step 7: Test Star Send

Once wallet has sufficient balance:

```bash
curl -X POST \
  -H "X-API-Key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"username":"@testuser","amount":50}' \
  https://your-railway-app.up.railway.app/api/stars/send
```

### Expected Response (success)
```json
{
  "success": true,
  "message": "Successfully sent 50 stars to @testuser.",
  "data": {
    "order_id": "...",
    "external_id": "...",
    "username": "@testuser",
    "amount": 50,
    "balance_remaining": 950,
    "transaction_id": "..."
  }
}
```

### Expected Response (wallet error)
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

## Step 8: Check Logs for Success

Look for:
```
[StarsService] Sending 50 stars to @testuser
[StarsService] Wallet balance: 0.5 TON
[StarsService] ✅ Success: 50 stars sent to @testuser
```

## Troubleshooting

### Issue: 404 Not Found
**Cause**: Endpoint not deployed yet
**Solution**: Wait 2-3 minutes and try again

### Issue: 401 Unauthorized
**Cause**: Invalid API key
**Solution**: Check your API key is correct

### Issue: "Wallet error: Insufficient balance"
**Cause**: TON wallet is empty
**Solution**: Top up the wallet with TON coins

### Issue: Endpoint returns error
**Cause**: FRAGMENT_API_KEY not set in .env
**Solution**: Check .env file has FRAGMENT_API_KEY

## Complete Testing Checklist

- [ ] Changes committed and pushed
- [ ] Railway deployment successful
- [ ] Wallet balance endpoint returns data
- [ ] Wallet balance shows correct status
- [ ] Star send succeeds (if wallet has balance)
- [ ] Logs show wallet balance check
- [ ] Error messages are clear

## Files Changed

```
services/starsService.js      - Wallet check & logging
controllers/starsController.js - Diagnostic endpoint
routes/api.js                 - New route
```

## Deployment Status

✅ All files have valid syntax
✅ All changes committed
✅ Ready for Railway deployment

---

**Next Step**: Push to main and test!
