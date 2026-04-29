const { getDb } = require('../config/database');
const { error } = require('../utils/response');
const { DOSE_LIMITS } = require('../config/constants');

function generateCsvReport(req, res) {
  const db = getDb();
  const { start_date, end_date, card_number, hospital } = req.query;

  if (!start_date || !end_date) {
    return error(res, 'start_date and end_date are required');
  }

  let where = [`el.timestamp >= '${start_date}'`, `el.timestamp <= '${end_date}'`, 'el.is_deleted=0'];
  if (req.user.role === 'radiologist') {
    where.push(`el.card_number = '${req.user.card_number}'`);
  } else if (req.user.role === 'hospital_manager' && req.user.hospital) {
    where.push(`u.hospital = '${req.user.hospital.replace(/'/g, "''")}'`);
    if (card_number) where.push(`el.card_number = '${card_number.toUpperCase().replace(/'/g,"''")}'`);
  } else {
    if (card_number) where.push(`el.card_number = '${card_number.toUpperCase().replace(/'/g,"''")}'`);
    if (hospital) where.push(`u.hospital = '${hospital.replace(/'/g,"''")}'`);
  }

  const rows = db.prepare(`
    SELECT el.id, el.card_number, u.full_name, u.department, u.hospital,
           el.device_id, d.name as device_name, d.location,
           el.radiation_value, el.unit, el.timestamp, el.is_anomaly, el.created_at
    FROM exposure_logs el
    LEFT JOIN users u ON u.card_number = el.card_number
    LEFT JOIN devices d ON d.device_id = el.device_id
    WHERE ${where.join(' AND ')}
    ORDER BY el.timestamp DESC
  `).all();

  // Build CSV manually (no library needed for simple case)
  const headers = ['ID','Card Number','Full Name','Department','Hospital','Device ID','Device Name','Location','Dose (mSv)','Unit','Timestamp','Anomaly','Created At'];
  const csvRows = [headers.join(',')];
  for (const r of rows) {
    csvRows.push([
      r.id, r.card_number, `"${(r.full_name||'').replace(/"/g,'""')}"`,
      `"${(r.department||'').replace(/"/g,'""')}"`,
      `"${(r.hospital||'').replace(/"/g,'""')}"`,
      r.device_id, `"${(r.device_name||'').replace(/"/g,'""')}"`,
      `"${(r.location||'').replace(/"/g,'""')}"`,
      r.radiation_value, r.unit, r.timestamp, r.is_anomaly ? 'Yes' : 'No', r.created_at
    ].join(','));
  }

  const csv = csvRows.join('\n');
  const filename = `exposure_report_${start_date}_to_${end_date}.csv`;
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(csv);
}

function generateComplianceSummary(req, res) {
  const db = getDb();
  const yearStart = new Date(); yearStart.setMonth(0,1); yearStart.setHours(0,0,0,0);
  const now = new Date().toISOString();

  const hospitalFilter = (req.user.role === 'hospital_manager' && req.user.hospital)
    ? `AND u.hospital = '${req.user.hospital.replace(/'/g, "''")}'`
    : '';

  const users = db.prepare(`
    SELECT u.card_number, u.full_name, u.department, u.hospital, u.email,
           COALESCE(SUM(el.radiation_value), 0) as annual_dose
    FROM users u
    LEFT JOIN exposure_logs el ON el.card_number = u.card_number
      AND el.timestamp >= ? AND el.is_deleted = 0
    WHERE u.role = 'radiologist' AND u.is_active = 1 ${hospitalFilter}
    GROUP BY u.card_number
    ORDER BY annual_dose DESC
  `).all(yearStart.toISOString());

  const summary = users.map(u => ({
    ...u,
    annual_dose: parseFloat((u.annual_dose).toFixed(4)),
    percent_of_limit: parseFloat((u.annual_dose / DOSE_LIMITS.ANNUAL_LIMIT * 100).toFixed(1)),
    status: u.annual_dose >= DOSE_LIMITS.ANNUAL_LIMIT ? 'critical' :
            u.annual_dose >= DOSE_LIMITS.ANNUAL_WARNING ? 'warning' : 'safe',
  }));

  // Generate CSV
  const headers = ['Card Number','Full Name','Department','Hospital','Annual Dose (mSv)','% of Limit','Status'];
  const csvRows = [headers.join(','), ...summary.map(u => [
    u.card_number, `"${u.full_name}"`, `"${u.department||''}"`, `"${u.hospital||''}"`,
    u.annual_dose, u.percent_of_limit, u.status
  ].join(','))];

  const csv = csvRows.join('\n');
  const filename = `compliance_summary_${new Date().toISOString().split('T')[0]}.csv`;
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(csv);
}

module.exports = { generateCsvReport, generateComplianceSummary };
