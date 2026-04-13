const router = require('express').Router();
const { authenticateService } = require('../middleware/auth');
const {
  getOrCreateBotUser,
  getBotUserBalance,
  buyStars,
  buyStarsValidation,
  getPrices,
} = require('../controllers/botUserController');

router.use(authenticateService);

router.get('/prices', getPrices);
router.post('/user', getOrCreateBotUser);
router.get('/user/:telegram_id/balance', getBotUserBalance);
router.post('/buy-stars', buyStarsValidation, buyStars);

module.exports = router;
