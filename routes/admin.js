const router = require('express').Router();
const { requireAdmin } = require('../middleware/auth');
const {
  createUser,
  createUserValidation,
  topUpBalance,
  topUpValidation,
  listUsers,
  regenerateApiKey,
  toggleUser,
} = require('../controllers/adminController');

// All admin routes require X-Admin-Secret header
router.use(requireAdmin);

router.post('/users', createUserValidation, createUser);
router.get('/users', listUsers);
router.post('/topup', topUpValidation, topUpBalance);
router.post('/users/:username/regenerate-key', regenerateApiKey);
router.patch('/users/:username/toggle', toggleUser);

module.exports = router;
