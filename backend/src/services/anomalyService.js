const { getDb } = require('../config/database');
const { ANOMALY, DOSE_LIMITS } = require('../config/constants');

/**
 * Detect if a radiation reading is anomalous using Z-score against rolling window.
 * Also flags absolute spikes regardless of history.
 */
function detectAnomaly(cardNumber, newValue) {
  const db = getDb();

  // Absolute spike check: if value > N × daily limit, always flag
  const absoluteSpike = newValue > DOSE_LIMITS.DAILY_LIMIT * ANOMALY.SPIKE_MULTIPLIER;
  if (absoluteSpike) {
    return { isAnomaly: true, reason: 'absolute_spike', zScore: null };
  }

  // Get rolling window of recent readings for this user
  const recentReadings = db
    .prepare(`
      SELECT radiation_value
      FROM exposure_logs
      WHERE card_number = ? AND is_deleted = 0
      ORDER BY timestamp DESC
      LIMIT ?
    `)
    .all(cardNumber, ANOMALY.ROLLING_WINDOW);

  if (recentReadings.length < 5) {
    // Not enough history for reliable stats
    return { isAnomaly: false, reason: null, zScore: null };
  }

  const values = recentReadings.map((r) => r.radiation_value);
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length;
  const stdDev = Math.sqrt(variance);

  if (stdDev === 0) {
    return { isAnomaly: false, reason: null, zScore: 0 };
  }

  const zScore = (newValue - mean) / stdDev;
  const isAnomaly = Math.abs(zScore) > ANOMALY.Z_SCORE_THRESHOLD;

  return {
    isAnomaly,
    reason: isAnomaly ? 'statistical_outlier' : null,
    zScore: parseFloat(zScore.toFixed(3)),
    mean: parseFloat(mean.toFixed(6)),
    stdDev: parseFloat(stdDev.toFixed(6)),
  };
}

module.exports = { detectAnomaly };
