const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const {
  getOrCreateBotUser,
  getBotUserBalance,
  buyStars,
  buyStarsValidation,
  getPrices,
} = require('../controllers/botUserController');

// All bot routes require api_key
router.use(authenticate);

router.get('/prices', getPrices);
router.post('/user', getOrCreateBotUser);
router.get('/user/:telegram_id/balance', getBotUserBalance);
router.post('/buy-stars', buyStarsValidation, buyStars);

module.exports = router;
