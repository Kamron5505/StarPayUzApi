const Transaction = require('../models/Transaction');
const BotUser = require('../models/BotUser');

/**
 * GET /api/transactions
 * Returns paginated transaction history for the authenticated user.
 */
const getTransactions = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    // Support both authenticated user and telegram_id query param
    let filter = {};
    
    if (req.user) {
      filter = { user: req.user._id };
    } else if (req.query.telegram_id) {
      // For web app - find user by telegram_id
      const botUser = await BotUser.findOne({ telegram_id: req.query.telegram_id });
      if (!botUser) {
        return res.json({
          success: true,
          data: [],
        });
      }
      filter = { user: botUser._id };
    } else {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    if (req.query.type && ['debit', 'credit'].includes(req.query.type)) {
      filter.type = req.query.type;
    }

    const [transactions, total] = await Promise.all([
      Transaction.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('order', 'telegram_user_id status external_id'),
      Transaction.countDocuments(filter),
    ]);

    // Format for web app
    const formattedTransactions = transactions.map(tx => ({
      _id: tx._id,
      type: tx.type,
      amount: tx.amount,
      description: tx.description,
      created_at: tx.createdAt,
      order_id: tx.order?._id,
    }));

    return res.json({
      success: true,
      data: formattedTransactions,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { getTransactions };
