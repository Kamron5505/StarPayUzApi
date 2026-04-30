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
 * Get Telegram user info by username
 */
const getUserInfo = async (username) => {
  try {
    const { data } = await fragmentClient.post('/getInfo', { username });
    if (data.ok) return { success: true, result: data.result };
    return { success: false, error: data.message };
  } catch (err) {
    return { success: false, error: err.response?.data?.message || err.message };
  }
};

/**
 * Get Stars pricing for a given amount
 */
const getStarsPricing = async (amount) => {
  try {
    const { data } = await fragmentClient.post('/stars/pricing', { amount });
    if (data.ok) return { success: true, result: data.result };
    return { success: false, error: data.message };
  } catch (err) {
    return { success: false, error: err.response?.data?.message || err.message };
  }
};

/**
 * Send Stars to a Telegram user by username
 */
const sendStars = async (username, amount) => {
  try {
    console.log(`[StarsService] Sending ${amount} stars to @${username}`);
    
    // Check wallet balance first
    const balanceCheck = await getWalletBalance();
    if (balanceCheck.success) {
      console.log(`[StarsService] Wallet balance: ${balanceCheck.result.balance} TON`);
      if (balanceCheck.result.balance < 0.1) {
        console.warn(`[StarsService] ⚠️ Low wallet balance: ${balanceCheck.result.balance} TON`);
      }
    }
    
    const { data } = await fragmentClient.post('/stars/buy', { username, amount });
    if (data.ok) {
      console.log(`[StarsService] ✅ Success: ${amount} stars sent to @${username}`);
      return { success: true, external_id: data.result.message_hash, result: data.result };
    }
    
    // Check if error is about insufficient balance
    const errorMsg = data.message || 'Unknown error';
    if (errorMsg.toLowerCase().includes('insufficient') || errorMsg.toLowerCase().includes('balance')) {
      console.error(`[StarsService] ❌ Insufficient wallet balance: ${errorMsg}`);
      return { success: false, external_id: null, error: `Wallet insufficient balance: ${errorMsg}` };
    }
    
    return { success: false, external_id: null, error: errorMsg };
  } catch (err) {
    const errMsg = err.response?.data?.message || err.message;
    console.error(`[StarsService] ❌ Error:`, errMsg);
    return { success: false, external_id: null, error: errMsg };
  }
};

/**
 * Get wallet balance
 */
const getWalletBalance = async () => {
  try {
    const { data } = await fragmentClient.post('/wallet/balance', {});
    if (data.ok) return { success: true, result: data.result };
    return { success: false, error: data.message };
  } catch (err) {
    return { success: false, error: err.response?.data?.message || err.message };
  }
};

module.exports = { sendStars, getUserInfo, getStarsPricing, getWalletBalance };
