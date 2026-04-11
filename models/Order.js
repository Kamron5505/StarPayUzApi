const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    telegram_user_id: {
      type: String,
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 1,
    },
    status: {
      type: String,
      enum: ['pending', 'processing', 'success', 'failed'],
      default: 'pending',
    },
    error_message: {
      type: String,
      default: null,
    },
    // External reference ID from Telegram or payment provider
    external_id: {
      type: String,
      default: null,
    },
    meta: {
      type: Map,
      of: String,
      default: {},
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Order', orderSchema);
