const router = require('express').Router();
const { authenticate } = require('../middleware/auth');

const { getBalance } = require('../controllers/balanceController');
const {
  sendStarsHandler,
  sendStarsValidation,
  getStarsPricingHandler,
  getUserInfoHandler,
} = require('../controllers/starsController');
const {
  getPremiumPricingHandler,
  sendPremiumHandler,
  sendPremiumValidation,
} = require('../controllers/premiumController');
const { getTransactions } = require('../controllers/transactionController');
const { createOrder, createOrderValidation, getOrders, getOrderById } = require('../controllers/orderController');

// All routes require a valid api_key
router.use(authenticate);

// Balance
router.get('/balance', getBalance);

// Stars
router.post('/stars/send', sendStarsValidation, sendStarsHandler);
router.post('/stars/pricing', getStarsPricingHandler);
router.post('/stars/user-info', getUserInfoHandler);

// Premium
router.post('/premium/send', sendPremiumValidation, sendPremiumHandler);
router.post('/premium/pricing', getPremiumPricingHandler);

// Transactions & Orders
router.get('/transactions', getTransactions);
router.post('/create-order', createOrderValidation, createOrder);
router.get('/orders', getOrders);
router.get('/orders/:id', getOrderById);

// Legacy aliases (backward compat)
router.post('/send-stars', sendStarsValidation, sendStarsHandler);

module.exports = router;
