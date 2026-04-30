const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const Order = require('../models/Order');
const Transaction = require('../models/Transaction');
const { sendStars, getUserInfo, getStarsPricing, getWalletBalance } = require('../services/starsService');

// Validation rules
const sendStarsValidation = [
  body('username').notEmpty().withMessage('username is required').isString(),
  body('amount')
    .notEmpty().withMessage('amount is required')
    .isInt({ min: 50, max: 100000 }).withMessage('amount must be between 50 and 100000'),
];

/**
 * POST /api/stars/pricing
 * Returns Stars price for a given amount
 */
const getStarsPricingHandler = async (req, res, next) => {
  try {
    const amount = parseInt(req.body.amount) || 50;
    const result = await getStarsPricing(amount);
    if (!result.success) {
      return res.status(502).json({ success: false, error: result.error });
    }
    return res.json({ success: true, data: result.result });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/stars/user-info
 * Returns Telegram user info by username
 */
const getUserInfoHandler = async (req, res, next) => {
  try {
    const { username } = req.body;
    if (!username) return res.status(422).json({ success: false, error: 'username is required' });
    const result = await getUserInfo(username);
    if (!result.success) return res.status(502).json({ success: false, error: result.error });
    return res.json({ success: true, data: result.result });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/stars/wallet-balance
 * Returns TON wallet balance
 */
const getWalletBalanceHandler = async (req, res, next) => {
  try {
    const result = await getWalletBalance();
    if (!result.success) {
      return res.status(502).json({ success: false, error: result.error });
    }
    return res.json({ 
      success: true, 
      data: {
        balance: result.result.balance,
        balance_ton: result.result.balance,
        status: result.result.balance > 0.1 ? 'OK' : 'LOW',
        message: result.result.balance > 0.1 ? 'Sufficient balance' : 'Low balance - may fail to send stars'
      }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/stars/send
 * Deducts balance and sends stars to a Telegram user by username.
 */
const sendStarsHandler = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ success: false, errors: errors.array() });
    }

    const { username, amount } = req.body;
    const user = req.user;

    if (user.balance < amount) {
      return res.status(402).json({
        success: false,
        error: 'Insufficient balance.',
        data: { balance: user.balance, required: amount },
      });
    }

    // Create order
    const order = await Order.create({
      user: user._id,
      telegram_user_id: username,
      amount,
      status: 'pending',
    });

    // Deduct balance
    const balanceBefore = user.balance;
    user.balance -= amount;
    await user.save();

    const transaction = await Transaction.create({
      user: user._id,
      type: 'debit',
      amount,
      balance_before: balanceBefore,
      balance_after: user.balance,
      description: `Sent ${amount} stars to @${username}`,
      order: order._id,
    });

    order.status = 'processing';
    await order.save();

    const result = await sendStars(username, amount);

    if (result.success) {
      order.status = 'success';
      order.external_id = result.external_id;
      await order.save();

      return res.json({
        success: true,
        message: `Successfully sent ${amount} stars to @${username}.`,
        data: {
          order_id: order._id,
          external_id: result.external_id,
          username,
          amount,
          balance_remaining: user.balance,
          transaction_id: transaction._id,
        },
      });
    } else {
      // Rollback
      user.balance += amount;
      await user.save();

      order.status = 'failed';
      order.error_message = result.error;
      await order.save();

      await Transaction.create({
        user: user._id,
        type: 'credit',
        amount,
        balance_before: user.balance - amount,
        balance_after: user.balance,
        description: `Refund: failed to send ${amount} stars to @${username}`,
        order: order._id,
      });

      // Check if error is about wallet balance
      const isWalletError = result.error.toLowerCase().includes('wallet') || 
                           result.error.toLowerCase().includes('insufficient');
      
      return res.status(502).json({
        success: false,
        error: isWalletError 
          ? `Wallet error: ${result.error}. Please top up the TON wallet.`
          : `Failed to send stars. Balance has been refunded.`,
        data: { 
          order_id: order._id, 
          reason: result.error,
          is_wallet_error: isWalletError,
          hint: isWalletError ? 'Check /api/stars/wallet-balance endpoint' : null
        },
      });
    }
  } catch (err) {
    next(err);
  }
};

module.exports = {
  sendStarsHandler,
  sendStarsValidation,
  getStarsPricingHandler,
  getUserInfoHandler,
  getWalletBalanceHandler,
};
