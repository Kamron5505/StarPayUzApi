const crypto = require('crypto');
const BotUser = require('../models/BotUser');
const Payment = require('../models/Payment');

const CLICK_SECRET = process.env.CLICK_SECRET_KEY;
const CLICK_SERVICE_ID = process.env.CLICK_SERVICE_ID;

// Click action types
const ACTION_PREPARE = 0;
const ACTION_COMPLETE = 1;

// Click error codes
const ERRORS = {
  SUCCESS: 0,
  SIGN_FAILED: -1,
  INVALID_AMOUNT: -2,
  ACTION_NOT_FOUND: -3,
  ALREADY_PAID: -4,
  USER_NOT_FOUND: -5,
  TRANSACTION_NOT_FOUND: -6,
  FAILED: -9,
};

/**
 * Verify Click signature
 */
const verifySign = (params, action) => {
  const { click_trans_id, service_id, click_paydoc_id, merchant_trans_id, amount, action: act, sign_time, sign_string } = params;

  const signString = action === ACTION_PREPARE
    ? `${click_trans_id}${service_id}${CLICK_SECRET}${merchant_trans_id}${amount}${act}${sign_time}`
    : `${click_trans_id}${service_id}${CLICK_SECRET}${merchant_trans_id}${params.merchant_prepare_id || ''}${amount}${act}${sign_time}`;

  const hash = crypto.createHash('md5').update(signString).digest('hex');
  return hash === sign_string;
};

/**
 * POST /api/click/prepare
 * Step 1: Click checks if the order is valid
 */
const prepare = async (req, res) => {
  try {
    const {
      click_trans_id,
      service_id,
      click_paydoc_id,
      merchant_trans_id, // this is telegram_id
      amount,
      action,
      sign_time,
      sign_string,
    } = req.body;

    // Verify signature
    if (!verifySign(req.body, ACTION_PREPARE)) {
      return res.json({
        error: ERRORS.SIGN_FAILED,
        error_note: 'Invalid sign',
        click_trans_id,
        merchant_trans_id,
      });
    }

    // Find bot user by telegram_id
    const botUser = await BotUser.findOne({ telegram_id: String(merchant_trans_id) });
    if (!botUser) {
      return res.json({
        error: ERRORS.USER_NOT_FOUND,
        error_note: 'User not found',
        click_trans_id,
        merchant_trans_id,
      });
    }

    // Validate amount (minimum 1000 UZS)
    if (parseFloat(amount) < 1000) {
      return res.json({
        error: ERRORS.INVALID_AMOUNT,
        error_note: 'Amount too small',
        click_trans_id,
        merchant_trans_id,
      });
    }

    // Create pending payment
    const payment = await Payment.create({
      bot_user: botUser._id,
      telegram_id: String(merchant_trans_id),
      amount_uzs: Math.round(parseFloat(amount)),
      provider: 'click',
      provider_transaction_id: String(click_trans_id),
      status: 'pending',
    });

    return res.json({
      error: ERRORS.SUCCESS,
      error_note: 'Success',
      click_trans_id,
      merchant_trans_id,
      merchant_prepare_id: payment._id.toString(),
    });
  } catch (err) {
    console.error('[Click Prepare Error]', err.message);
    return res.json({ error: ERRORS.FAILED, error_note: 'Internal error' });
  }
};

/**
 * POST /api/click/complete
 * Step 2: Click confirms the payment
 */
const complete = async (req, res) => {
  try {
    const {
      click_trans_id,
      service_id,
      click_paydoc_id,
      merchant_trans_id,
      merchant_prepare_id,
      amount,
      action,
      error,
      error_note,
      sign_time,
      sign_string,
    } = req.body;

    // Verify signature
    if (!verifySign(req.body, ACTION_COMPLETE)) {
      return res.json({
        error: ERRORS.SIGN_FAILED,
        error_note: 'Invalid sign',
        click_trans_id,
        merchant_trans_id,
      });
    }

    // Find payment
    const payment = await Payment.findById(merchant_prepare_id);
    if (!payment) {
      return res.json({
        error: ERRORS.TRANSACTION_NOT_FOUND,
        error_note: 'Transaction not found',
        click_trans_id,
        merchant_trans_id,
      });
    }

    // Already processed
    if (payment.status === 'success') {
      return res.json({
        error: ERRORS.ALREADY_PAID,
        error_note: 'Already paid',
        click_trans_id,
        merchant_trans_id,
        merchant_confirm_id: payment._id.toString(),
      });
    }

    // Click reported an error
    if (parseInt(error) < 0) {
      payment.status = 'failed';
      payment.error_note = error_note;
      await payment.save();

      return res.json({
        error: ERRORS.SUCCESS,
        error_note: 'Success',
        click_trans_id,
        merchant_trans_id,
        merchant_confirm_id: payment._id.toString(),
      });
    }

    // Credit user balance
    const botUser = await BotUser.findOne({ telegram_id: String(merchant_trans_id) });
    if (!botUser) {
      return res.json({
        error: ERRORS.USER_NOT_FOUND,
        error_note: 'User not found',
        click_trans_id,
        merchant_trans_id,
      });
    }

    botUser.balance_uzs += Math.round(parseFloat(amount));
    await botUser.save();

    payment.status = 'success';
    await payment.save();

    console.log(`[Click] Payment success: ${amount} UZS credited to Telegram user ${merchant_trans_id}`);

    return res.json({
      error: ERRORS.SUCCESS,
      error_note: 'Success',
      click_trans_id,
      merchant_trans_id,
      merchant_confirm_id: payment._id.toString(),
    });
  } catch (err) {
    console.error('[Click Complete Error]', err.message);
    return res.json({ error: ERRORS.FAILED, error_note: 'Internal error' });
  }
};

module.exports = { prepare, complete };
