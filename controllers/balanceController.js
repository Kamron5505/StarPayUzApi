/**
 * GET /api/balance
 * Returns the current balance of the authenticated user.
 */
const getBalance = async (req, res, next) => {
  try {
    const { username, balance, api_key, createdAt } = req.user;

    return res.json({
      success: true,
      data: {
        username,
        api_key,
        balance,
        member_since: createdAt,
      },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { getBalance };
