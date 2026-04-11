const Transaction = require('../models/Transaction');

/**
 * GET /api/transactions
 * Returns paginated transaction history for the authenticated user.
 */
const getTransactions = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    const filter = { user: req.user._id };
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

    return res.json({
      success: true,
      data: {
        transactions,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { getTransactions };
