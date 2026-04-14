const router = require('express').Router();
const { requireAdmin } = require('../middleware/auth');
const {
  createUser, createUserValidation,
  topUpBalance, topUpValidation,
  deductBalance, deductValidation,
  getSettings, updateSetting,
  listUsers, listBotUsers,
  listAllOrders, listAllTransactions,
  regenerateApiKey, toggleUser,
} = require('../controllers/adminController');

router.use(requireAdmin);

router.post('/users', createUserValidation, createUser);
router.get('/users', listUsers);
router.get('/bot-users', listBotUsers);
router.post('/topup', topUpValidation, topUpBalance);
router.post('/deduct', deductValidation, deductBalance);
router.get('/settings', getSettings);
router.post('/settings', updateSetting);
router.get('/orders', listAllOrders);
router.get('/transactions', listAllTransactions);
router.post('/users/:username/regenerate-key', regenerateApiKey);
router.patch('/users/:username/toggle', toggleUser);
module.exports = router;
