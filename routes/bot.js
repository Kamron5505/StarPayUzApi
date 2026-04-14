const router = require('express').Router();
const {
  getOrCreateBotUser,
  getBotUserBalance,
  buyStars,
  buyStarsValidation,
  buyPremium,
  buyGift,
  getPrices,
} = require('../controllers/botUserController');

router.get('/prices', getPrices);
router.post('/user', getOrCreateBotUser);
router.get('/user/:telegram_id/balance', getBotUserBalance);
router.post('/buy-stars', buyStarsValidation, buyStars);
router.post('/buy-premium', buyPremium);
router.post('/buy-gift', buyGift);

module.exports = router;
