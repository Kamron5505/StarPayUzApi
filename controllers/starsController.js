const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const Order = require('../models/Order');
const Transaction = require('../models/Transaction');
const { sendStars, sendStarGift } = require('../services/starsService');

// Validation rules
const sendStarsValidation = [
  body('telegram_user_id')
    .notEmpty().withMessage('telegram_user_id is required')
    .isString().withMessage('telegram_user_id must be a string'),
  body('amount')
    .notEmpty().withMessage('amount is required')
    .isInt({ min: 50, max: 5000 }).withMessage('amount must be between 50 and 5000'),
];

/**
 * POST /api/send-stars
 * Deducts balance and sends stars to a Telegram user.
 */
const sendStarsHandler = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ success: false, errors: errors.array() });
    }

    const { telegram_user_id, amount } = req.body;
    const user = req.user;

    // Check sufficient balance
    if (user.balance < amount) {
      return res.status(402).json({
        success: false,
        error: 'Insufficient balance.',
        data: { balance: user.balance, required: amount },
      });
    }

    // Create order in pending state
    const order = await Order.create({
      user: user._id,
      telegram_user_id: String(telegram_user_id),
      amount,
      status: 'pending',
    });

    // Deduct balance atomically
    const balanceBefore = user.balance;
    user.balance -= amount;
    await user.save();

    // Record debit transaction
    const transaction = await Transaction.create({
      user: user._id,
      type: 'debit',
      amount,
      balance_before: balanceBefore,
      balance_after: user.balance,
      description: `Sent ${amount} stars to Telegram user ${telegram_user_id}`,
      order: order._id,
    });

    // Update order to processing
    order.status = 'processing';
    await order.save();

    // Call stars service
    const result = await sendStars(String(telegram_user_id), amount);

    if (result.success) {
      order.status = 'success';
      order.external_id = result.external_id;
      await order.save();

      return res.json({
        success: true,
        message: `Successfully sent ${amount} stars.`,
        data: {
          order_id: order._id,
          external_id: result.external_id,
          telegram_user_id,
          amount,
          balance_remaining: user.balance,
          transaction_id: transaction._id,
        },
      });
    } else {
      // Rollback balance on failure
      user.balance += amount;
      await user.save();

      order.status = 'failed';
      order.error_message = result.error;
      await order.save();

      // Record credit (refund) transaction
      await Transaction.create({
        user: user._id,
        type: 'credit',
        amount,
        balance_before: user.balance - amount,
        balance_after: user.balance,
        description: `Refund: failed to send ${amount} stars to ${telegram_user_id}`,
        order: order._id,
      });

      return res.status(502).json({
        success: false,
        error: 'Failed to send stars. Balance has been refunded.',
        data: { order_id: order._id, reason: result.error },
      });
    }
  } catch (err) {
    next(err);
  }
};

// ── Send Gift ─────────────────────────────────────────────────────────────────

const sendGiftValidation = [
  body('telegram_user_id').notEmpty().withMessage('telegram_user_id is required'),
];

/**
 * POST /api/send-gift
 * Sends a star gift to a Telegram user (deducts stars from balance)
 */
const sendGiftHandler = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ success: false, errors: errors.array() });
    }

    const { telegram_user_id, gift_id } = req.body;
    const user = req.user;

    const result = await sendStarGift(String(telegram_user_id), gift_id || null);

    if (result.success) {
      // Record transaction
      const Transaction = require('../models/Transaction');
      const Order = require('../models/Order');

      const order = await Order.create({
        user: user._id,
        telegram_user_id: String(telegram_user_id),
        amount: result.stars || 0,
        status: 'success',
        external_id: result.external_id,
      });

      if (result.stars && user.balance >= result.stars) {
        const before = user.balance;
        user.balance -= result.stars;
        await user.save();
        await Transaction.create({
          user: user._id,
          type: 'debit',
          amount: result.stars,
          balance_before: before,
          balance_after: user.balance,
          description: `Gift sent to ${telegram_user_id}`,
          order: order._id,
        });
      }

      return res.json({
        success: true,
        message: 'Gift sent successfully.',
        data: {
          telegram_user_id,
          gift_id: result.gift_id,
          stars: result.stars,
          external_id: result.external_id,
        },
      });
    } else {
      return res.status(502).json({
        success: false,
        error: result.error,
      });
    }
  } catch (err) {
    next(err);
  }
};

module.exports = { sendStarsHandler, sendStarsValidation, sendGiftHandler, sendGiftValidation };
