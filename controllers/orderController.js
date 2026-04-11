const { body, validationResult } = require('express-validator');
const Order = require('../models/Order');

// Validation rules
const createOrderValidation = [
  body('telegram_user_id')
    .notEmpty().withMessage('telegram_user_id is required')
    .isString(),
  body('amount')
    .notEmpty().withMessage('amount is required')
    .isInt({ min: 1 }).withMessage('amount must be a positive integer'),
];

/**
 * POST /api/create-order
 * Creates a pending order before sending stars.
 */
const createOrder = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ success: false, errors: errors.array() });
    }

    const { telegram_user_id, amount } = req.body;

    const order = await Order.create({
      user: req.user._id,
      telegram_user_id: String(telegram_user_id),
      amount,
      status: 'pending',
    });

    return res.status(201).json({
      success: true,
      message: 'Order created. Use POST /api/send-stars to execute it.',
      data: {
        order_id: order._id,
        telegram_user_id: order.telegram_user_id,
        amount: order.amount,
        status: order.status,
        created_at: order.createdAt,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/orders
 * Returns paginated order history for the authenticated user.
 */
const getOrders = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    const filter = { user: req.user._id };
    if (req.query.status && ['pending', 'processing', 'success', 'failed'].includes(req.query.status)) {
      filter.status = req.query.status;
    }

    const [orders, total] = await Promise.all([
      Order.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Order.countDocuments(filter),
    ]);

    return res.json({
      success: true,
      data: {
        orders,
        pagination: { total, page, limit, pages: Math.ceil(total / limit) },
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/orders/:id
 * Returns a single order by ID.
 */
const getOrderById = async (req, res, next) => {
  try {
    const order = await Order.findOne({ _id: req.params.id, user: req.user._id });

    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found.' });
    }

    return res.json({ success: true, data: order });
  } catch (err) {
    next(err);
  }
};

module.exports = { createOrder, createOrderValidation, getOrders, getOrderById };
