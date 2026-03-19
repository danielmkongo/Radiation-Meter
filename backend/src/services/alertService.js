const { getDb } = require('../config/database');
const { ALERT_SEVERITY, ALERT_CATEGORY } = require('../config/constants');
const { v4: uuidv4 } = require('uuid');

/**
 * Create an alert, avoiding duplicates for the same period/type within 1 hour
 */
function createAlert({ type, category, cardNumber, deviceId, message, radiationValue, thresholdValue, period }) {
  const db = getDb();

  // Deduplicate: don't create same category+period+cardNumber alert within 1 hour
  const existing = db.prepare(`
    SELECT id FROM alerts
    WHERE category = ?
      AND card_number IS ?
      AND device_id IS ?
      AND period IS ?
      AND is_acknowledged = 0
      AND created_at > datetime('now', '-1 hour')
  `).get(category, cardNumber || null, deviceId || null, period || null);

  if (existing) return existing.id;

  const id = uuidv4();
  db.prepare(`
    INSERT INTO alerts (id, type, category, card_number, device_id, message, radiation_value, threshold_value, period)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, type, category, cardNumber || null, deviceId || null, message, radiationValue || null, thresholdValue || null, period || null);

  return id;
}

/**
 * Create threshold violation alerts from evaluateThresholds() result
 */
function processThresholdViolations(cardNumber, violations) {
  for (const v of violations) {
    createAlert({
      type: v.severity,
      category: ALERT_CATEGORY.THRESHOLD_EXCEEDED,
      cardNumber,
      message: v.message,
      radiationValue: v.dose,
      thresholdValue: v.limit,
      period: v.period,
    });
  }
}

/**
 * Create anomaly alert
 */
function createAnomalyAlert(cardNumber, deviceId, radiationValue, zScore) {
  return createAlert({
    type: ALERT_SEVERITY.WARNING,
    category: ALERT_CATEGORY.ANOMALY_DETECTED,
    cardNumber,
    deviceId,
    message: `Anomalous radiation reading detected: ${radiationValue.toFixed(4)} mSv (Z-score: ${zScore})`,
    radiationValue,
    period: null,
  });
}

/**
 * Create device offline alert
 */
function createDeviceOfflineAlert(deviceId) {
  return createAlert({
    type: ALERT_SEVERITY.WARNING,
    category: ALERT_CATEGORY.DEVICE_OFFLINE,
    deviceId,
    message: `Device ${deviceId} has gone offline (no data received for >2 hours)`,
    period: null,
  });
}

module.exports = {
  createAlert,
  processThresholdViolations,
  createAnomalyAlert,
  createDeviceOfflineAlert,
};
