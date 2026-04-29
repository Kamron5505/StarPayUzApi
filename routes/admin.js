const router = require('express').Router();
const { requireAdmin } = require('../middleware/auth');
const {
  createUser, createUserValidation,
  topUpBalance, topUpValidation,
  deductBalance, deductValidation,
  getSettings, updateSetting,
  listUsers, listBotUsers,
  listAllOrders, listAllTransactions, clearAllOrders,
  broadcast,
  regenerateApiKey, toggleUser,
  checkBotUsers,
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
router.post('/orders/clear', clearAllOrders);
router.get('/transactions', listAllTransactions);
router.post('/broadcast', broadcast);
router.get('/check-bot-users', checkBotUsers);
router.post('/test-payment', async (req, res, next) => {
  try {
    const { telegram_id } = req.body;
    const Payment = require('../models/Payment');
    const BotUser = require('../models/BotUser');
    const axios = require('axios');

    const payment = await Payment.findOne({ telegram_id: String(telegram_id), status: 'pending' }).sort({ createdAt: -1 });
    if (!payment) return res.status(404).json({ success: false, error: 'No pending payment found' });

    const botUser = await BotUser.findOne({ telegram_id: String(telegram_id) });
    if (botUser) { botUser.balance_uzs += payment.amount_uzs; await botUser.save(); }
    payment.status = 'success';
    await payment.save();

    const BOT_TOKEN = process.env.BOT_TOKEN;
    if (BOT_TOKEN) {
      await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
        chat_id: telegram_id,
        text: `✅ <b>To'lov muvaffaqiyatli qabul qilindi!</b>\n\n💰 Miqdor: <b>${payment.amount_uzs.toLocaleString()} so'm</b>\n👛 Joriy balans: <b>${botUser ? botUser.balance_uzs.toLocaleString() : '—'} so'm</b>`,
        parse_mode: 'HTML',
      }).catch(() => {});
    }
    return res.json({ success: true, credited: payment.amount_uzs, balance: botUser?.balance_uzs });
  } catch (err) { next(err); }
});
router.post('/users/:username/regenerate-key', regenerateApiKey);
router.patch('/users/:username/toggle', toggleUser);
module.exports = router;
