const { getDb } = require('../config/database');
const { success } = require('../utils/response');

function listHospitals(req, res) {
  const db = getDb();

  // Collect all distinct hospital names from both tables
  const names = db.prepare(`
    SELECT hospital FROM devices WHERE hospital IS NOT NULL AND hospital != ''
    UNION
    SELECT hospital FROM users  WHERE hospital IS NOT NULL AND hospital != ''
    ORDER BY hospital
  `).all().map((r) => r.hospital);

  const hospitals = names.map((name) => {
    const deviceCount = db.prepare(
      `SELECT COUNT(*) AS n FROM devices WHERE hospital = ? AND is_active = 1`
    ).get(name).n;

    const staffCount = db.prepare(
      `SELECT COUNT(*) AS n FROM users WHERE hospital = ? AND is_active = 1`
    ).get(name).n;

    const monthlyExposure = db.prepare(`
      SELECT COALESCE(SUM(el.radiation_value), 0) AS total
      FROM exposure_logs el
      JOIN devices d ON d.device_id = el.device_id
      WHERE d.hospital = ? AND el.is_deleted = 0
        AND el.timestamp >= date('now', 'start of month')
    `).get(name).total;

    const annualExposure = db.prepare(`
      SELECT COALESCE(SUM(el.radiation_value), 0) AS total
      FROM exposure_logs el
      JOIN devices d ON d.device_id = el.device_id
      WHERE d.hospital = ? AND el.is_deleted = 0
        AND el.timestamp >= date('now', '-12 months')
    `).get(name).total;

    return { name, deviceCount, staffCount, monthlyExposure, annualExposure };
  });

  return success(res, hospitals);
}

function getHospitalDetails(req, res) {
  const db = getDb();
  const name = decodeURIComponent(req.params.name);

  // Devices belonging to this hospital
  const devices = db.prepare(`
    SELECT id, device_id, name, location, hospital, last_seen, firmware_version, is_active, created_at
    FROM devices WHERE hospital = ? AND is_active = 1 ORDER BY name
  `).all(name).map((d) => {
    const diffMinutes = d.last_seen
      ? (Date.now() - new Date(d.last_seen).getTime()) / 60000
      : Infinity;
    const status = diffMinutes <= 5 ? 'online' : diffMinutes <= 60 ? 'stale' : 'offline';
    return { ...d, status };
  });

  const deviceIds = devices.map((d) => d.device_id);

  // Users who have logged exposure through any device in this hospital
  let staff = [];
  if (deviceIds.length) {
    const placeholders = deviceIds.map(() => '?').join(',');
    staff = db.prepare(`
      SELECT
        u.id, u.full_name, u.card_number, u.department, u.hospital, u.role,
        COUNT(el.id)                         AS total_readings,
        COALESCE(SUM(el.radiation_value), 0) AS total_dose,
        MAX(el.timestamp)                    AS last_reading
      FROM exposure_logs el
      JOIN users u ON u.card_number = el.card_number
      WHERE el.device_id IN (${placeholders}) AND el.is_deleted = 0
      GROUP BY u.card_number
      ORDER BY total_dose DESC
    `).all(...deviceIds);
  }

  // Also include users registered in this hospital even if no exposure yet
  const registeredStaff = db.prepare(`
    SELECT id, full_name, card_number, department, hospital, role
    FROM users WHERE hospital = ? AND is_active = 1
  `).all(name);

  // Merge: start with registeredStaff, overlay exposure data from staff
  const staffMap = new Map(staff.map((s) => [s.card_number, s]));
  const merged = registeredStaff.map((u) =>
    staffMap.has(u.card_number)
      ? staffMap.get(u.card_number)
      : { ...u, total_readings: 0, total_dose: 0, last_reading: null }
  );
  // Add any staff who used devices here but aren't registered to this hospital
  staff.forEach((s) => {
    if (!merged.find((m) => m.card_number === s.card_number)) merged.push(s);
  });
  merged.sort((a, b) => b.total_dose - a.total_dose);

  return success(res, { name, devices, staff: merged });
}

module.exports = { listHospitals, getHospitalDetails };
