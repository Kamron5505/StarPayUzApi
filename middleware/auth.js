const User = require('../models/User');

/**
 * Middleware: validates api_key from header or query/body
 * Attaches the user object to req.user
 */
const authenticate = async (req, res, next) => {
  try {
    const api_key =
      req.headers['x-api-key'] ||
      req.query.api_key ||
      req.body?.api_key;

    if (!api_key) {
      return res.status(401).json({
        success: false,
        error: 'API key is required. Pass it via X-Api-Key header or api_key field.',
      });
    }

    const user = await User.findOne({ api_key, is_active: true });

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or inactive API key.',
      });
    }

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
};

/**
 * Middleware: validates internal service secret (for bot/elderpay routes)
 */
const authenticateService = (req, res, next) => {
  const secret =
    req.headers['x-service-secret'] ||
    req.headers['x-api-key'];

  const SERVICE_SECRET = process.env.SERVICE_SECRET || 'secret';

  if (!secret || secret !== SERVICE_SECRET) {
    return res.status(401).json({ success: false, error: 'Invalid service secret.' });
  }
  next();
};

/**
 * Middleware: ensures the authenticated user is an admin
 */
const requireAdmin = async (req, res, next) => {
  try {
    const admin_secret = req.headers['x-admin-secret'];

    if (!admin_secret || admin_secret !== process.env.ADMIN_SECRET) {
      return res.status(403).json({
        success: false,
        error: 'Admin access denied.',
      });
    }

    next();
  } catch (err) {
    next(err);
  }
};

module.exports = { authenticate, authenticateService, requireAdmin };
