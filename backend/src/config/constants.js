/**
 * System-wide constants and regulatory thresholds
 * Based on ICRP Publication 103, WHO guidelines, and TAEC regulations
 */

// ─── Roles ──────────────────────────────────────────────────────────────────
const ROLES = {
  ADMIN: 'admin',
  HOSPITAL_MANAGER: 'hospital_manager',
  REGULATOR: 'regulator',
  RADIOLOGIST: 'radiologist',
};

// ─── Dose Thresholds (mSv) ───────────────────────────────────────────────────
// ICRP / TAEC occupational exposure limits for radiation workers
const DOSE_LIMITS = {
  // Annual limits
  ANNUAL_LIMIT: 20,          // 20 mSv/year (averaged over 5 years)
  ANNUAL_SINGLE_MAX: 50,     // Never exceed 50 mSv in a single year
  ANNUAL_WARNING: 15,        // 75% of annual limit → Warning

  // Derived period limits (pro-rated from 20 mSv/year)
  MONTHLY_LIMIT: 1.667,      // 20 / 12
  MONTHLY_WARNING: 1.25,     // 75% of monthly limit

  WEEKLY_LIMIT: 0.385,       // 20 / 52
  WEEKLY_WARNING: 0.288,     // 75% of weekly limit

  DAILY_LIMIT: 0.0548,       // 20 / 365
  DAILY_WARNING: 0.041,      // 75% of daily limit

  // 5-year cumulative limit
  FIVE_YEAR_LIMIT: 100,      // 100 mSv over 5 years
};

// ─── Alert Severity ──────────────────────────────────────────────────────────
const ALERT_SEVERITY = {
  WARNING: 'warning',
  CRITICAL: 'critical',
};

// ─── Alert Categories ────────────────────────────────────────────────────────
const ALERT_CATEGORY = {
  THRESHOLD_EXCEEDED: 'threshold_exceeded',
  ANOMALY_DETECTED: 'anomaly_detected',
  DEVICE_OFFLINE: 'device_offline',
  SPIKE_DETECTED: 'spike_detected',
};

// ─── Device Status ───────────────────────────────────────────────────────────
const DEVICE_STATUS = {
  ONLINE: 'online',
  OFFLINE: 'offline',
  STALE: 'stale',
};

// Device is considered stale if no ping in 30 minutes, offline after 2 hours
const DEVICE_STALE_MINUTES = 30;
const DEVICE_OFFLINE_MINUTES = 120;

// ─── Anomaly Detection ───────────────────────────────────────────────────────
const ANOMALY = {
  Z_SCORE_THRESHOLD: 3,     // Flag if > 3 standard deviations from mean
  ROLLING_WINDOW: 30,       // Use last 30 readings for stats
  SPIKE_MULTIPLIER: 5,      // Flag if > 5x the daily limit (absolute spike)
};

// ─── Rate Limits ─────────────────────────────────────────────────────────────
const RATE_LIMITS = {
  AUTH_WINDOW_MS: 15 * 60 * 1000,   // 15 minutes
  AUTH_MAX_REQUESTS: 20,
  API_WINDOW_MS: 15 * 60 * 1000,
  API_MAX_REQUESTS: 500,
  INGESTION_WINDOW_MS: 60 * 1000,   // 1 minute
  INGESTION_MAX_REQUESTS: 120,       // 2 per second burst
};

module.exports = {
  ROLES,
  DOSE_LIMITS,
  ALERT_SEVERITY,
  ALERT_CATEGORY,
  DEVICE_STATUS,
  DEVICE_STALE_MINUTES,
  DEVICE_OFFLINE_MINUTES,
  ANOMALY,
  RATE_LIMITS,
};
