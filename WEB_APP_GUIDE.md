# StarPay Web App - Полное руководство

## Что это?

Web App для Telegram бота, который позволяет пользователям:
- 💰 Покупать Telegram Stars
- 🎁 Отправлять подарки
- 📜 Смотреть историю транзакций

## Как открыть?

### Вариант 1: Из бота (рекомендуется)
Добавьте кнопку в меню бота:
```python
# В bot.py
keyboard = InlineKeyboardMarkup(inline_keyboard=[
    [InlineKeyboardButton(text="🌐 Web App", web_app=WebAppInfo(url="https://your-domain.com/app.html"))]
])
```

### Вариант 2: Прямая ссылка
```
https://your-domain.com/app.html
```

## Функции

### 1. Покупка звёзд (⭐ Звёзды)
- Выберите количество: 50, 100, 250, 500, 1000, 2500, 5000
- Цена: 195 сум за звезду
- Звёзды отправляются на ваш Telegram аккаунт

**Пример:**
- 50 звёзд = 9,750 сум
- 100 звёзд = 19,500 сум
- 1000 звёзд = 195,000 сум

### 2. Отправка подарков (🎁 Подарки)
- Введите username получателя
- Выберите подарок из 17 вариантов
- Цена: 50,000 сум за подарок

**Доступные подарки:**
- 🐻 bear, ❤️ heart, 🎁 gift, 🌹 rose, 🎂 cake
- 🌸 flower, 🚀 rocket, ✨ final, 💍 ring, 💎 diamond
- 🥤 cola, 👑 unikal1, 🎪 unikal2, 🎭 unikal3
- 🎨 unikal4, 🎸 unikal5, 🎯 unikal6

### 3. История (📜 История)
- Все ваши транзакции
- Дата и время
- Сумма и тип операции

## API Endpoints

### Получить баланс
```bash
POST /api/bot/balance
Content-Type: application/json

{
  "telegram_id": "123456789"
}

# Ответ:
{
  "success": true,
  "data": {
    "telegram_id": "123456789",
    "user_number": 1,
    "balance_uzs": 100000,
    "total_stars_bought": 50
  }
}
```

### Купить звёзды
```bash
POST /api/bot/buy-stars
Content-Type: application/json

{
  "telegram_id": "123456789",
  "stars_count": 100
}

# Ответ:
{
  "success": true,
  "message": "Successfully sent 100 stars.",
  "data": {
    "telegram_id": "123456789",
    "stars_sent": 100,
    "price_uzs": 19500,
    "balance_uzs_remaining": 80500,
    "order_id": "507f1f77bcf86cd799439011"
  }
}
```

### Отправить подарок
```bash
POST /api/bot/send-gift
Content-Type: application/json

{
  "telegram_id": "123456789",
  "target_username": "admin",
  "gift_name": "bear",
  "price": 50000
}

# Ответ:
{
  "success": true,
  "message": "Gift 'bear' sent to @admin.",
  "data": {
    "telegram_id": "123456789",
    "target_username": "admin",
    "gift_name": "bear",
    "price": 50000,
    "balance_uzs_remaining": 50000,
    "order_id": "507f1f77bcf86cd799439012"
  }
}
```

### История транзакций
```bash
GET /api/bot/transactions?telegram_id=123456789&limit=10

# Ответ:
{
  "success": true,
  "data": [
    {
      "_id": "507f1f77bcf86cd799439013",
      "type": "debit",
      "amount": 19500,
      "description": "Bought 100 stars",
      "created_at": "2026-05-03T10:30:00Z",
      "order_id": "507f1f77bcf86cd799439011"
    },
    {
      "_id": "507f1f77bcf86cd799439014",
      "type": "debit",
      "amount": 50000,
      "description": "Gift: bear to @admin",
      "created_at": "2026-05-03T10:35:00Z",
      "order_id": "507f1f77bcf86cd799439012"
    }
  ],
  "pagination": {
    "total": 2,
    "page": 1,
    "limit": 10,
    "pages": 1
  }
}
```

## Интеграция с ботом

### Добавить кнопку в меню
```python
from aiogram.types import InlineKeyboardMarkup, InlineKeyboardButton, WebAppInfo

# В любом обработчике
keyboard = InlineKeyboardMarkup(inline_keyboard=[
    [InlineKeyboardButton(
        text="🌐 StarPay Web App",
        web_app=WebAppInfo(url="https://your-domain.com/app.html")
    )]
])

await message.answer("Откройте web app:", reply_markup=keyboard)
```

### Получить данные пользователя в web app
```javascript
// Telegram Web App автоматически предоставляет данные пользователя
const tg = window.Telegram.WebApp;
const user = tg.initDataUnsafe?.user;

console.log(user.id);        // Telegram ID
console.log(user.username);  // Username
console.log(user.first_name); // Имя
```

## Безопасность

### Проверка подписи (опционально)
```javascript
// Проверить что данные пришли от Telegram
const initData = tg.initData;
const hash = tg.initDataUnsafe?.hash;

// Отправить на сервер для проверки
fetch('/api/verify-telegram-data', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ initData, hash })
});
```

## Развертывание

### На Railway
1. Файл уже находится в `public/app.html`
2. Доступен по адресу: `https://your-railway-app.up.railway.app/app.html`
3. Используйте этот URL в кнопке web app

### На собственном сервере
1. Скопируйте `public/app.html` на ваш сервер
2. Убедитесь что Express сервирует статические файлы из `public/`
3. Используйте URL вашего сервера

## Тестирование

### Локально
```bash
# Запустить сервер
npm start

# Открыть в браузере
http://localhost:3000/app.html
```

### На мобильном
1. Откройте бота в Telegram
2. Нажмите на кнопку "Web App"
3. Приложение откроется в встроенном браузере Telegram

## Решение проблем

### "Ошибка загрузки баланса"
- Проверьте что telegram_id правильный
- Убедитесь что пользователь зарегистрирован в боте
- Проверьте логи сервера

### "Недостаточно средств"
- Пополните баланс через бота
- Используйте команду `/topup` или кнопку "Пополнить баланс"

### "Ошибка отправки подарка"
- Проверьте что username правильный (без @)
- Убедитесь что пользователь существует в Telegram
- Проверьте что баланс достаточный

## Кастомизация

### Изменить цены
Отредактируйте в `public/app.html`:
```javascript
state = {
  starPrice: 195,      // Цена за звезду
  giftPrice: 50000,    // Цена за подарок
  // ...
}
```

### Изменить доступные подарки
```javascript
state.gifts = {
  bear: '🐻',
  heart: '❤️',
  // Добавьте свои...
}
```

### Изменить цвета
Отредактируйте CSS переменные:
```css
:root {
  --primary: #f59e0b;        /* Основной цвет */
  --primary-dark: #d97706;   /* Тёмный вариант */
  --success: #10b981;        /* Успех */
  --danger: #ef4444;         /* Ошибка */
}
```

## Поддерживаемые браузеры

- ✅ Telegram Web App (встроенный браузер)
- ✅ Chrome/Chromium
- ✅ Firefox
- ✅ Safari
- ✅ Edge

## Лицензия

© 2026 StarPay - Telegram Stars Gateway

