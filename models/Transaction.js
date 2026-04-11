const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    type: {
      type: String,
      enum: ['debit', 'credit'],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 1,
    },
    balance_before: {
      type: Number,
      required: true,
    },
    balance_after: {
      type: Number,
      required: true,
    },
    description: {
      type: String,
      default: '',
    },
    // Reference to order if applicable
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
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

module.exports = mongoose.model('Transaction', transactionSchema);
