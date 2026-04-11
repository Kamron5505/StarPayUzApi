const mongoose = require('mongoose');

const botUserSchema = new mongoose.Schema(
  {
    telegram_id: {
      type: String,
      required: true,
      unique: true,
    },
    username: {
      type: String,
      default: null,
    },
    full_name: {
      type: String,
      default: '',
    },
    balance_uzs: {
      type: Number,
      default: 0,
      min: 0,
    },
    total_spent_uzs: {
      type: Number,
      default: 0,
    },
    total_stars_bought: {
      type: Number,
      default: 0,
    },
    is_banned: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('BotUser', botUserSchema);
