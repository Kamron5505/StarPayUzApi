const mongoose = require('mongoose');
const axios = require('axios');
require('dotenv').config();

const BotUser = require('./models/BotUser');
const Order = require('./models/Order');

const API_URL = 'http://localhost:3000';
const ADMIN_SECRET = 'kama5505';

async function runTests() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('[DB] Connected\n');

    // Test 1: Check if test user exists
    console.log('=== TEST 1: Проверка тестового пользователя ===');
    let testUser = await BotUser.findOne({ telegram_id: '123456789' });
    if (!testUser) {
      testUser = await BotUser.create({
        telegram_id: '123456789',
        username: 'test_user',
        balance_uzs: 0,
      });
      console.log('[✓] Создан тестовый пользователь');
    } else {
      console.log('[✓] Тестовый пользователь найден');
    }
    console.log(`    Telegram ID: ${testUser.telegram_id}`);
    console.log(`    Username: ${testUser.username}`);
    console.log(`    Баланс до: ${testUser.balance_uzs} сум\n`);

    // Test 2: Test topup via API
    console.log('=== TEST 2: Пополнение баланса через API ===');
    try {
      const topupResponse = await axios.post(`${API_URL}/api/admin/topup`, {
        telegram_id: '123456789',
        amount: 50000
      }, {
        headers: { 'X-Admin-Secret': ADMIN_SECRET }
      });

      if (topupResponse.data.success) {
        console.log('[✓] Пополнение успешно');
        console.log(`    Сообщение: ${topupResponse.data.message}`);
        console.log(`    Баланс до: ${topupResponse.data.data.balance_before} сум`);
        console.log(`    Баланс после: ${topupResponse.data.data.balance_after} сум\n`);
      } else {
        console.log('[✗] Ошибка пополнения:', topupResponse.data.error);
      }
    } catch (err) {
      console.log('[✗] Ошибка API:', err.response?.data?.error || err.message);
    }

    // Test 3: Check balance
    console.log('=== TEST 3: Проверка баланса ===');
    testUser = await BotUser.findOne({ telegram_id: '123456789' });
    console.log(`[✓] Баланс в БД: ${testUser.balance_uzs} сум\n`);

    // Test 4: Test buy stars
    console.log('=== TEST 4: Покупка звёзд ===');
    try {
      const buyResponse = await axios.post(`${API_URL}/api/bot/buy-stars`, {
        telegram_id: '123456789',
        amount: 10,
        recipient: '@test_recipient'
      }, {
        headers: { 'X-Service-Secret': 'starpay_tg_secret_2024' }
      });

      if (buyResponse.data.success) {
        console.log('[✓] Покупка звёзд успешна');
        console.log(`    Статус: ${buyResponse.data.data?.status}`);
        console.log(`    Звёзд: ${buyResponse.data.data?.amount}`);
        console.log(`    Получатель: ${buyResponse.data.data?.recipient}\n`);
      } else {
        console.log('[✗] Ошибка покупки:', buyResponse.data.error);
        console.log(`    Детали: ${JSON.stringify(buyResponse.data.data)}\n`);
      }
    } catch (err) {
      console.log('[✗] Ошибка API:', err.response?.data?.error || err.message);
      console.log(`    Детали: ${JSON.stringify(err.response?.data)}\n`);
    }

    // Test 5: Check final balance
    console.log('=== TEST 5: Финальная проверка баланса ===');
    testUser = await BotUser.findOne({ telegram_id: '123456789' });
    console.log(`[✓] Баланс после покупки: ${testUser.balance_uzs} сум\n`);

    // Test 6: Check orders
    console.log('=== TEST 6: Проверка заказов ===');
    const orders = await Order.find({ telegram_user_id: '123456789' });
    console.log(`[✓] Всего заказов: ${orders.length}`);
    orders.forEach((order, i) => {
      console.log(`    Заказ ${i + 1}:`);
      console.log(`      - Тип: ${order.type}`);
      console.log(`      - Количество: ${order.amount}`);
      console.log(`      - Статус: ${order.status}`);
      console.log(`      - Ошибка: ${order.error_message || 'нет'}`);
    });

    console.log('\n=== ТЕСТИРОВАНИЕ ЗАВЕРШЕНО ===');
    process.exit(0);
  } catch (err) {
    console.error('[Error]', err.message);
    process.exit(1);
  }
}

runTests();
