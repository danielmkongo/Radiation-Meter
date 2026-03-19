const { getDb } = require('../config/database');

function log({ userId, userEmail, action, resourceType, resourceId, details, req }) {
  const db = getDb();
  const ip = req ? (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '') : '';
  const ua = req ? (req.headers['user-agent'] || '') : '';
  db.prepare(`
    INSERT INTO audit_logs (user_id, user_email, action, resource_type, resource_id, details, ip_address, user_agent)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    userId || null,
    userEmail || null,
    action,
    resourceType || null,
    resourceId ? String(resourceId) : null,
    details ? JSON.stringify(details) : null,
    ip,
    ua
  );
}

module.exports = { log };
