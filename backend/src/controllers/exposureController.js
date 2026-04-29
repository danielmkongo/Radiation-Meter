const { getDb } = require('../config/database');
const { success, created, error, notFound, paginated, forbidden } = require('../utils/response');
const { evaluateThresholds } = require('../services/thresholdService');
const { detectAnomaly } = require('../services/anomalyService');
const { processThresholdViolations, createAnomalyAlert } = require('../services/alertService');
const audit = require('../services/auditService');

/**
 * POST /api/v1/exposure  (IoT device ingestion — authenticated via API key)
 */
function ingestExposure(req, res) {
  const { device_id, card_number, radiation_value, timestamp } = req.body;

  // Validate payload
  if (!device_id || !card_number || radiation_value === undefined || radiation_value === null) {
    return error(res, 'device_id, card_number, and radiation_value are required');
  }
  if (typeof radiation_value !== 'number' || radiation_value < 0) {
    return error(res, 'radiation_value must be a non-negative number');
  }

  const db = getDb();

  // Verify the card_number belongs to a known user (radiologist)
  const user = db.prepare('SELECT id, full_name, card_number FROM users WHERE card_number = ? AND is_active = 1').get(card_number.toUpperCase().trim());
  if (!user) {
    return error(res, `No active user found with card number: ${card_number}`, 404);
  }

  // Ensure device_id matches authenticated device
  if (req.device && req.device.device_id !== device_id.toUpperCase().trim()) {
    return error(res, 'device_id does not match authenticated device', 403);
  }

  // Parse and validate timestamp
  const ts = timestamp ? new Date(timestamp).toISOString() : new Date().toISOString();
  if (isNaN(new Date(ts).getTime())) {
    return error(res, 'Invalid timestamp format');
  }

  // Duplicate protection: same device + card + timestamp
  const existing = db.prepare(
    'SELECT id FROM exposure_logs WHERE device_id = ? AND card_number = ? AND timestamp = ?'
  ).get(device_id.toUpperCase().trim(), card_number.toUpperCase().trim(), ts);
  if (existing) {
    return success(res, { id: existing.id, duplicate: true }, 'Duplicate record — already ingested');
  }

  // Anomaly detection
  const anomalyResult = detectAnomaly(card_number.toUpperCase().trim(), radiation_value);

  // Insert record
  const result = db.prepare(
    `INSERT INTO exposure_logs (device_id, card_number, radiation_value, unit, timestamp, is_anomaly)
     VALUES (?, ?, ?, 'mSv', ?, ?)`
  ).run(device_id.toUpperCase().trim(), card_number.toUpperCase().trim(), radiation_value, ts, anomalyResult.isAnomaly ? 1 : 0);

  // Process threshold violations asynchronously (still sync in SQLite but logically separated)
  const violations = evaluateThresholds(card_number.toUpperCase().trim());
  processThresholdViolations(card_number.toUpperCase().trim(), violations);

  // Create anomaly alert if detected
  if (anomalyResult.isAnomaly) {
    createAnomalyAlert(card_number.toUpperCase().trim(), device_id.toUpperCase().trim(), radiation_value, anomalyResult.zScore);
  }

  return created(res, {
    id: result.lastInsertRowid,
    device_id: device_id.toUpperCase().trim(),
    card_number: card_number.toUpperCase().trim(),
    radiation_value,
    unit: 'mSv',
    timestamp: ts,
    is_anomaly: anomalyResult.isAnomaly,
    threshold_violations: violations.length,
  }, 'Exposure data ingested');
}

/**
 * GET /api/v1/exposure  (dashboard/admin query)
 */
function listExposure(req, res) {
  const db = getDb();
  const { role, card_number: userCard } = req.user;
  const { card_number, device_id, start_date, end_date, anomaly_only, page = 1, limit = 50 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);

  let where = ['el.is_deleted = 0'];
  const params = [];

  // Radiologists can only see their own data; managers scoped to their hospital
  if (role === 'radiologist') {
    where.push('el.card_number = ?');
    params.push(userCard);
  } else if (role === 'hospital_manager' && req.user.hospital) {
    where.push('u.hospital = ?');
    params.push(req.user.hospital);
    if (card_number) { where.push('el.card_number = ?'); params.push(card_number.toUpperCase().trim()); }
  } else if (card_number) {
    where.push('el.card_number = ?');
    params.push(card_number.toUpperCase().trim());
  }

  if (device_id) { where.push('el.device_id = ?'); params.push(device_id.toUpperCase().trim()); }
  if (start_date) { where.push('el.timestamp >= ?'); params.push(start_date); }
  if (end_date) { where.push('el.timestamp <= ?'); params.push(end_date); }
  if (anomaly_only === 'true') { where.push('el.is_anomaly = 1'); }

  const whereClause = where.join(' AND ');
  const total = db.prepare(`SELECT COUNT(*) as n FROM exposure_logs el LEFT JOIN users u ON u.card_number = el.card_number WHERE ${whereClause}`).get(...params).n;
  const logs = db.prepare(
    `SELECT el.id, el.device_id, el.card_number, el.radiation_value, el.unit, el.timestamp, el.is_anomaly, el.created_at,
            u.full_name, d.name as device_name, d.location
     FROM exposure_logs el
     LEFT JOIN users u ON u.card_number = el.card_number
     LEFT JOIN devices d ON d.device_id = el.device_id
     WHERE ${whereClause}
     ORDER BY el.timestamp DESC LIMIT ? OFFSET ?`
  ).all(...params, parseInt(limit), offset);

  return paginated(res, logs, { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) });
}

/**
 * GET /api/v1/exposure/:id
 */
function getExposureById(req, res) {
  const db = getDb();
  const log = db.prepare(
    `SELECT el.*, u.full_name, u.hospital, d.name as device_name, d.location
     FROM exposure_logs el
     LEFT JOIN users u ON u.card_number = el.card_number
     LEFT JOIN devices d ON d.device_id = el.device_id
     WHERE el.id = ? AND el.is_deleted = 0`
  ).get(req.params.id);
  if (!log) return notFound(res, 'Exposure record not found');

  if (req.user.role === 'radiologist' && log.card_number !== req.user.card_number) {
    return forbidden(res, 'Access denied');
  }
  if (req.user.role === 'hospital_manager' && log.hospital !== req.user.hospital) {
    return forbidden(res, 'Access denied');
  }
  return success(res, log);
}

/**
 * DELETE /api/v1/exposure/:id  (admin only — soft delete with audit)
 */
function deleteExposure(req, res) {
  const db = getDb();
  const log = db.prepare('SELECT * FROM exposure_logs WHERE id = ? AND is_deleted = 0').get(req.params.id);
  if (!log) return notFound(res, 'Exposure record not found');

  db.prepare(
    `UPDATE exposure_logs SET is_deleted=1, deleted_by=?, deleted_at=CURRENT_TIMESTAMP WHERE id=?`
  ).run(req.user.id, req.params.id);

  audit.log({
    userId: req.user.id,
    userEmail: req.user.email,
    action: 'DELETE_EXPOSURE',
    resourceType: 'exposure_log',
    resourceId: req.params.id,
    details: { card_number: log.card_number, radiation_value: log.radiation_value, timestamp: log.timestamp },
    req,
  });

  return success(res, null, 'Exposure record deleted');
}

/**
 * GET /api/v1/exposure/summary/:card_number
 */
function getExposureSummary(req, res) {
  const db = getDb();
  const { card_number } = req.params;

  // Radiologists restricted to own data
  if (req.user.role === 'radiologist' && card_number !== req.user.card_number) {
    return forbidden(res, 'Access denied');
  }

  const user = db.prepare('SELECT full_name, card_number, department, hospital FROM users WHERE card_number = ?').get(card_number);
  if (!user) return notFound(res, 'User not found');

  if (req.user.role === 'hospital_manager' && user.hospital !== req.user.hospital) {
    return forbidden(res, 'Access denied');
  }

  const { getDoseSummary } = require('../services/thresholdService');
  const summary = getDoseSummary(card_number);

  return success(res, { user, dose_summary: summary });
}

module.exports = { ingestExposure, listExposure, getExposureById, deleteExposure, getExposureSummary };
