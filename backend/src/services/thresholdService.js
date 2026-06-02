const { getDb } = require('../config/database');
const { DOSE_LIMITS, ALERT_SEVERITY } = require('../config/constants');

/**
 * Get cumulative exposure for a card_number within a date range (mSv)
 */
function getCumulativeDose(cardNumber, startDate, endDate) {
  const db = getDb();
  const result = db
    .prepare(`
      SELECT COALESCE(SUM(radiation_value), 0) as total
      FROM exposure_logs
      WHERE card_number = ?
        AND timestamp >= ?
        AND timestamp <= ?
        AND is_deleted = 0
    `)
    .get(cardNumber, startDate, endDate);
  return result ? result.total : 0;
}

/**
 * Get start of current year (ISO string)
 */
function startOfYear() {
  const d = new Date();
  d.setMonth(0, 1);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function startOfMonth() {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function startOfWeek() {
  const d = new Date();
  d.setDate(d.getDate() - d.getDay());
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function startOfDay() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function now() {
  return new Date().toISOString();
}

/**
 * Evaluate a new reading against all thresholds for a user.
 * Returns array of threshold violations: { period, severity, dose, limit, message }
 */
function evaluateThresholds(cardNumber) {
  const violations = [];
  const n = now();

  const checks = [
    {
      period: 'annual',
      start: startOfYear(),
      warning: DOSE_LIMITS.ANNUAL_WARNING,
      critical: DOSE_LIMITS.ANNUAL_LIMIT,
      label: 'Annual',
    },
    {
      period: 'monthly',
      start: startOfMonth(),
      warning: DOSE_LIMITS.MONTHLY_WARNING,
      critical: DOSE_LIMITS.MONTHLY_LIMIT,
      label: 'Monthly',
    },
    {
      period: 'weekly',
      start: startOfWeek(),
      warning: DOSE_LIMITS.WEEKLY_WARNING,
      critical: DOSE_LIMITS.WEEKLY_LIMIT,
      label: 'Weekly',
    },
    {
      period: 'daily',
      start: startOfDay(),
      warning: DOSE_LIMITS.DAILY_WARNING,
      critical: DOSE_LIMITS.DAILY_LIMIT,
      label: 'Daily',
    },
  ];

  for (const check of checks) {
    const dose = getCumulativeDose(cardNumber, check.start, n);
    if (dose >= check.critical) {
      violations.push({
        period: check.period,
        severity: ALERT_SEVERITY.CRITICAL,
        dose,
        limit: check.critical,
        message: `${check.label} dose limit EXCEEDED: ${dose.toFixed(4)} mSv (limit: ${check.critical} mSv)`,
      });
    } else if (dose >= check.warning) {
      violations.push({
        period: check.period,
        severity: ALERT_SEVERITY.WARNING,
        dose,
        limit: check.warning,
        message: `${check.label} dose WARNING: ${dose.toFixed(4)} mSv (warning threshold: ${check.warning} mSv)`,
      });
    }
  }

  return violations;
}

/**
 * Get dose summary for a user across all periods
 */
function getDoseSummary(cardNumber) {
  const n = now();
  // `value` key matches what the dashboard returns and what <ExposureMeter> reads.
  const period = (start, limit, warning) => {
    const value = getCumulativeDose(cardNumber, start, n);
    return { value, limit, warning, percent: +(value / limit * 100).toFixed(1) };
  };
  return {
    annual:  period(startOfYear(),  DOSE_LIMITS.ANNUAL_LIMIT,  DOSE_LIMITS.ANNUAL_WARNING),
    monthly: period(startOfMonth(), DOSE_LIMITS.MONTHLY_LIMIT, DOSE_LIMITS.MONTHLY_WARNING),
    weekly:  period(startOfWeek(),  DOSE_LIMITS.WEEKLY_LIMIT,  DOSE_LIMITS.WEEKLY_WARNING),
    daily:   period(startOfDay(),   DOSE_LIMITS.DAILY_LIMIT,   DOSE_LIMITS.DAILY_WARNING),
  };
}

module.exports = {
  getCumulativeDose,
  evaluateThresholds,
  getDoseSummary,
  startOfYear,
  startOfMonth,
  startOfWeek,
  startOfDay,
  now,
};
