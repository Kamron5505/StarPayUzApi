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

app.use('/api/admin', adminRoutes);
app.use('/api', apiRoutes);
app.use('/api/bot', botRoutes);
app.use('/api/click', clickRoutes);
app.use('/api/sms', smsRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/elderpay', elderPayRoutes);

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
  })
  .catch((err) => {
    console.error('[DB] Connection failed:', err.message);
    process.exit(1);
  });
