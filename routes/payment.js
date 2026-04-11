const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/auth');
const { createOrder, checkOrder, confirmOrder } = require('../controllers/paymentController');

router.post('/create', authenticate, createOrder);
router.get('/check/:order_id', authenticate, checkOrder);
router.post('/confirm', requireAdmin, confirmOrder);

module.exports = router;
