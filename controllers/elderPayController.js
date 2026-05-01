const axios = require('axios');
const BotUser = require('../models/BotUser');
const Payment = require('../models/Payment');

const SHOP_ID = process.env.ELDERPAY_SHOP_ID;
const SHOP_KEY = process.env.ELDERPAY_SHOP_KEY;
const API_URL = process.env.ELDERPAY_API_URL || 'https://elder.uz/api';

/**
 * POST /api/elderpay/create
 * Creates a payment order via ElderPay
 */
const createOrder = async (req, res) => {
  try {
    const { telegram_id, amount } = req.body;

    if (!telegram_id || !amount) {
      return res.status(422).json({ success: false, error: 'telegram_id and amount required' });
    }

    const amountInt = parseInt(amount);
    if (amountInt < 1000 || amountInt > 10000000) {
      return res.status(422).json({ success: false, error: 'Amount must be between 1000 and 10000000' });
    }

    console.log(`[ElderPay] Creating order: telegram_id=${telegram_id}, amount=${amountInt}`);
    console.log(`[ElderPay] Config: SHOP_ID=${SHOP_ID}, API_URL=${API_URL}`);
    console.log(`[ElderPay] Card: ${process.env.CARD_NUMBER}, Owner: ${process.env.CARD_OWNER}`);

    // Check duplicate pending payment (within last 15 min)
    const existing = await Payment.findOne({
      amount_uzs: amountInt,
      status: 'pending',
      createdAt: { $gte: new Date(Date.now() - 15 * 60 * 1000) },
    });

    if (existing && existing.telegram_id !== String(telegram_id)) {
      return res.status(409).json({
        success: false,
        error: `Bu miqdordagi to'lov allaqachon mavjud. ${amountInt + 100} so'm kiriting`,
        suggested_amount: amountInt + 100,
      });
    }

    // Create order via ElderPay API
    let data;
    try {
      console.log(`[ElderPay] Sending request to ${API_URL}`);
      const response = await axios.post(API_URL, new URLSearchParams({
        method: 'create',
        shop_id: SHOP_ID,
        shop_key: SHOP_KEY,
        amount: amountInt,
        over: 10,
      }), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        timeout: 10000,
      });
      data = response.data;
      console.log(`[ElderPay] ✅ Success response:`, JSON.stringify(data));
    } catch (axiosErr) {
      // ElderPay may return non-2xx for duplicates
      data = axiosErr.response?.data || { status: 'error', message: axiosErr.message };
      console.log(`[ElderPay] ❌ Error response:`, JSON.stringify(data));
    }
    console.log('[ElderPay] create response:', JSON.stringify(data));

    if (data.status === 'error') {
      console.log(`[ElderPay] ⚠️ Status is error, attempting retry with amount+1`);
      // Auto-retry with amount+1 silently (up to 200 attempts)
      let retryAmount = amountInt + 1;
      let retryData;
      for (let i = 0; i < 200; i++) {
        try {
          const retryResp = await axios.post(API_URL, new URLSearchParams({
            method: 'create', shop_id: SHOP_ID, shop_key: SHOP_KEY, amount: retryAmount, over: 10,
          }), { headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, timeout: 10000 });
          retryData = retryResp.data;
          console.log(`[ElderPay] Retry ${i+1}: amount=${retryAmount}, status=${retryData.status}`);
        } catch (e) {
          retryData = e.response?.data || { status: 'error' };
        }
        if (retryData.status !== 'error') {
          console.log(`[ElderPay] ✅ Retry succeeded at attempt ${i+1}`);
          break;
        }
        retryAmount++;
      }
      if (!retryData || retryData.status === 'error' || !retryData.order) {
        console.error(`[ElderPay] ❌ All retries failed`);
        return res.status(400).json({ success: false, error: retryData?.message || 'Xatolik' });
      }
      // Use retryData as successful response — use retryAmount so ElderPay matches correctly
      let botUser = await BotUser.findOne({ telegram_id: String(telegram_id) });
      if (!botUser) botUser = await BotUser.create({ telegram_id: String(telegram_id) });
      await Payment.create({
        bot_user: botUser._id, telegram_id: String(telegram_id),
        amount_uzs: retryAmount, provider: 'manual',
        provider_transaction_id: retryData.order, status: 'pending',
      });
      const cardNumber = process.env.CARD_NUMBER || '9860 1801 0171 2578';
      const cardOwner = process.env.CARD_OWNER || 'Isxakova A.';
      console.log(`[ElderPay] ✅ Returning card: ${cardNumber}, owner: ${cardOwner}`);
      return res.json({
        success: true,
        data: {
          order_id: retryData.order, amount: retryAmount,
          card_number: cardNumber,
          card_owner: cardOwner,
          expires_in: 300,
        },
      });
    }

    // Get or create bot user
    let botUser = await BotUser.findOne({ telegram_id: String(telegram_id) });
    if (!botUser) {
      botUser = await BotUser.create({ telegram_id: String(telegram_id) });
    }

    // Save payment
    const payment = await Payment.create({
      bot_user: botUser._id,
      telegram_id: String(telegram_id),
      amount_uzs: amountInt,
      provider: 'manual',
      provider_transaction_id: data.order,
      status: 'pending',
    });

    const cardNumber = process.env.CARD_NUMBER || '9860 1801 0171 2578';
    const cardOwner = process.env.CARD_OWNER || 'Isxakova A.';
    console.log(`[ElderPay] ✅ Order created: ${data.order}, amount=${amountInt}`);
    console.log(`[ElderPay] ✅ Returning card: ${cardNumber}, owner: ${cardOwner}`);

    return res.json({
      success: true,
      data: {
        order_id: data.order,
        insert_id: data.insert_id || payment._id,
        amount: amountInt,
        card_number: cardNumber,
        card_owner: cardOwner,
        expires_in: 300,
      },
    });
  } catch (err) {
    console.error('[ElderPay] createOrder error:', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * GET /api/elderpay/check/:order_id
 * Check payment status
 */
const checkOrder = async (req, res) => {
  try {
    const { order_id } = req.params;

    let result;
    try {
      const response = await axios.post(API_URL, new URLSearchParams({
        method: 'check',
        order: order_id,
        shop_id: SHOP_ID,
        shop_key: SHOP_KEY,
      }), { headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, timeout: 5000 });
      result = response.data;
    } catch (axiosErr) {
      result = axiosErr.response?.data || { status: 'error' };
    }
    console.log('[ElderPay] check response:', JSON.stringify(result));

    // ElderPay returns status:"error" on failure, status:"success" on found
    if (!result || result.status === 'error') {
      return res.json({ success: true, data: { order_id, status: 'pending' } });
    }

    // Get order status from data — ElderPay puts it in result.data.status
    const orderData = result.data || result;
    const status = orderData.status; // paid | pending | cancel

    // If paid — credit user balance
    if (status === 'paid') {
      const payment = await Payment.findOne({ provider_transaction_id: order_id });

      if (payment && payment.status !== 'success') {
        const botUser = await BotUser.findOne({ telegram_id: payment.telegram_id });
        if (botUser) {
          botUser.balance_uzs += payment.amount_uzs;
          await botUser.save();
        }
        payment.status = 'success';
        await payment.save();
        console.log(`[ElderPay] Payment ${order_id} confirmed. Credited ${payment.amount_uzs} to ${payment.telegram_id}`);
      }
    }

    return res.json({
      success: true,
      data: {
        order_id,
        status,
        amount: orderData.amount || result.amount,
      },
    });
  } catch (err) {
    console.error('[ElderPay] checkOrder error:', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * GET /api/elderpay/pending
 * Returns all pending payments (for bot recovery on restart)
 */
const getPendingPayments = async (req, res) => {
  try {
    const payments = await Payment.find({ status: 'pending' })
      .select('provider_transaction_id telegram_id amount_uzs createdAt')
      .lean();
    return res.json({ success: true, data: payments });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

module.exports = { createOrder, checkOrder, getPendingPayments };
