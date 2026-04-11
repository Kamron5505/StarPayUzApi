const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    bot_user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BotUser',
      required: true,
    },
    telegram_id: {
      type: String,
      required: true,
    },
    amount_uzs: {
      type: Number,
      required: true,
    },
    provider: {
      type: String,
      enum: ['click', 'payme', 'manual'],
      default: 'click',
    },
    // Click transaction ID
    provider_transaction_id: {
      type: String,
      default: null,
    },
    status: {
      type: String,
      enum: ['pending', 'success', 'failed', 'cancelled'],
      default: 'pending',
    },
    error_note: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Payment', paymentSchema);
