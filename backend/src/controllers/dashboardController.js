const { getDb } = require('../config/database');
const { success } = require('../utils/response');
const { DOSE_LIMITS, DEVICE_STALE_MINUTES, DEVICE_OFFLINE_MINUTES } = require('../config/constants');

function getDeviceStatus(lastSeen) {
  if (!lastSeen) return 'offline';
  const diff = (Date.now() - new Date(lastSeen).getTime()) / 60000;
  if (diff <= DEVICE_STALE_MINUTES) return 'online';
  if (diff <= DEVICE_OFFLINE_MINUTES) return 'stale';
  return 'offline';
}

function getDashboard(req, res) {
  const db = getDb();
  const { role, card_number, hospital } = req.user;

  const now = new Date().toISOString();
  const todayStart = new Date(); todayStart.setHours(0,0,0,0);
  const weekStart = new Date(); weekStart.setDate(weekStart.getDate() - 7);
  const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0,0,0,0);
  const yearStart = new Date(); yearStart.setMonth(0,1); yearStart.setHours(0,0,0,0);

  if (role === 'radiologist') {
    return getRadiologistDashboard(db, card_number, { now, todayStart, weekStart, monthStart, yearStart }, res);
  }
  return getGlobalDashboard(db, role, hospital, { now, todayStart, weekStart, monthStart, yearStart }, res);
}

function getRadiologistDashboard(db, cardNumber, periods, res) {
  const { now, todayStart, weekStart, monthStart, yearStart } = periods;

  const doseByPeriod = (start) =>
    db.prepare(`SELECT COALESCE(SUM(radiation_value), 0) as total FROM exposure_logs WHERE card_number=? AND timestamp>=? AND timestamp<=? AND is_deleted=0`)
      .get(cardNumber, start.toISOString(), now).total;

  const annual  = doseByPeriod(yearStart);
  const monthly = doseByPeriod(monthStart);
  const weekly  = doseByPeriod(weekStart);
  const daily   = doseByPeriod(todayStart);

  // 30-day trend
  const trend = db.prepare(`
    SELECT date(timestamp) as date, SUM(radiation_value) as dose
    FROM exposure_logs
    WHERE card_number=? AND timestamp >= datetime('now','-30 days') AND is_deleted=0
    GROUP BY date(timestamp) ORDER BY date ASC
  `).all(cardNumber);

  // Recent readings (last 10)
  const recent = db.prepare(`
    SELECT el.id, el.radiation_value, el.unit, el.timestamp, el.is_anomaly, d.name as device_name, d.location
    FROM exposure_logs el LEFT JOIN devices d ON d.device_id = el.device_id
    WHERE el.card_number=? AND el.is_deleted=0
    ORDER BY el.timestamp DESC LIMIT 10
  `).all(cardNumber);

  // Unread alerts
  const alertCount = db.prepare(`SELECT COUNT(*) as n FROM alerts WHERE card_number=? AND is_acknowledged=0`).get(cardNumber).n;
  const recentAlerts = db.prepare(`SELECT * FROM alerts WHERE card_number=? ORDER BY created_at DESC LIMIT 5`).all(cardNumber);

  return success(res, {
    dose_summary: {
      annual:  { value: annual,  limit: DOSE_LIMITS.ANNUAL_LIMIT,  warning: DOSE_LIMITS.ANNUAL_WARNING,  percent: (annual / DOSE_LIMITS.ANNUAL_LIMIT * 100).toFixed(1) },
      monthly: { value: monthly, limit: DOSE_LIMITS.MONTHLY_LIMIT, warning: DOSE_LIMITS.MONTHLY_WARNING, percent: (monthly / DOSE_LIMITS.MONTHLY_LIMIT * 100).toFixed(1) },
      weekly:  { value: weekly,  limit: DOSE_LIMITS.WEEKLY_LIMIT,  warning: DOSE_LIMITS.WEEKLY_WARNING,  percent: (weekly / DOSE_LIMITS.WEEKLY_LIMIT * 100).toFixed(1) },
      daily:   { value: daily,   limit: DOSE_LIMITS.DAILY_LIMIT,   warning: DOSE_LIMITS.DAILY_WARNING,   percent: (daily / DOSE_LIMITS.DAILY_LIMIT * 100).toFixed(1) },
    },
    trend,
    recent_readings: recent,
    unread_alerts: alertCount,
    recent_alerts: recentAlerts,
  });
}

function getGlobalDashboard(db, role, hospital, periods, res) {
  const { now, todayStart, weekStart, monthStart, yearStart } = periods;

  // For hospital_manager, scope to their hospital
  const hospitalFilter = (role === 'hospital_manager' && hospital) ? `AND u.hospital = '${hospital.replace(/'/g,"''")}'` : '';

  // Total exposure today / week / month
  const todayDose   = db.prepare(`SELECT COALESCE(SUM(el.radiation_value),0) as total FROM exposure_logs el LEFT JOIN users u ON u.card_number=el.card_number WHERE el.timestamp>=? AND el.is_deleted=0 ${hospitalFilter}`).get(todayStart.toISOString()).total;
  const weekDose    = db.prepare(`SELECT COALESCE(SUM(el.radiation_value),0) as total FROM exposure_logs el LEFT JOIN users u ON u.card_number=el.card_number WHERE el.timestamp>=? AND el.is_deleted=0 ${hospitalFilter}`).get(weekStart.toISOString()).total;
  const monthDose   = db.prepare(`SELECT COALESCE(SUM(el.radiation_value),0) as total FROM exposure_logs el LEFT JOIN users u ON u.card_number=el.card_number WHERE el.timestamp>=? AND el.is_deleted=0 ${hospitalFilter}`).get(monthStart.toISOString()).total;

  // Active/total users (radiologists)
  const totalUsers  = db.prepare(`SELECT COUNT(*) as n FROM users WHERE role='radiologist' AND is_active=1 ${hospitalFilter.replace('el.','u.')}`).get().n;

  // Active devices
  const allDevices = db.prepare('SELECT device_id, last_seen FROM devices WHERE is_active=1').all();
  const devStatus = { online: 0, stale: 0, offline: 0 };
  allDevices.forEach(d => devStatus[getDeviceStatus(d.last_seen)]++);

  // Unacknowledged alerts
  const criticalAlerts = db.prepare(`SELECT COUNT(*) as n FROM alerts WHERE type='critical' AND is_acknowledged=0`).get().n;
  const warningAlerts  = db.prepare(`SELECT COUNT(*) as n FROM alerts WHERE type='warning'  AND is_acknowledged=0`).get().n;
  const recentAlerts   = db.prepare(`SELECT a.*, u.full_name FROM alerts a LEFT JOIN users u ON u.card_number=a.card_number ORDER BY created_at DESC LIMIT 10`).all();

  // Top exposure users (annual)
  const topUsers = db.prepare(`
    SELECT el.card_number, u.full_name, u.department, u.hospital,
           SUM(el.radiation_value) as annual_dose
    FROM exposure_logs el
    JOIN users u ON u.card_number = el.card_number
    WHERE el.timestamp >= ? AND el.is_deleted = 0 AND u.is_active = 1
    ${hospitalFilter}
    GROUP BY el.card_number
    ORDER BY annual_dose DESC LIMIT 10
  `).all(yearStart.toISOString());

  // 30-day system trend
  const trend = db.prepare(`
    SELECT date(el.timestamp) as date, SUM(el.radiation_value) as dose, COUNT(*) as readings
    FROM exposure_logs el LEFT JOIN users u ON u.card_number=el.card_number
    WHERE el.timestamp >= datetime('now','-30 days') AND el.is_deleted=0
    ${hospitalFilter}
    GROUP BY date(el.timestamp) ORDER BY date ASC
  `).all();

  // Compliance: users above annual warning threshold
  const atRisk = db.prepare(`
    SELECT el.card_number, u.full_name, u.department, u.hospital, SUM(el.radiation_value) as annual_dose
    FROM exposure_logs el JOIN users u ON u.card_number=el.card_number
    WHERE el.timestamp >= ? AND el.is_deleted=0 AND u.role='radiologist'
    GROUP BY el.card_number
    HAVING annual_dose >= ?
  `).all(yearStart.toISOString(), DOSE_LIMITS.ANNUAL_WARNING);

  // Department breakdown
  const deptBreakdown = db.prepare(`
    SELECT u.department, COALESCE(u.hospital,'Unknown') as hospital,
           COUNT(DISTINCT el.card_number) as users,
           SUM(el.radiation_value) as total_dose,
           AVG(el.radiation_value) as avg_dose
    FROM exposure_logs el JOIN users u ON u.card_number=el.card_number
    WHERE el.timestamp >= ? AND el.is_deleted=0
    GROUP BY u.department, u.hospital ORDER BY total_dose DESC
  `).all(monthStart.toISOString());

  return success(res, {
    totals: {
      today: parseFloat(todayDose.toFixed(4)),
      week:  parseFloat(weekDose.toFixed(4)),
      month: parseFloat(monthDose.toFixed(4)),
    },
    users: { total: totalUsers, at_risk: atRisk.length },
    devices: devStatus,
    alerts: { critical: criticalAlerts, warning: warningAlerts, total: criticalAlerts + warningAlerts },
    recent_alerts: recentAlerts,
    top_users: topUsers,
    trend,
    at_risk_users: atRisk,
    department_breakdown: deptBreakdown,
  });
}

// Exposure chart data for a specific user or system
function getChartData(req, res) {
  const db = getDb();
  const { card_number, period = '30d', granularity = 'day' } = req.query;

  const periodMap = { '7d': 7, '30d': 30, '90d': 90, '1y': 365 };
  const days = periodMap[period] || 30;

  // Restrict radiologists to their own card
  const targetCard = req.user.role === 'radiologist' ? req.user.card_number : (card_number || null);

  const cardFilter = targetCard ? `AND el.card_number = '${targetCard.replace(/'/g,"''")}'` : '';

  const data = db.prepare(`
    SELECT
      strftime('%Y-%m-%d', el.timestamp) as date,
      SUM(el.radiation_value) as dose,
      COUNT(*) as readings,
      SUM(el.is_anomaly) as anomalies
    FROM exposure_logs el
    WHERE el.timestamp >= datetime('now', '-${days} days') AND el.is_deleted=0
    ${cardFilter}
    GROUP BY date ORDER BY date ASC
  `).all();

  return success(res, data);
}

module.exports = { getDashboard, getChartData };
