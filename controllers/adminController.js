const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const BotUser = require('../models/BotUser');
const Transaction = require('../models/Transaction');
const Setting = require('../models/Setting');
const { v4: uuidv4 } = require('uuid');

// ── Create API Key ────────────────────────────────────────────────────────────

const createUserValidation = [
  body('username').notEmpty().withMessage('username is required').trim(),
];

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

const topUpBalance = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ success: false, errors: errors.array() });
    }

    const { username, telegram_id, amount, description = 'Admin top-up' } = req.body;
    const amountInt = parseInt(amount);

    if (telegram_id || username) {
      let botUser = null;

      if (telegram_id) {
        botUser = await BotUser.findOne({ telegram_id: String(telegram_id) });
        if (!botUser && !isNaN(telegram_id)) {
          botUser = await BotUser.findOne({ user_number: parseInt(telegram_id) });
        }
      } else if (username) {
        botUser = await BotUser.findOne({ username: username.replace('@', '') });
        if (!botUser && !isNaN(username)) {
          botUser = await BotUser.findOne({ user_number: parseInt(username) });
        }
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

// ── Deduct Balance ────────────────────────────────────────────────────────────

const deductValidation = [
  body('username').notEmpty().withMessage('username or telegram_id is required'),
  body('amount').isInt({ min: 1 }).withMessage('amount must be a positive integer'),
];

const deductBalance = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ success: false, errors: errors.array() });
    }

    const { username, telegram_id, amount } = req.body;
    const amountInt = parseInt(amount);

    let botUser = null;
    const query = telegram_id || username;

    botUser = await BotUser.findOne({ telegram_id: String(query) });
    if (!botUser && !isNaN(query)) {
      botUser = await BotUser.findOne({ user_number: parseInt(query) });
    }
    if (!botUser) {
      botUser = await BotUser.findOne({ username: String(query).replace('@', '') });
    }

    if (!botUser) {
      return res.status(404).json({ success: false, error: 'User not found.' });
    }

    if (botUser.balance_uzs < amountInt) {
      return res.status(400).json({
        success: false,
        error: `Insufficient balance. Current: ${botUser.balance_uzs.toLocaleString()} UZS`,
      });
    }

    const before = botUser.balance_uzs;
    botUser.balance_uzs -= amountInt;
    await botUser.save();

    return res.json({
      success: true,
      message: `Deducted ${amountInt.toLocaleString()} UZS from user ${botUser.telegram_id}.`,
      data: {
        telegram_id: botUser.telegram_id,
        username: botUser.username,
        balance_before: before,
        balance_after: botUser.balance_uzs,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ── Broadcast ─────────────────────────────────────────────────────────────────

const broadcast = async (req, res, next) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(422).json({ success: false, error: 'text required' });

    const BOT_TOKEN = process.env.BOT_TOKEN;
    if (!BOT_TOKEN) return res.status(500).json({ success: false, error: 'BOT_TOKEN not set' });

    const users = await BotUser.find({}, 'telegram_id').lean();
    console.log(`[Broadcast] Found ${users.length} users`);
    
    const axios = require('axios');

    let sent = 0, failed = 0;
    for (const user of users) {
      try {
        if (!user.telegram_id) {
          console.log(`[Broadcast] Skipping user with empty telegram_id`);
          failed++;
          continue;
        }
        
        await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
          chat_id: user.telegram_id,
          text,
          parse_mode: 'HTML',
        });
        sent++;
        console.log(`[Broadcast] Sent to ${user.telegram_id}`);
      } catch (e) {
        failed++;
        console.log(`[Broadcast] Failed to send to ${user.telegram_id}: ${e.message}`);
      }
      await new Promise(r => setTimeout(r, 35));
    }

    console.log(`[Broadcast] Complete: ${sent} sent, ${failed} failed`);
    return res.json({ success: true, sent, failed, total: users.length });
  } catch (err) { next(err); }
};

const clearAllOrders = async (req, res, next) => {
  try {
    const Order = require('../models/Order');
    const result = await Order.deleteMany({});
    return res.json({ success: true, message: `${result.deletedCount} ta buyurtma o'chirildi.` });
  } catch (err) { next(err); }
};

const listAllOrders = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const skip = (page - 1) * limit;
    const Order = require('../models/Order');

    const filter = {};
    if (req.query.status) filter.status = req.query.status;

    const [orders, total] = await Promise.all([
      Order.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Order.countDocuments(filter),
    ]);

    return res.json({
      success: true,
      data: { orders, pagination: { total, page, limit, pages: Math.ceil(total / limit) } },
    });
  } catch (err) { next(err); }
};

const listAllTransactions = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    const [txs, total] = await Promise.all([
      Transaction.find({}).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Transaction.countDocuments(),
    ]);

    return res.json({
      success: true,
      data: { transactions: txs, pagination: { total, page, limit, pages: Math.ceil(total / limit) } },
    });
  } catch (err) { next(err); }
};

const listBotUsers = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      BotUser.find({}).sort({ createdAt: -1 }).skip(skip).limit(limit),
      BotUser.countDocuments(),
    ]);

    return res.json({
      success: true,
      data: { users, pagination: { total, page, limit, pages: Math.ceil(total / limit) } },
    });
  } catch (err) { next(err); }
};

const getSettings = async (req, res, next) => {
  try {
    const settings = await Setting.find({});
    const data = {};
    settings.forEach(s => { data[s.key] = s.value; });
    return res.json({ success: true, data });
  } catch (err) { next(err); }
};

const updateSetting = async (req, res, next) => {
  try {
    const { key, value } = req.body;
    if (!key || value === undefined) {
      return res.status(422).json({ success: false, error: 'key and value required' });
    }
    await Setting.findOneAndUpdate(
      { key },
      { value: String(value) },
      { upsert: true, new: true }
    );
    return res.json({ success: true, message: `Setting '${key}' updated to '${value}'` });
  } catch (err) { next(err); }
};

module.exports = {
  createUser, createUserValidation,
  topUpBalance, topUpValidation,
  deductBalance, deductValidation,
  getSettings, updateSetting,
  listUsers, listBotUsers,
  listAllOrders, listAllTransactions, clearAllOrders,
  broadcast,
  regenerateApiKey, toggleUser,
};
