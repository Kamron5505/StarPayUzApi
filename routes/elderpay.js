const router = require('express').Router();
const { authenticateService } = require('../middleware/auth');
const { createOrder, checkOrder } = require('../controllers/elderPayController');

router.post('/create', authenticateService, createOrder);
router.get('/check/:order_id', authenticateService, checkOrder);

module.exports = router;
