const router = require('express').Router();
const { createOrder, checkOrder } = require('../controllers/elderPayController');

router.post('/create', createOrder);
router.get('/check/:order_id', checkOrder);

module.exports = router;
