# Quick Reference Card

## 🚀 IMMEDIATE ACTION REQUIRED

### Top Up Fragment API Wallet

**Send**: 0.5 TON  
**To**: `UQDhybeSGRvBD3lbJADy1LTEXvvLS6vNHgT_amyuQhzK4-FU`  
**From**: Your TON wallet (3,514 TON available)  
**Time**: 1-2 minutes  

---

## ✅ SYSTEM STATUS

| Component | Status | Details |
|-----------|--------|---------|
| Server | ✅ Running | Railway deployment |
| Database | ✅ Connected | MongoDB |
| ElderPay | ✅ Working | SHOP_ID: 304216 |
| Bot Token | ✅ Secure | In .env file |
| Star Prices | ✅ Updated | 200 UZS per star |
| Broadcast | ✅ Fixed | Validation added |
| Wallet Balance | ⚠️ LOW | < 0.1 TON |

---

## 📞 KEY ENDPOINTS

### Check Wallet Balance
```bash
curl -H "X-API-Key: b0ece50cc163419dbcc52f5fa15b053c" \
  https://web-production-3d7ba.up.railway.app/api/stars/wallet-balance
```

### Send Stars
```bash
curl -X POST \
  -H "X-API-Key: b0ece50cc163419dbcc52f5fa15b053c" \
  -H "Content-Type: application/json" \
  -d '{"username":"@user","amount":50}' \
  https://web-production-3d7ba.up.railway.app/api/stars/send
```

### Admin Broadcast
```bash
curl -X POST \
  -H "X-Admin-Secret: kama5505" \
  -H "Content-Type: application/json" \
  -d '{"message":"Hello"}' \
  https://web-production-3d7ba.up.railway.app/api/admin/broadcast
```

---

## 🔑 CREDENTIALS

| Item | Value |
|------|-------|
| ElderPay SHOP_ID | 304216 |
| ElderPay SHOP_KEY | 5QLEKZ625U |
| Admin Secret | kama5505 |
| Fragment API Key | 9621fbdcb35922779aaf152e94c3a0b53ce9223b |
| Bot Token | 8270083145:AAFlPuhdCCe4cujE3-DMywkq0FT5EJgq3Po |

---

## 💰 STAR PRICES (200 UZS per star)

| Stars | Price (UZS) |
|-------|------------|
| 50 | 10,000 |
| 100 | 20,000 |
| 500 | 100,000 |
| 1000 | 200,000 |

---

## 📊 WALLET BALANCE THRESHOLDS

| Balance | Status | Action |
|---------|--------|--------|
| < 0.05 TON | 🔴 Critical | Will fail |
| 0.05-0.1 TON | 🟡 Low | May fail |
| 0.1-0.5 TON | 🟢 OK | Works |
| 0.5+ TON | 🟢 Comfortable | Recommended |

---

## 📁 IMPORTANT FILES

- `.env` - Environment configuration
- `config.py` - Star prices
- `controllers/starsController.js` - Star sending
- `services/starsService.js` - Fragment API
- `CURRENT_STATUS.md` - Full status
- `FRAGMENT_WALLET_TOPUP.md` - Wallet instructions

---

## 🔗 LINKS

- **App URL**: https://web-production-3d7ba.up.railway.app
- **GitHub (API)**: https://github.com/Kamron5505/StarPayUzApi
- **GitHub (Bot)**: https://github.com/Kamron5505/Star_PayUz_bot
- **Fragment API**: https://fragment-api.uz

---

## ⏱️ NEXT STEPS

1. **NOW**: Top up Fragment API wallet (5 min)
2. **THEN**: Verify wallet balance
3. **TEST**: Send test stars to user
4. **MONITOR**: Check logs on Railway

---

**Last Updated**: May 2, 2026  
**System Status**: 95% Ready ✅  
**Blocker**: Wallet top-up ⚠️
