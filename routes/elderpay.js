const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const { createOrder, checkOrder } = require('../controllers/elderPayController');

router.post('/create', authenticate, createOrder);
router.get('/check/:order_id', authenticate, checkOrder);

module.exports = router;
