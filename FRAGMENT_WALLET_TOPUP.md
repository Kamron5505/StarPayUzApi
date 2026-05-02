# Fragment API Wallet Top-Up Guide

## Problem

The Fragment API wallet has LOW balance (< 0.1 TON), which prevents sending stars.

```
Status: LOW
Message: "Low balance - may fail to send stars"
```

## Current Status

- Your TON wallet: 3,514 TON ✅
- Fragment API wallet: LOW ⚠️ (< 0.1 TON)
- Fragment API wallet address: `UQDhybeSGRvBD3lbJADy1LTEXvvLS6vNHgT_amyuQhzK4-FU`
- Fragment API Key: `9621fbdcb35922779aaf152e94c3a0b53ce9223b`

## Solution: Send TON to Fragment API Wallet

### Step 1: Open Your TON Wallet

1. Open your TON wallet application (Tonkeeper, TonHub, or similar)
2. You have 3,514 TON available

### Step 2: Send TON to Fragment API Wallet

1. Click "Send" in your TON wallet
2. Paste the wallet address: `UQDhybeSGRvBD3lbJADy1LTEXvvLS6vNHgT_amyuQhzK4-FU`
3. Enter amount: **0.5 TON** (minimum recommended)
4. Confirm and send
5. Wait 1-2 minutes for confirmation

### Step 3: Verify Balance

After sending TON, check the balance:

```bash
curl -H "X-API-Key: b0ece50cc163419dbcc52f5fa15b053c" \
  https://web-production-3d7ba.up.railway.app/api/stars/wallet-balance
```

Expected response after top-up:
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

## Balance Thresholds

- 🔴 Critical: < 0.05 TON (will fail)
- 🟡 Low: 0.05-0.1 TON (may fail)
- 🟢 OK: 0.1-0.5 TON (works)
- 🟢 Comfortable: 0.5+ TON (recommended)

## Why This Is Needed

The Fragment API uses a separate wallet to send Telegram Stars. When you send stars to users:
1. The API deducts from your Fragment wallet balance
2. If balance < 0.1 TON, the API returns "Insufficient balance" error
3. The user's balance is refunded automatically

## After Top-Up

Once the wallet has sufficient balance (> 0.1 TON):
- ✅ Stars will send successfully
- ✅ Users will receive stars immediately
- ✅ No more "Insufficient balance" errors

---

**Action Required**: Send 0.5 TON to `UQDhybeSGRvBD3lbJADy1LTEXvvLS6vNHgT_amyuQhzK4-FU` from your TON wallet
