# Telegram Stars API — Request Examples

Base URL: `http://localhost:3000`

---

## Admin Endpoints
> All admin requests require header: `X-Admin-Secret: your_super_secret_admin_key_here`

### Create a user (generates API key)
```bash
curl -X POST http://localhost:3000/api/admin/users \
  -H "Content-Type: application/json" \
  -H "X-Admin-Secret: your_super_secret_admin_key_here" \
  -d '{"username": "john_doe", "initial_balance": 500}'
```

### Top up user balance
```bash
curl -X POST http://localhost:3000/api/admin/topup \
  -H "Content-Type: application/json" \
  -H "X-Admin-Secret: your_super_secret_admin_key_here" \
  -d '{"username": "john_doe", "amount": 1000, "description": "Manual top-up"}'
```

### List all users
```bash
curl http://localhost:3000/api/admin/users \
  -H "X-Admin-Secret: your_super_secret_admin_key_here"
```

### Regenerate API key
```bash
curl -X POST http://localhost:3000/api/admin/users/john_doe/regenerate-key \
  -H "X-Admin-Secret: your_super_secret_admin_key_here"
```

### Toggle user active/inactive
```bash
curl -X PATCH http://localhost:3000/api/admin/users/john_doe/toggle \
  -H "X-Admin-Secret: your_super_secret_admin_key_here"
```

---

## User Endpoints
> All user requests require header: `X-Api-Key: <your_api_key>`
> Or pass `api_key` in the request body / query string.

### Get balance
```bash
curl http://localhost:3000/api/balance \
  -H "X-Api-Key: YOUR_API_KEY_HERE"
```

### Send stars to a Telegram user
```bash
curl -X POST http://localhost:3000/api/send-stars \
  -H "Content-Type: application/json" \
  -H "X-Api-Key: YOUR_API_KEY_HERE" \
  -d '{"telegram_user_id": "123456789", "amount": 50}'
```

### Get transaction history
```bash
curl "http://localhost:3000/api/transactions?page=1&limit=10" \
  -H "X-Api-Key: YOUR_API_KEY_HERE"
```

### Filter transactions by type
```bash
curl "http://localhost:3000/api/transactions?type=debit" \
  -H "X-Api-Key: YOUR_API_KEY_HERE"
```

### Create a pending order
```bash
curl -X POST http://localhost:3000/api/create-order \
  -H "Content-Type: application/json" \
  -H "X-Api-Key: YOUR_API_KEY_HERE" \
  -d '{"telegram_user_id": "123456789", "amount": 100}'
```

### Get all orders
```bash
curl "http://localhost:3000/api/orders?status=success" \
  -H "X-Api-Key: YOUR_API_KEY_HERE"
```

### Get order by ID
```bash
curl http://localhost:3000/api/orders/ORDER_ID_HERE \
  -H "X-Api-Key: YOUR_API_KEY_HERE"
```

---

## Response Format

All responses follow this structure:

```json
{
  "success": true | false,
  "message": "Optional human-readable message",
  "data": { ... },
  "error": "Error message if success is false"
}
```

## Error Codes

| Code | Meaning                        |
|------|--------------------------------|
| 401  | Missing or invalid API key     |
| 402  | Insufficient balance           |
| 403  | Admin access denied            |
| 404  | Resource not found             |
| 409  | Conflict (e.g. duplicate user) |
| 422  | Validation error               |
| 500  | Internal server error          |
| 502  | Stars delivery failed          |
