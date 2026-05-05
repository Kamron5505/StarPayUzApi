# Telegram Stars API - Usage Guide

## Base URL
```
https://web-production-3d7ba.up.railway.app
```

## Authentication
All API requests require an `X-API-Key` header with a valid API key.

```bash
curl -H "X-API-Key: YOUR_API_KEY" https://web-production-3d7ba.up.railway.app/api/balance
```

## Main Endpoints

### 1. Health Check
**GET** `/`

```bash
curl https://web-production-3d7ba.up.railway.app/
```

### 2. Get Balance
**GET** `/api/balance`

```bash
curl -H "X-API-Key: YOUR_API_KEY" \
  https://web-production-3d7ba.up.railway.app/api/balance
```

### 3. Get Stars Pricing
**POST** `/api/stars/pricing`

```bash
curl -X POST \
  -H "X-API-Key: YOUR_API_KEY" \
  https://web-production-3d7ba.up.railway.app/api/stars/pricing
```

### 4. Send Stars
**POST** `/api/stars/send`

```bash
curl -X POST \
  -H "X-API-Key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"username":"@testuser","amount":50}' \
  https://web-production-3d7ba.up.railway.app/api/stars/send
```

### 5. Get Wallet Balance
**GET** `/api/stars/wallet-balance`

```bash
curl -H "X-API-Key: YOUR_API_KEY" \
  https://web-production-3d7ba.up.railway.app/api/stars/wallet-balance
```

### 6. Get Premium Pricing
**POST** `/api/premium/pricing`

```bash
curl -X POST \
  -H "X-API-Key: YOUR_API_KEY" \
  https://web-production-3d7ba.up.railway.app/api/premium/pricing
```

### 7. Send Premium
**POST** `/api/premium/send`

```bash
curl -X POST \
  -H "X-API-Key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"username":"@testuser","months":1}' \
  https://web-production-3d7ba.up.railway.app/api/premium/send
```

## Bot Routes (Service Secret Required)

### Register Bot User
**POST** `/api/bot/user`

```bash
curl -X POST \
  -H "X-Service-Secret: starpay_tg_secret_2024" \
  -H "Content-Type: application/json" \
  -d '{"telegram_id":123456789,"username":"testuser"}' \
  https://web-production-3d7ba.up.railway.app/api/bot/user
```

### Get Bot User Balance
**GET** `/api/bot/user/:telegram_id/balance`

```bash
curl -H "X-Service-Secret: starpay_tg_secret_2024" \
  https://web-production-3d7ba.up.railway.app/api/bot/user/123456789/balance
```

### Buy Stars
**POST** `/api/bot/buy-stars`

```bash
curl -X POST \
  -H "X-Service-Secret: starpay_tg_secret_2024" \
  -H "Content-Type: application/json" \
  -d '{"telegram_id":123456789,"stars_count":50}' \
  https://web-production-3d7ba.up.railway.app/api/bot/buy-stars
```

## Admin Routes (Admin Secret Required)

### Admin Broadcast
**POST** `/api/admin/broadcast`

```bash
curl -X POST \
  -H "X-Admin-Secret: kama5505" \
  -H "Content-Type: application/json" \
  -d '{"text":"Message"}' \
  https://web-production-3d7ba.up.railway.app/api/admin/broadcast
```

### Check Bot Users
**GET** `/api/admin/check-bot-users`

```bash
curl -H "X-Admin-Secret: kama5505" \
  https://web-production-3d7ba.up.railway.app/api/admin/check-bot-users
```

## Status

✅ API is running and all endpoints are working!
