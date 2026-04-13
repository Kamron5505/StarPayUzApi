const axios = require('axios');

const FRAGMENT_API_BASE = 'https://fragment-api.uz/api/v1';
const FRAGMENT_API_KEY = process.env.FRAGMENT_API_KEY;

const fragmentClient = axios.create({
  baseURL: FRAGMENT_API_BASE,
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': FRAGMENT_API_KEY,
  },
  timeout: 120000,
});

/**
 * Get Telegram Premium pricing (3, 6, 12 months)
 */
const getPremiumPricing = async () => {
  try {
    const { data } = await fragmentClient.post('/premium/pricing', {});
    if (data.ok) return { success: true, result: data.result };
    return { success: false, error: data.message };
  } catch (err) {
    return { success: false, error: err.response?.data?.message || err.message };
  }
};

/**
 * Buy Telegram Premium for a user by username
 * @param {string} username - Telegram username (without @)
 * @param {number} duration - 3, 6, or 12 months
 */
const sendPremium = async (username, duration) => {
  try {
    console.log(`[PremiumService] Sending ${duration}mo Premium to @${username}`);
    const { data } = await fragmentClient.post('/premium/buy', { username, duration });
    if (data.ok) {
      console.log(`[PremiumService] Success: Premium sent to @${username}`);
      return { success: true, external_id: data.result.message_hash, result: data.result };
    }
    return { success: false, external_id: null, error: data.message };
  } catch (err) {
    const errMsg = err.response?.data?.message || err.message;
    console.error(`[PremiumService] Error:`, errMsg);
    return { success: false, external_id: null, error: errMsg };
  }
};

module.exports = { getPremiumPricing, sendPremium };
