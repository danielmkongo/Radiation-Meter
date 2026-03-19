const { getDb } = require('../config/database');
const { success, notFound, paginated, forbidden } = require('../utils/response');

function listAlerts(req, res) {
  const db = getDb();
  const { role, card_number: userCard } = req.user;
  const { type, category, card_number, device_id, acknowledged, page = 1, limit = 50 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);

  let where = ['1=1'];
  const params = [];

  if (role === 'radiologist') {
    where.push('a.card_number = ?');
    params.push(userCard);
  } else if (card_number) {
    where.push('a.card_number = ?');
    params.push(card_number);
  }

  if (type) { where.push('a.type = ?'); params.push(type); }
  if (category) { where.push('a.category = ?'); params.push(category); }
  if (device_id) { where.push('a.device_id = ?'); params.push(device_id); }
  if (acknowledged !== undefined) {
    where.push('a.is_acknowledged = ?');
    params.push(acknowledged === 'true' ? 1 : 0);
  }

  const whereClause = where.join(' AND ');
  const total = db.prepare(`SELECT COUNT(*) as n FROM alerts a WHERE ${whereClause}`).get(...params).n;
  const alerts = db.prepare(
    `SELECT a.*, u.full_name, u.email, u.department
     FROM alerts a
     LEFT JOIN users u ON u.card_number = a.card_number
     WHERE ${whereClause}
     ORDER BY a.created_at DESC LIMIT ? OFFSET ?`
  ).all(...params, parseInt(limit), offset);

  return paginated(res, alerts, { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) });
}

function getAlert(req, res) {
  const db = getDb();
  const alert = db.prepare('SELECT * FROM alerts WHERE id = ?').get(req.params.id);
  if (!alert) return notFound(res, 'Alert not found');
  if (req.user.role === 'radiologist' && alert.card_number !== req.user.card_number) {
    return forbidden(res);
  }
  return success(res, alert);
}

function acknowledgeAlert(req, res) {
  const db = getDb();
  const alert = db.prepare('SELECT * FROM alerts WHERE id = ?').get(req.params.id);
  if (!alert) return notFound(res, 'Alert not found');

  if (req.user.role === 'radiologist' && alert.card_number !== req.user.card_number) {
    return forbidden(res);
  }

  db.prepare(
    `UPDATE alerts SET is_acknowledged=1, acknowledged_by=?, acknowledged_at=CURRENT_TIMESTAMP WHERE id=?`
  ).run(req.user.id, req.params.id);

  return success(res, null, 'Alert acknowledged');
}

function getUnreadCount(req, res) {
  const db = getDb();
  const { role, card_number } = req.user;

  let query, params;
  if (role === 'radiologist') {
    query = `SELECT COUNT(*) as n, type FROM alerts WHERE card_number = ? AND is_acknowledged = 0 GROUP BY type`;
    params = [card_number];
  } else {
    query = `SELECT COUNT(*) as n, type FROM alerts WHERE is_acknowledged = 0 GROUP BY type`;
    params = [];
  }

  const rows = db.prepare(query).all(...params);
  const counts = { warning: 0, critical: 0, total: 0 };
  for (const r of rows) {
    counts[r.type] = r.n;
    counts.total += r.n;
  }
  return success(res, counts);
}

module.exports = { listAlerts, getAlert, acknowledgeAlert, getUnreadCount };
