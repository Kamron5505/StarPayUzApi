const crypto = require('crypto');
const Payment = require('../models/Payment');
const BotUser = require('../models/BotUser');

/**
 * POST /api/sms/incoming
 * Receives SMS from Android app (SMS Forwarder / AutoSMS)
 * Parses bank SMS and credits user balance
 */
const incomingSms = async (req, res) => {
  try {
    const { sender, message, secret } = req.body;

    // Verify secret key
    if (secret !== process.env.SMS_SECRET) {
      return res.status(401).json({ success: false, error: 'Invalid secret' });
    }

    console.log(`[SMS] From: ${sender} | Message: ${message}`);

    // Parse Humo/Visa SMS
    // Humo example: "Karta: 9860****2578. Kirim: 19000.00 UZS. Qoldiq: 150000.00 UZS. 11:54"
    // Uzcard example: "Hisobingizga 19000 UZS o'tkazildi"
    const amount = parseSmsAmount(message);

    if (!amount) {
      console.log('[SMS] Could not parse amount from SMS');
      return res.json({ success: false, error: 'Could not parse amount' });
    }

    console.log(`[SMS] Parsed amount: ${amount} UZS`);

    // Find pending payment with matching amount (within last 10 minutes)
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    const payment = await Payment.findOne({
      amount_uzs: amount,
      status: 'pending',
      createdAt: { $gte: tenMinutesAgo },
    }).sort({ createdAt: -1 });

    if (!payment) {
      console.log(`[SMS] No pending payment found for amount ${amount}`);
      return res.json({ success: false, error: 'No matching payment found' });
    }

    // Credit user balance
    const botUser = await BotUser.findOne({ telegram_id: payment.telegram_id });
    if (!botUser) {
      return res.json({ success: false, error: 'Bot user not found' });
    }

    botUser.balance_uzs += amount;
    await botUser.save();

    payment.status = 'success';
    await payment.save();

    console.log(`[SMS] Credited ${amount} UZS to user ${payment.telegram_id}`);

    // Notify Telegram bot via webhook
    await notifyBot(payment.telegram_id, amount, payment._id);

    return res.json({
      success: true,
      message: `Credited ${amount} UZS to user ${payment.telegram_id}`,
    });
  } catch (err) {
    console.error('[SMS] Error:', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * Parse amount from bank SMS text
 */
const parseSmsAmount = (text) => {
  if (!text) return null;

  // Patterns for Uzbek banks
  const patterns = [
    /[Kk]irim[:\s]+(\d[\d\s,\.]+)\s*UZS/i,           // Humo: Kirim: 19000.00 UZS
    /o['']tkazildi[:\s]+(\d[\d\s,\.]+)\s*UZS/i,       // Uzcard: 19000 UZS o'tkazildi
    /(\d[\d\s,\.]+)\s*UZS.*[Kk]irim/i,                // reverse order
    /\+(\d[\d\s,\.]+)\s*UZS/i,                        // +19000 UZS
    /зачислено[:\s]+(\d[\d\s,\.]+)/i,                 // Russian: зачислено 19000
    /(\d[\d\s]+)\s*сум.*зачислен/i,                   // сум зачислен
    /Summa[:\s]+(\d[\d\s,\.]+)/i,                     // Summa: 19000
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const raw = match[1].replace(/[\s,]/g, '').replace('.00', '').replace(/\.\d+$/, '');
      const amount = parseInt(raw);
      if (amount >= 1000 && amount <= 10000000) {
        return amount;
      }
    }
  }

  return null;
};

/**
 * Notify Telegram bot about successful payment
 */
const notifyBot = async (telegramId, amount, paymentId) => {
  try {
    const botWebhookUrl = process.env.BOT_WEBHOOK_URL;
    if (!botWebhookUrl) return;

    const axios = require('axios');
    await axios.post(botWebhookUrl, {
      event: 'payment_success',
      telegram_id: telegramId,
      amount_uzs: amount,
      payment_id: paymentId,
    }, {
      headers: { 'X-Bot-Secret': process.env.BOT_SECRET || '' },
      timeout: 5000,
    });
  } catch (err) {
    console.error('[SMS] Bot notify error:', err.message);
  }
};

/**
 * POST /api/sms/create-payment
 * Bot calls this to create a pending payment request
 */
const createPayment = async (req, res) => {
  try {
    const { telegram_id, amount_uzs } = req.body;

    if (!telegram_id || !amount_uzs) {
      return res.status(422).json({ success: false, error: 'telegram_id and amount_uzs required' });
    }

    const amount = parseInt(amount_uzs);
    if (amount < 1000 || amount > 10000000) {
      return res.status(422).json({ success: false, error: 'Amount must be between 1000 and 10000000' });
    }

    // Get or create bot user
    let botUser = await BotUser.findOne({ telegram_id: String(telegram_id) });
    if (!botUser) {
      botUser = await BotUser.create({ telegram_id: String(telegram_id) });
    }

    // Create pending payment
    const payment = await Payment.create({
      bot_user: botUser._id,
      telegram_id: String(telegram_id),
      amount_uzs: amount,
      provider: 'manual',
      status: 'pending',
    });

    return res.json({
      success: true,
      data: {
        payment_id: payment._id,
        amount_uzs: amount,
        card_number: process.env.CARD_NUMBER || '9860 1801 0171 2578',
        card_owner: process.env.CARD_OWNER || 'Isxakova A.',
        expires_in: 300, // 5 minutes
      },
    });
  } catch (err) {
    console.error('[SMS] createPayment error:', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * GET /api/sms/check-payment/:payment_id
 * Bot polls this to check if payment was received
 */
const checkPayment = async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.payment_id);
    if (!payment) {
      return res.status(404).json({ success: false, error: 'Payment not found' });
    }

    return res.json({
      success: true,
      data: {
        status: payment.status,
        amount_uzs: payment.amount_uzs,
        telegram_id: payment.telegram_id,
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

module.exports = { incomingSms, createPayment, checkPayment };
