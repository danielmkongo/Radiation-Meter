const { getDb } = require('../config/database');
const { unauthorized } = require('../utils/response');

/**
 * Validate X-API-Key header for IoT device endpoints.
 * Attaches req.device to the request on success.
 */
function apiKeyAuth(req, res, next) {
  const apiKey = req.headers['x-api-key'];
  if (!apiKey) {
    return unauthorized(res, 'API key required');
  }

  const db = getDb();
  const device = db
    .prepare('SELECT * FROM devices WHERE api_key = ? AND is_active = 1')
    .get(apiKey);

  if (!device) {
    return unauthorized(res, 'Invalid or inactive API key');
  }

  // Update last_seen
  db.prepare('UPDATE devices SET last_seen = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE device_id = ?')
    .run(device.device_id);

  req.device = device;
  next();
}

module.exports = { apiKeyAuth };
