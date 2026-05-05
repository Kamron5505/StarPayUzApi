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
const { getTransactions } = require('../controllers/transactionController');

router.get('/prices', getPrices);
router.post('/user', getOrCreateBotUser);
router.get('/user/:telegram_id/balance', getBotUserBalance);
router.post('/balance', getBotUserBalance); // POST version for web app
router.post('/buy-stars', buyStarsValidation, buyStars);
router.post('/buy-premium', buyPremium);
router.post('/buy-gift', buyGift);
router.post('/send-gift', buyGift); // Alias for web app
router.get('/transactions', getTransactions);

module.exports = router;
