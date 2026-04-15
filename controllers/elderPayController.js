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

    // Check duplicate pending payment
    const existing = await Payment.findOne({
      amount_uzs: amountInt,
      status: 'pending',
      createdAt: { $gte: new Date(Date.now() - 10 * 60 * 1000) },
    });

    if (existing && existing.telegram_id !== String(telegram_id)) {
      return res.status(409).json({
        success: false,
        error: `Bu miqdordagi to'lov allaqachon mavjud. ${amountInt + 100} so'm kiriting`,
        suggested_amount: amountInt + 100,
      });
    }

    // Create order via ElderPay API
    const response = await axios.post(API_URL, new URLSearchParams({
      method: 'create',
      shop_id: SHOP_ID,
      shop_key: SHOP_KEY,
      amount: amountInt,
    }), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    const data = response.data;
    console.log('[ElderPay] create response:', JSON.stringify(data));

    if (data.status === 'error') {
      return res.status(400).json({ success: false, error: data.message });
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

    return res.json({
      success: true,
      data: {
        order_id: data.order,
        insert_id: data.insert_id || payment._id,
        amount: amountInt,
        card_number: process.env.CARD_NUMBER || '9860 1801 0171 2578',
        card_owner: process.env.CARD_OWNER || 'Isxakova A.',
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

    const response = await axios.get(`${API_URL}`, {
      params: {
        method: 'check',
        order: order_id,
        shop_id: SHOP_ID,
        shop_key: SHOP_KEY,
      },
    });

    const result = response.data;
    console.log('[ElderPay] check response:', JSON.stringify(result));

    // ElderPay returns status:"error" on failure, status:"success" on found
    if (!result || result.status === 'error') {
      return res.json({ success: true, data: { order_id, status: 'pending' } });
    }

    // Get order status from data
    const orderData = result.data || result;
    const status = orderData.status || result.status; // paid | pending | cancel

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

module.exports = { createOrder, checkOrder };
