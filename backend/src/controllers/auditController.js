const { getDb } = require('../config/database');
const { paginated } = require('../utils/response');

function listAuditLogs(req, res) {
  const db = getDb();
  const { user_id, action, start_date, end_date, page = 1, limit = 50 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);

  let where = ['1=1'];
  const params = [];

  if (user_id) { where.push('user_id = ?'); params.push(user_id); }
  if (action)  { where.push('action LIKE ?'); params.push(`%${action}%`); }
  if (start_date) { where.push('created_at >= ?'); params.push(start_date); }
  if (end_date)   { where.push('created_at <= ?'); params.push(end_date); }

  const whereClause = where.join(' AND ');
  const total = db.prepare(`SELECT COUNT(*) as n FROM audit_logs WHERE ${whereClause}`).get(...params).n;
  const logs = db.prepare(
    `SELECT * FROM audit_logs WHERE ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`
  ).all(...params, parseInt(limit), offset);

  return paginated(res, logs, { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) });
}

module.exports = { listAuditLogs };
