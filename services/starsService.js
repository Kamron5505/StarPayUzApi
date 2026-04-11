const { TelegramClient, Api } = require('telegram');
const { StringSession } = require('telegram/sessions');

const apiId = parseInt(process.env.TELEGRAM_API_ID);
const apiHash = process.env.TELEGRAM_API_HASH;
const sessionString = process.env.TELEGRAM_SESSION;

let clientInstance = null;

const getClient = async () => {
  if (clientInstance && clientInstance.connected) return clientInstance;

  const client = new TelegramClient(new StringSession(sessionString), apiId, apiHash, {
    connectionRetries: 5,
    useWSS: false,
  });

  await client.connect();
  clientInstance = client;
  console.log('[TG] Client connected');
  return client;
};

const resolveUser = async (client, telegramUserId) => {
  const users = await client.invoke(new Api.users.GetUsers({
    id: [new Api.InputUser({ userId: BigInt(telegramUserId), accessHash: BigInt(0) })],
  }));
  if (!users || !users[0]) throw new Error(`User ${telegramUserId} not found`);
  return users[0];
};

/**
 * Send Stars directly to user balance via Telegram
 */
const sendStars = async (telegramUserId, amount) => {
  try {
    console.log(`[StarsService] Sending ${amount} stars to ${telegramUserId}`);
    const client = await getClient();
    const user = await resolveUser(client, telegramUserId);

    const inputUser = new Api.InputUser({ userId: user.id, accessHash: user.accessHash });
    const inputPeer = new Api.InputPeerUser({ userId: user.id, accessHash: user.accessHash });

    // Get gift options for exact amount
    const giftOptions = await client.invoke(new Api.payments.GetStarsGiftOptions({ userId: inputUser }));
    const option = giftOptions.find(o => parseInt(o.stars) === amount);
    if (!option) {
      const available = giftOptions.map(o => o.stars.toString()).join(', ');
      throw new Error(`No option for ${amount} stars. Available: ${available}`);
    }

    const purpose = new Api.InputStorePaymentStarsGift({
      userId: inputUser,
      stars: BigInt(amount),
      currency: option.currency,
      amount: option.amount,
    });

    const form = await client.invoke(new Api.payments.GetPaymentForm({
      invoice: new Api.InputInvoiceStars({ purpose }),
    }));

    const result = await client.invoke(new Api.payments.SendStarsForm({
      formId: form.formId,
      invoice: new Api.InputInvoiceStars({ purpose }),
    }));

    console.log(`[StarsService] Stars sent successfully to ${telegramUserId}`);
    return { success: true, external_id: form.formId?.toString(), error: null };

  } catch (err) {
    console.error(`[StarsService] sendStars error:`, err.message);
    return { success: false, external_id: null, error: err.message };
  }
};

/**
 * Send a Star Gift to user
 */
const sendStarGift = async (telegramUserId, giftId = null) => {
  try {
    console.log(`[StarsService] Sending star gift to ${telegramUserId}`);
    const client = await getClient();
    const user = await resolveUser(client, telegramUserId);

    const inputPeer = new Api.InputPeerUser({ userId: user.id, accessHash: user.accessHash });

    // Get available gifts
    const gifts = await client.invoke(new Api.payments.GetStarGifts({ hash: 0 }));

    let gift;
    if (giftId) {
      gift = gifts.gifts.find(g => g.id?.toString() === String(giftId));
    }
    if (!gift) {
      // Get current stars balance
      const status = await client.invoke(new Api.payments.GetStarsStatus({ peer: new Api.InputPeerSelf() }));
      const balance = parseInt(status.balance?.amount || 0);
      gift = gifts.gifts.find(g => parseInt(g.stars) <= balance);
    }
    if (!gift) throw new Error('No affordable gift found');

    console.log(`[StarsService] Using gift id=${gift.id} stars=${gift.stars}`);

    const form = await client.invoke(new Api.payments.GetPaymentForm({
      invoice: new Api.InputInvoiceStarGift({
        peer: inputPeer,
        giftId: gift.id,
      }),
    }));

    const result = await client.invoke(new Api.payments.SendStarsForm({
      formId: form.formId,
      invoice: new Api.InputInvoiceStarGift({
        peer: inputPeer,
        giftId: gift.id,
      }),
    }));

    console.log(`[StarsService] Gift sent successfully to ${telegramUserId}`);
    return { success: true, external_id: form.formId?.toString(), gift_id: gift.id?.toString(), stars: parseInt(gift.stars), error: null };

  } catch (err) {
    console.error(`[StarsService] sendStarGift error:`, err.message);
    return { success: false, external_id: null, error: err.message };
  }
};

module.exports = { sendStars, sendStarGift };
