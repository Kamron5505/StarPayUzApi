const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const { incomingSms, createPayment, checkPayment } = require('../controllers/smsController');

// SMS from Android — no api_key, uses SMS_SECRET instead
router.post('/incoming', incomingSms);

// Bot endpoints — require api_key
router.post('/create-payment', authenticate, createPayment);
router.get('/check-payment/:payment_id', authenticate, checkPayment);

module.exports = router;
