const router = require('express').Router();
const { prepare, complete } = require('../controllers/clickController');

// Click sends POST requests to these endpoints
// No api_key required — Click uses its own signature verification
router.post('/prepare', prepare);
router.post('/complete', complete);

module.exports = router;
