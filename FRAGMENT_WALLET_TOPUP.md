# Fragment API Wallet Top-Up Guide

## Problem

The Fragment API wallet has LOW balance (< 0.1 TON), which prevents sending stars.

```
Status: LOW
Message: "Low balance - may fail to send stars"
```

## Solution

You need to top up the Fragment API wallet with TON coins.

### Step 1: Find Your Fragment API Wallet Address

The wallet address is managed by Fragment API. You need to:

1. Go to Fragment API dashboard (fragment-api.uz)
2. Log in with your API Key: `9621fbdcb35922779aaf152e94c3a0b53ce9223b`
3. Find the wallet address in your account settings
4. Copy the wallet address

### Step 2: Send TON to the Wallet

Once you have the wallet address:

1. Open your TON wallet (you have 3,514 TON)
2. Send at least **0.5 TON** to the Fragment API wallet address
3. Wait 1-2 minutes for confirmation

### Step 3: Verify Balance

After sending TON, check the balance:

```bash
curl -H "X-API-Key: b0ece50cc163419dbcc52f5fa15b053c" \
  https://web-production-3d7ba.up.railway.app/api/stars/wallet-balance
```

Expected response:
```json
{
  "success": true,
  "data": {
    "status": "OK",
    "message": "Sufficient balance"
  }
}
```

## Recommended Balance

- 🔴 Critical: < 0.05 TON (will fail)
- 🟡 Low: 0.05-0.1 TON (may fail)
- 🟢 OK: 0.1-0.5 TON (works)
- 🟢 Comfortable: 0.5+ TON (recommended)

## Current Status

- Your TON wallet: 3,514 TON ✅
- Fragment API wallet: LOW ⚠️
- Need to send: 0.5 TON

---

**Next Step**: Find Fragment API wallet address and send TON
