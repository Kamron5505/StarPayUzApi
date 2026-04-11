const router = require('express').Router();
const { authenticate } = require('../middleware/auth');

const { getBalance } = require('../controllers/balanceController');
const { sendStarsHandler, sendStarsValidation, sendGiftHandler, sendGiftValidation } = require('../controllers/starsController');
const { getTransactions } = require('../controllers/transactionController');
const {
  createOrder,
  createOrderValidation,
  getOrders,
  getOrderById,
} = require('../controllers/orderController');

// All routes below require a valid api_key
router.use(authenticate);

router.get('/balance', getBalance);

router.post('/send-stars', sendStarsValidation, sendStarsHandler);
router.post('/send-gift', sendGiftValidation, sendGiftHandler);

router.get('/transactions', getTransactions);

router.post('/create-order', createOrderValidation, createOrder);
router.get('/orders', getOrders);
router.get('/orders/:id', getOrderById);

module.exports = router;
