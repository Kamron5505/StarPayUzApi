const axios = require('axios');

const TG_SERVICE_URL = process.env.TG_SERVICE_URL || 'http://localhost:3001';
const SERVICE_SECRET = process.env.SERVICE_SECRET || 'secret';

/**
 * Send Stars to user via tg-service
 */
const sendStars = async (telegramUserId, amount) => {
  try {
    console.log(`[StarsService] Sending ${amount} stars to ${telegramUserId}`);

    const response = await axios.post(`${TG_SERVICE_URL}/send-stars`, {
      telegram_user_id: String(telegramUserId),
      amount: parseInt(amount),
    }, {
      headers: { 'X-Service-Secret': SERVICE_SECRET },
      timeout: 120000, // 2 minutes
    });

    const data = response.data;
    if (data.success) {
      console.log(`[StarsService] Success: ${amount} stars sent to ${telegramUserId}`);
      return { success: true, external_id: data.external_id, error: null };
    } else {
      throw new Error(data.error || 'Unknown error');
    }
  } catch (err) {
    console.error(`[StarsService] Error:`, err.message);
    return { success: false, external_id: null, error: err.message };
  }
};

const sendStarGift = async (telegramUserId, giftId = null) => {
  // TODO: add gift endpoint to tg-service
  return { success: false, external_id: null, error: 'Gift sending not implemented in tg-service yet' };
};

module.exports = { sendStars, sendStarGift };
