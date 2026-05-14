const axios = require('axios');
require('dotenv').config();

const API_URL = 'https://web-production-3d7ba.up.railway.app';
const ADMIN_SECRET = 'kama5505';

async function runTests() {
  try {
    console.log('=== ТЕСТИРОВАНИЕ PRODUCTION API ===\n');

    // Test 1: Get orders
    console.log('=== TEST 1: Получение заказов ===');
    try {
      const ordersResponse = await axios.get(`${API_URL}/api/admin/orders?limit=5`, {
        headers: { 'X-Admin-Secret': ADMIN_SECRET }
      });

      if (ordersResponse.data.success) {
        console.log('[✓] Заказы получены');
        console.log(`    Всего заказов: ${ordersResponse.data.data.pagination.total}`);
        console.log(`    Показано: ${ordersResponse.data.data.orders.length}`);
        
        if (ordersResponse.data.data.orders.length > 0) {
          const order = ordersResponse.data.data.orders[0];
          console.log(`    Последний заказ:`);
          console.log(`      - ID: ${order._id}`);
          console.log(`      - Тип: ${order.type}`);
          console.log(`      - Количество: ${order.amount}`);
          console.log(`      - Статус: ${order.status}`);
        }
      }
    } catch (err) {
      console.log('[✗] Ошибка:', err.response?.data?.error || err.message);
    }

    console.log();

    // Test 2: Get bot users
    console.log('=== TEST 2: Получение пользователей ===');
    try {
      const usersResponse = await axios.get(`${API_URL}/api/admin/bot-users?limit=5`, {
        headers: { 'X-Admin-Secret': ADMIN_SECRET }
      });

      if (usersResponse.data.success) {
        console.log('[✓] Пользователи получены');
        console.log(`    Всего пользователей: ${usersResponse.data.data.pagination.total}`);
        console.log(`    Показано: ${usersResponse.data.data.users.length}`);
        
        if (usersResponse.data.data.users.length > 0) {
          const user = usersResponse.data.data.users[0];
          console.log(`    Первый пользователь:`);
          console.log(`      - Telegram ID: ${user.telegram_id}`);
          console.log(`      - Username: ${user.username}`);
          console.log(`      - Баланс: ${user.balance_uzs} сум`);
          console.log(`      - Звёзд куплено: ${user.total_stars_bought}`);
        }
      }
    } catch (err) {
      console.log('[✗] Ошибка:', err.response?.data?.error || err.message);
    }

    console.log();

    // Test 3: Test topup
    console.log('=== TEST 3: Пополнение баланса (тест) ===');
    try {
      const topupResponse = await axios.post(`${API_URL}/api/admin/topup`, {
        telegram_id: '123456789',
        amount: 10000
      }, {
        headers: { 'X-Admin-Secret': ADMIN_SECRET }
      });

      if (topupResponse.data.success) {
        console.log('[✓] Пополнение успешно');
        console.log(`    Сообщение: ${topupResponse.data.message}`);
        console.log(`    Баланс до: ${topupResponse.data.data.balance_before} сум`);
        console.log(`    Баланс после: ${topupResponse.data.data.balance_after} сум`);
      } else {
        console.log('[✗] Ошибка:', topupResponse.data.error);
      }
    } catch (err) {
      console.log('[✗] Ошибка API:', err.response?.data?.error || err.message);
    }

    console.log();

    // Test 4: Check balance
    console.log('=== TEST 4: Проверка баланса ===');
    try {
      const balanceResponse = await axios.get(`${API_URL}/api/bot/user/123456789/balance`, {
        headers: { 'X-Service-Secret': 'starpay_tg_secret_2024' }
      });

      if (balanceResponse.data.success) {
        console.log('[✓] Баланс получен');
        console.log(`    Telegram ID: ${balanceResponse.data.data.telegram_id}`);
        console.log(`    Баланс: ${balanceResponse.data.data.balance_uzs} сум`);
        console.log(`    Звёзд куплено: ${balanceResponse.data.data.total_stars_bought}`);
      } else {
        console.log('[✗] Ошибка:', balanceResponse.data.error);
      }
    } catch (err) {
      console.log('[✗] Ошибка API:', err.response?.data?.error || err.message);
    }

    console.log();

    // Test 5: Get prices
    console.log('=== TEST 5: Получение цен ===');
    try {
      const pricesResponse = await axios.get(`${API_URL}/api/bot/prices`);

      if (pricesResponse.data.success) {
        console.log('[✓] Цены получены');
        console.log(`    Данные: ${JSON.stringify(pricesResponse.data.data).substring(0, 100)}...`);
      } else {
        console.log('[✗] Ошибка:', pricesResponse.data.error);
      }
    } catch (err) {
      console.log('[✗] Ошибка API:', err.response?.data?.error || err.message);
    }

    console.log('\n=== ТЕСТИРОВАНИЕ ЗАВЕРШЕНО ===');
    process.exit(0);
  } catch (err) {
    console.error('[Error]', err.message);
    process.exit(1);
  }
}

runTests();
