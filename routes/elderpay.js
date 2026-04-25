const router = require('express').Router();
const { createOrder, checkOrder, getPendingPayments } = require('../controllers/elderPayController');

router.post('/create', createOrder);
router.get('/check/:order_id', checkOrder);
router.get('/pending', getPendingPayments);

module.exports = router;
