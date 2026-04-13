const { body, validationResult } = require('express-validator');
const Order = require('../models/Order');
const Transaction = require('../models/Transaction');
const { getPremiumPricing, sendPremium } = require('../services/premiumService');

const PREMIUM_PRICES_USD = { 3: 14.99, 6: 19.99, 12: 35.99 };

// Validation
const sendPremiumValidation = [
  body('username').notEmpty().withMessage('username is required').isString(),
  body('duration').isIn([3, 6, 12]).withMessage('duration must be 3, 6, or 12'),
];

/**
 * POST /api/premium/pricing
 * Returns current Telegram Premium pricing
 */
const getPremiumPricingHandler = async (req, res, next) => {
  try {
    const result = await getPremiumPricing();
    if (!result.success) {
      return res.status(502).json({ success: false, error: result.error });
    }
    return res.json({ success: true, data: result.result });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/premium/send
 * Deducts balance and sends Telegram Premium to a user by username
 */
const sendPremiumHandler = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ success: false, errors: errors.array() });
    }

    const { username, duration } = req.body;
    const user = req.user;
    const cost = PREMIUM_PRICES_USD[duration];

    if (user.balance < cost) {
      return res.status(402).json({
        success: false,
        error: 'Insufficient balance.',
        data: { balance: user.balance, required: cost },
      });
    }

    // Create order
    const order = await Order.create({
      user: user._id,
      telegram_user_id: username,
      amount: cost,
      status: 'pending',
      type: 'premium',
    });

    // Deduct balance
    const balanceBefore = user.balance;
    user.balance -= cost;
    await user.save();

    const transaction = await Transaction.create({
      user: user._id,
      type: 'debit',
      amount: cost,
      balance_before: balanceBefore,
      balance_after: user.balance,
      description: `Sent ${duration}mo Telegram Premium to @${username}`,
      order: order._id,
    });

    order.status = 'processing';
    await order.save();

    const result = await sendPremium(username, duration);

    if (result.success) {
      order.status = 'success';
      order.external_id = result.external_id;
      await order.save();

      return res.json({
        success: true,
        message: `Successfully sent ${duration}-month Telegram Premium to @${username}.`,
        data: {
          order_id: order._id,
          external_id: result.external_id,
          username,
          duration,
          cost,
          balance_remaining: user.balance,
          transaction_id: transaction._id,
        },
      });
    } else {
      // Rollback
      user.balance += cost;
      await user.save();

      order.status = 'failed';
      order.error_message = result.error;
      await order.save();

      await Transaction.create({
        user: user._id,
        type: 'credit',
        amount: cost,
        balance_before: user.balance - cost,
        balance_after: user.balance,
        description: `Refund: failed to send ${duration}mo Premium to @${username}`,
        order: order._id,
      });

      return res.status(502).json({
        success: false,
        error: 'Failed to send Premium. Balance has been refunded.',
        data: { order_id: order._id, reason: result.error },
      });
    }
  } catch (err) {
    next(err);
  }
};

module.exports = { getPremiumPricingHandler, sendPremiumHandler, sendPremiumValidation };
