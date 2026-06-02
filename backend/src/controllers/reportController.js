const { getDb } = require('../config/database');
const { error } = require('../utils/response');
const { DOSE_LIMITS } = require('../config/constants');

// ─── Helpers ──────────────────────────────────────────────────────────────────

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Validate a YYYY-MM-DD..YYYY-MM-DD range and return inclusive datetime bounds.
 * Returns { startBound, endBound } or throws an Error with a user-facing message.
 */
function parseDateRange(start_date, end_date) {
  if (!start_date || !end_date) throw new Error('start_date and end_date are required');
  if (!DATE_RE.test(start_date) || !DATE_RE.test(end_date)) {
    throw new Error('Dates must be in YYYY-MM-DD format');
  }
  const start = new Date(`${start_date}T00:00:00`);
  const end = new Date(`${end_date}T23:59:59`);
  if (isNaN(start) || isNaN(end)) throw new Error('Invalid date value');
  if (end < start) throw new Error('end_date must be on or after start_date');
  // Inclusive bounds covering the whole end day (timestamps are full datetimes)
  return { startBound: `${start_date} 00:00:00`, endBound: `${end_date} 23:59:59.999` };
}

/** Escape a single CSV field. */
function csv(v) {
  if (v === null || v === undefined) return '';
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Build a CSV string from an array of header names and row arrays. */
function toCsv(headers, rows) {
  return [headers.map(csv).join(','), ...rows.map((r) => r.map(csv).join(','))].join('\n');
}

/** Compute dose statistics from a list of readings. */
function computeStats(values) {
  const n = values.length;
  if (n === 0) return { count: 0, total: 0, average: 0, min: 0, max: 0 };
  let total = 0, min = values[0], max = values[0];
  for (const v of values) { total += v; if (v < min) min = v; if (v > max) max = v; }
  return {
    count: n,
    total: +total.toFixed(4),
    average: +(total / n).toFixed(4),
    min: +min.toFixed(4),
    max: +max.toFixed(4),
  };
}

function sendCsv(res, filename, body) {
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(body);
}

// ─── Exposure detail report (with summary block) ────────────────────────────────

function generateCsvReport(req, res) {
  const db = getDb();
  const { card_number, hospital } = req.query;

  let bounds;
  try {
    bounds = parseDateRange(req.query.start_date, req.query.end_date);
  } catch (e) {
    return error(res, e.message);
  }

  const conditions = ['el.is_deleted = 0', 'el.timestamp >= ?', 'el.timestamp <= ?'];
  const params = [bounds.startBound, bounds.endBound];

  // Role-based scoping (parameterized — no string interpolation)
  if (req.user.role === 'radiologist') {
    conditions.push('el.card_number = ?');
    params.push(req.user.card_number);
  } else if (req.user.role === 'hospital_manager' && req.user.hospital) {
    conditions.push('u.hospital = ?');
    params.push(req.user.hospital);
    if (card_number) { conditions.push('el.card_number = ?'); params.push(card_number.toUpperCase()); }
  } else {
    if (card_number) { conditions.push('el.card_number = ?'); params.push(card_number.toUpperCase()); }
    if (hospital) { conditions.push('u.hospital = ?'); params.push(hospital); }
  }

  const rows = db.prepare(`
    SELECT el.id, el.card_number, u.full_name, u.department, u.hospital,
           el.device_id, d.name as device_name, d.location,
           el.radiation_value, el.unit, el.timestamp, el.is_anomaly, el.created_at
    FROM exposure_logs el
    LEFT JOIN users u ON u.card_number = el.card_number
    LEFT JOIN devices d ON d.device_id = el.device_id
    WHERE ${conditions.join(' AND ')}
    ORDER BY el.timestamp DESC
  `).all(...params);

  const stats = computeStats(rows.map((r) => r.radiation_value));
  const anomalies = rows.filter((r) => r.is_anomaly).length;

  // Summary block (Metric,Value), then a blank line, then the detail table
  const summary = toCsv(['Metric', 'Value'], [
    ['Report', 'Exposure Detail Report'],
    ['Generated', new Date().toISOString()],
    ['Date range', `${req.query.start_date} to ${req.query.end_date}`],
    ['Total readings', stats.count],
    ['Total dose (mSv)', stats.total],
    ['Average dose (mSv)', stats.average],
    ['Peak dose (mSv)', stats.max],
    ['Minimum dose (mSv)', stats.min],
    ['Anomalies flagged', anomalies],
  ]);

  const detail = toCsv(
    ['ID', 'Card Number', 'Full Name', 'Department', 'Hospital', 'Device ID', 'Device Name',
     'Location', 'Dose (mSv)', 'Unit', 'Timestamp', 'Anomaly', 'Created At'],
    rows.map((r) => [
      r.id, r.card_number, r.full_name, r.department, r.hospital, r.device_id, r.device_name,
      r.location, r.radiation_value, r.unit, r.timestamp, r.is_anomaly ? 'Yes' : 'No', r.created_at,
    ])
  );

  sendCsv(res, `exposure_report_${req.query.start_date}_to_${req.query.end_date}.csv`, `${summary}\n\n${detail}`);
}

// ─── Compliance summary (annual dose per radiologist) ───────────────────────────

function generateComplianceSummary(req, res) {
  const db = getDb();
  const yearStart = new Date(); yearStart.setMonth(0, 1); yearStart.setHours(0, 0, 0, 0);

  const conditions = ["u.role = 'radiologist'", 'u.is_active = 1'];
  const params = [yearStart.toISOString()];
  if (req.user.role === 'hospital_manager' && req.user.hospital) {
    conditions.push('u.hospital = ?');
    params.push(req.user.hospital);
  }

  const users = db.prepare(`
    SELECT u.card_number, u.full_name, u.department, u.hospital, u.email,
           COALESCE(SUM(el.radiation_value), 0) as annual_dose
    FROM users u
    LEFT JOIN exposure_logs el ON el.card_number = u.card_number
      AND el.timestamp >= ? AND el.is_deleted = 0
    WHERE ${conditions.join(' AND ')}
    GROUP BY u.card_number
    ORDER BY annual_dose DESC
  `).all(...params);

  const summary = users.map((u) => {
    const annual = +u.annual_dose.toFixed(4);
    return {
      ...u,
      annual_dose: annual,
      percent_of_limit: +(annual / DOSE_LIMITS.ANNUAL_LIMIT * 100).toFixed(1),
      status: annual >= DOSE_LIMITS.ANNUAL_LIMIT ? 'critical'
            : annual >= DOSE_LIMITS.ANNUAL_WARNING ? 'warning' : 'safe',
    };
  });

  const counts = { safe: 0, warning: 0, critical: 0 };
  for (const u of summary) counts[u.status]++;

  const head = toCsv(['Metric', 'Value'], [
    ['Report', 'Annual Compliance Summary'],
    ['Generated', new Date().toISOString()],
    ['Year', new Date().getFullYear()],
    ['Annual limit (mSv)', DOSE_LIMITS.ANNUAL_LIMIT],
    ['Radiologists', summary.length],
    ['Safe', counts.safe],
    ['Warning', counts.warning],
    ['Critical', counts.critical],
  ]);

  const table = toCsv(
    ['Card Number', 'Full Name', 'Department', 'Hospital', 'Annual Dose (mSv)', '% of Limit', 'Status'],
    summary.map((u) => [u.card_number, u.full_name, u.department, u.hospital, u.annual_dose, u.percent_of_limit, u.status])
  );

  sendCsv(res, `compliance_summary_${new Date().toISOString().split('T')[0]}.csv`, `${head}\n\n${table}`);
}

// ─── Per-device summary report ──────────────────────────────────────────────────

function generateDeviceSummary(req, res) {
  const db = getDb();

  let bounds;
  try {
    bounds = parseDateRange(req.query.start_date, req.query.end_date);
  } catch (e) {
    return error(res, e.message);
  }

  // Date range is applied in the LEFT JOIN so devices with no readings still appear.
  const joinParams = [bounds.startBound, bounds.endBound];

  // Hospital scoping lives in the WHERE (device-level).
  let whereClause = '1=1';
  const whereParams = [];
  const hospital = (req.user.role === 'hospital_manager' && req.user.hospital)
    ? req.user.hospital
    : req.query.hospital;
  if (hospital) { whereClause = 'd.hospital = ?'; whereParams.push(hospital); }

  const rows = db.prepare(`
    SELECT d.device_id, d.name, d.location, d.hospital,
           COUNT(el.id) as readings,
           COALESCE(SUM(el.radiation_value), 0) as total_dose,
           COALESCE(AVG(el.radiation_value), 0) as avg_dose,
           COALESCE(MAX(el.radiation_value), 0) as peak_dose,
           SUM(CASE WHEN el.is_anomaly = 1 THEN 1 ELSE 0 END) as anomalies,
           MAX(el.timestamp) as last_reading
    FROM devices d
    LEFT JOIN exposure_logs el ON el.device_id = d.device_id
      AND el.timestamp >= ? AND el.timestamp <= ? AND el.is_deleted = 0
    WHERE ${whereClause}
    GROUP BY d.device_id
    ORDER BY total_dose DESC
  `).all(...joinParams, ...whereParams);

  const head = toCsv(['Metric', 'Value'], [
    ['Report', 'Per-Device Summary'],
    ['Generated', new Date().toISOString()],
    ['Date range', `${req.query.start_date} to ${req.query.end_date}`],
    ['Devices', rows.length],
  ]);

  const table = toCsv(
    ['Device ID', 'Name', 'Location', 'Hospital', 'Readings', 'Total Dose (mSv)',
     'Avg Dose (mSv)', 'Peak Dose (mSv)', 'Anomalies', 'Last Reading'],
    rows.map((r) => [
      r.device_id, r.name, r.location, r.hospital, r.readings,
      +r.total_dose.toFixed(4), +r.avg_dose.toFixed(4), +r.peak_dose.toFixed(4),
      r.anomalies || 0, r.last_reading || 'Never',
    ])
  );

  sendCsv(res, `device_summary_${req.query.start_date}_to_${req.query.end_date}.csv`, `${head}\n\n${table}`);
}

module.exports = { generateCsvReport, generateComplianceSummary, generateDeviceSummary };
