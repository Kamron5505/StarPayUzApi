const crypto = require('crypto');
const Payment = require('../models/Payment');
const BotUser = require('../models/BotUser');

/**
 * POST /api/payment/create
 * Creates a unique payment order
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

    // Check no duplicate pending payment with same amount
    const existing = await Payment.findOne({
      amount_uzs: amountInt,
      status: 'pending',
      createdAt: { $gte: new Date(Date.now() - 10 * 60 * 1000) },
    });

    if (existing && existing.telegram_id !== String(telegram_id)) {
      // Suggest slightly different amount
      return res.status(409).json({
        success: false,
        error: `Bu miqdordagi to'lov allaqachon mavjud. Miqdorni biroz o'zgartiring: ${amountInt + 100} so'm`,
        suggested_amount: amountInt + 100,
      });
    }

    // Get or create bot user
    let botUser = await BotUser.findOne({ telegram_id: String(telegram_id) });
    if (!botUser) {
      botUser = await BotUser.create({ telegram_id: String(telegram_id) });
    }

    // Generate short order ID
    const order_id = crypto.randomBytes(4).toString('hex').toUpperCase();

    const payment = await Payment.create({
      bot_user: botUser._id,
      telegram_id: String(telegram_id),
      amount_uzs: amountInt,
      provider: 'manual',
      provider_transaction_id: order_id,
      status: 'pending',
    });

    return res.json({
      success: true,
      data: {
        order_id,
        insert_id: payment._id,
        amount: amountInt,
        card_number: process.env.CARD_NUMBER || '9860 1801 0171 2578',
        card_owner: process.env.CARD_OWNER || 'Isxakova A.',
        expires_in: 300,
      },
    });
  } catch (err) {
    console.error('[Payment] createOrder error:', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * GET /api/payment/check/:order_id
 * Check payment status by order_id
 */
const checkOrder = async (req, res) => {
  try {
    const payment = await Payment.findOne({
      provider_transaction_id: req.params.order_id,
    });

    if (!payment) {
      return res.status(404).json({ success: false, error: 'Order not found', status: 'not_found' });
    }

    return res.json({
      success: true,
      data: {
        order_id: payment.provider_transaction_id,
        status: payment.status,   // pending | success | failed | cancelled
        amount: payment.amount_uzs,
        telegram_id: payment.telegram_id,
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * POST /api/payment/confirm
 * Admin manually confirms a payment (fallback)
 */
const confirmOrder = async (req, res) => {
  try {
    const { order_id } = req.body;
    const payment = await Payment.findOne({ provider_transaction_id: order_id });

    if (!payment) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    if (payment.status === 'success') {
      return res.json({ success: true, message: 'Already confirmed' });
    }

    const botUser = await BotUser.findOne({ telegram_id: payment.telegram_id });
    if (botUser) {
      botUser.balance_uzs += payment.amount_uzs;
      await botUser.save();
    }

    payment.status = 'success';
    await payment.save();

    return res.json({
      success: true,
      message: `Confirmed. ${payment.amount_uzs} UZS credited to ${payment.telegram_id}`,
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

module.exports = { createOrder, checkOrder, confirmOrder };
