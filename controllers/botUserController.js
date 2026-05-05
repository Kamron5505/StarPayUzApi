const { body, validationResult } = require('express-validator');
const BotUser = require('../models/BotUser');
const Order = require('../models/Order');
const Transaction = require('../models/Transaction');
const { sendStars } = require('../services/starsService');
const { sendPremium } = require('../services/premiumService');
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
    // Support both GET and POST
    const telegram_id = req.params.telegram_id || req.body.telegram_id;
    
    if (!telegram_id) {
      return res.status(422).json({ success: false, error: 'telegram_id is required' });
    }

    const user = await BotUser.findOne({ telegram_id: String(telegram_id) });

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
  body('stars').optional().isInt({ min: 50, max: 5000 }).withMessage('stars must be between 50 and 5000'),
  body('stars_count').optional().isInt({ min: 50, max: 5000 }).withMessage('stars_count must be between 50 and 5000'),
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

    // Support both 'stars' and 'stars_count' parameters
    const { telegram_id, username } = req.body;
    const starsCount = parseInt(req.body.stars || req.body.stars_count);

    if (!starsCount || starsCount < 50 || starsCount > 5000) {
      return res.status(422).json({ success: false, error: 'stars_count must be between 50 and 5000' });
    }

    // Get bot user
    const botUser = await BotUser.findOne({ telegram_id: String(telegram_id) });
    if (!botUser) {
      return res.status(404).json({ success: false, error: 'User not found. Register first.' });
    }

    if (botUser.is_banned) {
      return res.status(403).json({ success: false, error: 'User is banned.' });
    }

    // Get price
    const price = getPriceForStars(starsCount) || getCustomPrice(starsCount);

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

    // If username is not provided, use telegram_id as fallback
    const targetUsername = username || botUser.username || String(telegram_id);

    // Reject numeric-only usernames if username was explicitly provided
    if (username && /^\d+$/.test(username)) {
      return res.status(422).json({ success: false, error: 'User does not have a Telegram username. Cannot send stars.' });
    }

    // Create order
    const order = await Order.create({
      user: botUser._id,
      telegram_user_id: String(telegram_id),
      amount: starsCount,
      status: 'pending',
    });

    // Deduct UZS from bot user
    const uzsBefore = botUser.balance_uzs;
    botUser.balance_uzs -= price;
    botUser.total_spent_uzs += price;
    await botUser.save();

    // Create transaction
    await Transaction.create({
      user: botUser._id,
      order: order._id,
      type: 'debit',
      amount: price,
      description: `Bought ${starsCount} stars`,
    });

    // Send stars via Fragment
    order.status = 'processing';
    await order.save();

    const result = await sendStars(targetUsername, starsCount);

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
        },
      });
    } else {
      // Refund on failure
      botUser.balance_uzs += price;
      botUser.total_spent_uzs -= price;
      await botUser.save();

      order.status = 'failed';
      await order.save();

      return res.status(500).json({
        success: false,
        error: result.error || 'Failed to send stars',
        data: {
          balance_uzs_refunded: botUser.balance_uzs,
        },
      });
    }
  } catch (err) {
    next(err);
  }
};

// ── Buy Premium ───────────────────────────────────────────────────────────────

/**
 * POST /api/bot/buy-premium
 */
const buyPremium = async (req, res, next) => {
  try {
    const { telegram_id, username, months, price } = req.body;

    if (!telegram_id || !username || !months || !price) {
      return res.status(422).json({ success: false, error: 'telegram_id, username, months and price are required' });
    }

    const botUser = await BotUser.findOne({ telegram_id: String(telegram_id) });
    if (!botUser) return res.status(404).json({ success: false, error: 'User not found.' });
    if (botUser.is_banned) return res.status(403).json({ success: false, error: 'User is banned.' });

    const cost = parseInt(price);
    if (botUser.balance_uzs < cost) {
      return res.status(402).json({
        success: false,
        error: 'Insufficient balance.',
        data: { balance_uzs: botUser.balance_uzs, required_uzs: cost },
      });
    }

    // Create order
    const order = await Order.create({
      user: botUser._id,
      telegram_user_id: String(telegram_id),
      amount: cost,
      status: 'pending',
      type: 'premium',
    });

    // Deduct balance
    botUser.balance_uzs -= cost;
    await botUser.save();

    // Send premium via Fragment API
    order.status = 'processing';
    await order.save();

    const result = await sendPremium(username, parseInt(months));

    if (result.success) {
      order.status = 'success';
      order.external_id = result.external_id;
      await order.save();
      return res.json({
        success: true,
        message: `Successfully sent ${months}-month Premium to @${username}.`,
        data: {
          telegram_id, username, months, price_uzs: cost,
          balance_uzs_remaining: botUser.balance_uzs,
          order_id: order._id, external_id: result.external_id,
        },
      });
    } else {
      botUser.balance_uzs += cost;
      await botUser.save();
      order.status = 'failed';
      order.error_message = result.error;
      await order.save();
      return res.status(502).json({ success: false, error: result.error || 'Failed to send Premium. Balance refunded.' });
    }
  } catch (err) {
    next(err);
  }
};

// ── Buy Gift ──────────────────────────────────────────────────────────────────

const buyGift = async (req, res, next) => {
  try {
    // Support both old and new parameter names
    const telegram_id = req.body.telegram_id;
    const target_username = req.body.target_username || req.body.username;
    const gift_name = req.body.gift_name;
    const price = req.body.price || 50000; // Default gift price
    const stars_count = req.body.stars_count;

    if (!telegram_id || !target_username || !gift_name) {
      return res.status(422).json({ success: false, error: 'telegram_id, target_username (or username), and gift_name required' });
    }

    const cost = parseInt(price);
    const botUser = await BotUser.findOne({ telegram_id: String(telegram_id) });
    
    if (!botUser) {
      return res.status(404).json({ success: false, error: 'User not found.' });
    }

    if (botUser.balance_uzs < cost) {
      return res.status(402).json({
        success: false,
        error: 'Insufficient balance.',
        data: {
          balance_uzs: botUser.balance_uzs,
          required_uzs: cost,
          shortage_uzs: cost - botUser.balance_uzs,
        },
      });
    }

    // Create order
    const order = await Order.create({
      user: botUser._id,
      telegram_user_id: String(telegram_id),
      amount: cost,
      status: 'success',
      type: 'gift',
    });

    // Create transaction
    await Transaction.create({
      user: botUser._id,
      order: order._id,
      type: 'debit',
      amount: cost,
      description: `Gift: ${gift_name} to @${target_username}`,
    });

    botUser.balance_uzs -= cost;
    await botUser.save();

    return res.json({
      success: true,
      message: `Gift '${gift_name}' sent to @${target_username}.`,
      data: {
        telegram_id,
        target_username,
        gift_name,
        price: cost,
        balance_uzs_remaining: botUser.balance_uzs,
        order_id: order._id,
      },
    });
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
  buyPremium,
  buyGift,
  getPrices,
};
