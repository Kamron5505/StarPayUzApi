const { body, validationResult } = require('express-validator');
const BotUser = require('../models/BotUser');
const Order = require('../models/Order');
const Transaction = require('../models/Transaction');
const { sendStars } = require('../services/starsService');
const { getPriceForStars, getCustomPrice, STAR_PACKAGES } = require('../config/prices');

// ── Register / Get Bot User ───────────────────────────────────────────────────

/**
 * POST /api/bot/user
 * Register or get existing bot user by telegram_id
 */
const getOrCreateBotUser = async (req, res, next) => {
  try {
    const { telegram_id, username, full_name } = req.body;

    if (!telegram_id) {
      return res.status(422).json({ success: false, error: 'telegram_id is required' });
    }

    let user = await BotUser.findOne({ telegram_id: String(telegram_id) });

    if (!user) {
      // Get next user number
      const count = await BotUser.countDocuments();
      user = await BotUser.create({
        telegram_id: String(telegram_id),
        username: username || null,
        full_name: full_name || '',
        user_number: count + 1,
      });
    } else {
      // Update username/name if changed
      if (username) user.username = username;
      if (full_name) user.full_name = full_name;
      await user.save();
    }

    return res.json({
      success: true,
      data: {
        telegram_id: user.telegram_id,
        user_number: user.user_number,
        username: user.username,
        full_name: user.full_name,
        balance_uzs: user.balance_uzs,
        total_stars_bought: user.total_stars_bought,
        is_banned: user.is_banned,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ── Get Balance ───────────────────────────────────────────────────────────────

/**
 * GET /api/bot/user/:telegram_id/balance
 */
const getBotUserBalance = async (req, res, next) => {
  try {
    const user = await BotUser.findOne({ telegram_id: req.params.telegram_id });

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found.' });
    }

    return res.json({
      success: true,
      data: {
        telegram_id: user.telegram_id,
        user_number: user.user_number,
        balance_uzs: user.balance_uzs,
        total_stars_bought: user.total_stars_bought,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ── Buy Stars ─────────────────────────────────────────────────────────────────

const buyStarsValidation = [
  body('telegram_id').notEmpty().withMessage('telegram_id is required'),
  body('stars').isInt({ min: 50, max: 5000 }).withMessage('stars must be between 50 and 5000'),
];

/**
 * POST /api/bot/buy-stars
 * Deducts UZS balance and sends stars to the user
 */
const buyStars = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ success: false, errors: errors.array() });
    }

    const { telegram_id, stars } = req.body;
    const starsCount = parseInt(stars);

    // Get price
    const price = getPriceForStars(starsCount) || getCustomPrice(starsCount);

    // Get bot user
    const botUser = await BotUser.findOne({ telegram_id: String(telegram_id) });
    if (!botUser) {
      return res.status(404).json({ success: false, error: 'User not found. Register first.' });
    }

    if (botUser.is_banned) {
      return res.status(403).json({ success: false, error: 'User is banned.' });
    }

    // Check UZS balance
    if (botUser.balance_uzs < price) {
      return res.status(402).json({
        success: false,
        error: 'Insufficient balance.',
        data: {
          balance_uzs: botUser.balance_uzs,
          required_uzs: price,
          shortage_uzs: price - botUser.balance_uzs,
        },
      });
    }

    // Check API balance (stars)
    const apiUser = req.user;
    if (apiUser.balance < starsCount) {
      return res.status(503).json({
        success: false,
        error: 'Service temporarily unavailable. Please try again later.',
      });
    }

    // Create order
    const order = await Order.create({
      user: apiUser._id,
      telegram_user_id: String(telegram_id),
      amount: starsCount,
      status: 'pending',
    });

    // Deduct UZS from bot user
    const uzsBefore = botUser.balance_uzs;
    botUser.balance_uzs -= price;
    botUser.total_spent_uzs += price;
    await botUser.save();

    // Deduct stars from API user balance
    const starsBefore = apiUser.balance;
    apiUser.balance -= starsCount;
    await apiUser.save();

    // Record transaction
    const transaction = await Transaction.create({
      user: apiUser._id,
      type: 'debit',
      amount: starsCount,
      balance_before: starsBefore,
      balance_after: apiUser.balance,
      description: `Bot purchase: ${starsCount} stars for Telegram user ${telegram_id} (${price} UZS)`,
      order: order._id,
    });

    // Send stars via Fragment
    order.status = 'processing';
    await order.save();

    const result = await sendStars(String(telegram_id), starsCount);

    if (result.success) {
      order.status = 'success';
      order.external_id = result.external_id;
      await order.save();

      botUser.total_stars_bought += starsCount;
      await botUser.save();

      return res.json({
        success: true,
        message: `Successfully sent ${starsCount} stars.`,
        data: {
          telegram_id,
          stars_sent: starsCount,
          price_uzs: price,
          balance_uzs_remaining: botUser.balance_uzs,
          order_id: order._id,
          external_id: result.external_id,
        },
      });
    } else {
      // Rollback
      botUser.balance_uzs += price;
      botUser.total_spent_uzs -= price;
      await botUser.save();

      apiUser.balance += starsCount;
      await apiUser.save();

      order.status = 'failed';
      order.error_message = result.error;
      await order.save();

      return res.status(502).json({
        success: false,
        error: 'Failed to send stars. Your balance has been refunded.',
        data: { order_id: order._id },
      });
    }
  } catch (err) {
    next(err);
  }
};

// ── Price List ────────────────────────────────────────────────────────────────

/**
 * GET /api/bot/prices
 */
const getPrices = async (req, res) => {
  return res.json({
    success: true,
    data: { packages: STAR_PACKAGES },
  });
};

module.exports = {
  getOrCreateBotUser,
  getBotUserBalance,
  buyStars,
  buyStarsValidation,
  getPrices,
};
