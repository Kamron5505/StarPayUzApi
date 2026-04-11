const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    api_key: {
      type: String,
      unique: true,
      default: () => uuidv4().replace(/-/g, ''),
    },
    balance: {
      type: Number,
      default: 0,
      min: 0,
    },
    is_active: {
      type: Boolean,
      default: true,
    },
    is_admin: {
      type: Boolean,
      default: false,
    },
    meta: {
      type: Map,
      of: String,
      default: {},
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);
