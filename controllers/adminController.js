const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const BotUser = require('../models/BotUser');
const Transaction = require('../models/Transaction');
const { v4: uuidv4 } = require('uuid');

// ── Create API Key ────────────────────────────────────────────────────────────

const createUserValidation = [
  body('username').notEmpty().withMessage('username is required').trim(),
];

/**
 * POST /api/admin/users
 * Creates a new user and generates an API key.
 */
const createUser = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ success: false, errors: errors.array() });
    }

    const { username, initial_balance = 0 } = req.body;

    const existing = await User.findOne({ username });
    if (existing) {
      return res.status(409).json({ success: false, error: 'Username already exists.' });
    }

    const user = await User.create({
      username,
      balance: Math.max(0, parseInt(initial_balance) || 0),
    });

    return res.status(201).json({
      success: true,
      message: 'User created successfully.',
      data: {
        id: user._id,
        username: user.username,
        api_key: user.api_key,
        balance: user.balance,
        created_at: user.createdAt,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ── Top Up Balance ────────────────────────────────────────────────────────────

const topUpValidation = [
  body('username').notEmpty().withMessage('username is required'),
  body('amount').isInt({ min: 1 }).withMessage('amount must be a positive integer'),
];

/**
 * POST /api/admin/topup
 * Adds balance to a user account (API user by username OR bot user by telegram_id)
 */
const topUpBalance = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ success: false, errors: errors.array() });
    }

    const { username, telegram_id, amount, description = 'Admin top-up' } = req.body;
    const amountInt = parseInt(amount);

    // Bot user topup by telegram_id, username or user_number
    if (telegram_id || username) {
      let botUser = null;

      if (telegram_id) {
        // Try as telegram_id first
        botUser = await BotUser.findOne({ telegram_id: String(telegram_id) });
        // Try as user_number
        if (!botUser && !isNaN(telegram_id)) {
          botUser = await BotUser.findOne({ user_number: parseInt(telegram_id) });
        }
      } else if (username) {
        botUser = await BotUser.findOne({ username: username.replace('@', '') });
        // Try as user_number
        if (!botUser && !isNaN(username)) {
          botUser = await BotUser.findOne({ user_number: parseInt(username) });
        }
        // Try as telegram_id
        if (!botUser) {
          botUser = await BotUser.findOne({ telegram_id: username });
        }
      }

      if (botUser) {
        const before = botUser.balance_uzs;
        botUser.balance_uzs += amountInt;
        await botUser.save();

        return res.json({
          success: true,
          message: `Added ${amountInt.toLocaleString()} UZS to bot user ${botUser.telegram_id}.`,
          data: {
            telegram_id: botUser.telegram_id,
            balance_before: before,
            balance_after: botUser.balance_uzs,
          },
        });
      }
    }

    // Fallback: API user topup by username
    if (username) {
      const user = await User.findOne({ username });
      if (!user) {
        return res.status(404).json({ success: false, error: 'User not found.' });
      }

      const balanceBefore = user.balance;
      user.balance += amountInt;
      await user.save();

      await Transaction.create({
        user: user._id,
        type: 'credit',
        amount: amountInt,
        balance_before: balanceBefore,
        balance_after: user.balance,
        description,
      });

      return res.json({
        success: true,
        message: `Added ${amountInt} stars to ${username}.`,
        data: { username: user.username, balance_before: balanceBefore, balance_after: user.balance },
      });
    }

    return res.status(404).json({ success: false, error: 'User not found.' });
  } catch (err) {
    next(err);
  }
};

// ── List Users ────────────────────────────────────────────────────────────────

/**
 * GET /api/admin/users
 * Returns all users.
 */
const listUsers = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      User.find({}, '-__v').sort({ createdAt: -1 }).skip(skip).limit(limit),
      User.countDocuments(),
    ]);

    return res.json({
      success: true,
      data: {
        users,
        pagination: { total, page, limit, pages: Math.ceil(total / limit) },
      },
    });
  } catch (err) {
    next(err);
  }
};

// ── Regenerate API Key ────────────────────────────────────────────────────────

/**
 * POST /api/admin/users/:username/regenerate-key
 * Generates a new API key for a user.
 */
const regenerateApiKey = async (req, res, next) => {
  try {
    const user = await User.findOne({ username: req.params.username });
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found.' });
    }

    user.api_key = uuidv4().replace(/-/g, '');
    await user.save();

    return res.json({
      success: true,
      message: 'API key regenerated.',
      data: { username: user.username, api_key: user.api_key },
    });
  } catch (err) {
    next(err);
  }
};

// ── Toggle User Active ────────────────────────────────────────────────────────

/**
 * PATCH /api/admin/users/:username/toggle
 * Activates or deactivates a user.
 */
const toggleUser = async (req, res, next) => {
  try {
    const user = await User.findOne({ username: req.params.username });
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found.' });
    }

    user.is_active = !user.is_active;
    await user.save();

    return res.json({
      success: true,
      message: `User ${user.is_active ? 'activated' : 'deactivated'}.`,
      data: { username: user.username, is_active: user.is_active },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createUser,
  createUserValidation,
  topUpBalance,
  topUpValidation,
  listUsers,
  regenerateApiKey,
  toggleUser,
};
