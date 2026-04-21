require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const morgan = require('morgan');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const path = require('path');

const apiRoutes = require('./routes/api');
const adminRoutes = require('./routes/admin');
const botRoutes = require('./routes/bot');
const clickRoutes = require('./routes/click');
const smsRoutes = require('./routes/sms');
const paymentRoutes = require('./routes/payment');
const elderPayRoutes = require('./routes/elderpay');

const app = express();

// Trust Railway proxy
app.set('trust proxy', 1);

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(helmet({ contentSecurityPolicy: false }));
app.use(compression());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: { success: false, error: 'Too many requests, please try again later.' },
});
app.use('/api', limiter);

// Static files (web interface)
app.use(express.static(path.join(__dirname, 'public')));

// ── Routes ────────────────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({
    success: true,
    service: 'Telegram Stars API',
    version: '1.0.0',
    docs: 'See README.md or examples/requests.md for usage.',
  });
});

// ── Test: simulate paid payment ───────────────────────────────────────────────
app.post('/api/admin/test-payment', async (req, res) => {
  const admin_secret = req.headers['x-admin-secret'];
  if (!admin_secret || admin_secret !== process.env.ADMIN_SECRET) {
    return res.status(403).json({ success: false, error: 'Forbidden' });
  }
  const { telegram_id } = req.body;
  const Payment = require('./models/Payment');
  const BotUser = require('./models/BotUser');
  const axios = require('axios');

  const payment = await Payment.findOne({ telegram_id: String(telegram_id), status: 'pending' }).sort({ createdAt: -1 });
  if (!payment) return res.status(404).json({ success: false, error: 'No pending payment found' });

  const botUser = await BotUser.findOne({ telegram_id: String(telegram_id) });
  if (botUser) {
    botUser.balance_uzs += payment.amount_uzs;
    await botUser.save();
  }
  payment.status = 'success';
  await payment.save();

  const BOT_TOKEN = process.env.BOT_TOKEN;
  if (BOT_TOKEN) {
    await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      chat_id: telegram_id,
      text: `✅ <b>To'lov muvaffaqiyatli qabul qilindi!</b>\n\n💰 Miqdor: <b>${payment.amount_uzs.toLocaleString()} so'm</b>\n👛 Joriy balans: <b>${botUser ? botUser.balance_uzs.toLocaleString() : '—'} so'm</b>`,
      parse_mode: 'HTML',
    }).catch(e => console.error('notify error:', e.message));
  }

  return res.json({ success: true, message: `Credited ${payment.amount_uzs} to ${telegram_id}`, balance: botUser?.balance_uzs });
});

app.use('/api/admin', adminRoutes);
app.use('/api/bot', botRoutes);
app.use('/api/click', clickRoutes);
app.use('/api/sms', smsRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/elderpay', elderPayRoutes);
app.use('/api', apiRoutes);

// ── 404 Handler ───────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, error: 'Route not found.' });
});

// ── Global Error Handler ──────────────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error('[Error]', err.message);

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    return res.status(422).json({ success: false, error: err.message });
  }

  // Mongoose cast error (invalid ObjectId etc.)
  if (err.name === 'CastError') {
    return res.status(400).json({ success: false, error: 'Invalid ID format.' });
  }

  return res.status(500).json({
    success: false,
    error: process.env.NODE_ENV === 'production' ? 'Internal server error.' : err.message,
  });
});

// ── Database & Server Start ───────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/telegram-stars';

console.log(`[DB] Connecting to MongoDB...`);
console.log(`[DB] URI: ${MONGODB_URI.replace(/:([^@]+)@/, ':****@')}`);

mongoose
  .connect(MONGODB_URI, {
    serverSelectionTimeoutMS: 10000,
    connectTimeoutMS: 10000,
  })
  .then(() => {
    console.log(`[DB] Connected to MongoDB`);
    app.listen(PORT, () => {
      console.log(`[Server] Running on http://localhost:${PORT}`);
      console.log(`[Env] NODE_ENV=${process.env.NODE_ENV || 'development'}`);
    });

    // ── Background payment checker ────────────────────────────────────────────
    const axios = require('axios');
    const Payment = require('./models/Payment');
    const BotUser = require('./models/BotUser');
    const SHOP_ID = process.env.ELDERPAY_SHOP_ID;
    const SHOP_KEY = process.env.ELDERPAY_SHOP_KEY;
    const ELDERPAY_URL = process.env.ELDERPAY_API_URL;
    const BOT_TOKEN = process.env.BOT_TOKEN;

    const checkPendingPayments = async () => {
      try {
        const pending = await Payment.find({ status: 'pending' });
        for (const payment of pending) {
          try {
            const resp = await axios.get(ELDERPAY_URL, {
              params: { method: 'check', order: payment.provider_transaction_id, shop_id: SHOP_ID, shop_key: SHOP_KEY },
              timeout: 5000,
            });
            const data = resp.data;
            const status = data?.data?.status;

            if (status === 'paid' && payment.status !== 'success') {
              // Credit user balance
              const botUser = await BotUser.findOne({ telegram_id: payment.telegram_id });
              if (botUser) {
                botUser.balance_uzs += payment.amount_uzs;
                await botUser.save();
              }
              payment.status = 'success';
              await payment.save();
              console.log(`[PayChecker] Payment ${payment.provider_transaction_id} PAID. +${payment.amount_uzs} to ${payment.telegram_id}`);

              // Notify user via bot
              if (BOT_TOKEN) {
                try {
                  await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
                    chat_id: payment.telegram_id,
                    text: `✅ <b>To'lov muvaffaqiyatli qabul qilindi!</b>\n\n💰 Miqdor: <b>${payment.amount_uzs.toLocaleString()} so'm</b>\n👛 Joriy balans: <b>${botUser ? botUser.balance_uzs.toLocaleString() : '—'} so'm</b>`,
                    parse_mode: 'HTML',
                  });
                } catch (e) {
                  console.error('[PayChecker] notify error:', e.message);
                }
              }
            } else if (status === 'cancel' || status === 'cancelled') {
              payment.status = 'cancelled';
              await payment.save();
            }
          } catch (e) {
            // ignore individual errors
          }
        }
      } catch (e) {
        console.error('[PayChecker] error:', e.message);
      }
    };

    // Run every 10 seconds
    setInterval(checkPendingPayments, 10000);
    console.log('[PayChecker] Background payment checker started');
  })
  .catch((err) => {
    console.error('[DB] Connection failed:', err.message);
    process.exit(1);
  });
