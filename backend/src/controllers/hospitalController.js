const { getDb } = require('../config/database');
const { success, created, error, notFound } = require('../utils/response');

function listHospitals(req, res) {
  const db = getDb();

  // Source of truth: the hospitals table
  const rows = db.prepare('SELECT name FROM hospitals ORDER BY name').all();

  const hospitals = rows.map(({ name }) => {
    const deviceCount = db.prepare(
      'SELECT COUNT(*) AS n FROM devices WHERE hospital = ? AND is_active = 1'
    ).get(name).n;

    const staffCount = db.prepare(
      'SELECT COUNT(*) AS n FROM users WHERE hospital = ? AND is_active = 1'
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

function createHospital(req, res) {
  const { name } = req.body;
  if (!name || !name.trim()) return error(res, 'Hospital name is required');

  const db = getDb();
  try {
    db.prepare('INSERT INTO hospitals (name) VALUES (?)').run(name.trim());
  } catch (e) {
    if (e.code === 'SQLITE_CONSTRAINT_PRIMARYKEY' || e.message?.includes('UNIQUE')) {
      return error(res, 'Hospital already registered', 409);
    }
    throw e;
  }
  return created(res, { name: name.trim() }, 'Hospital registered');
}

function deleteHospital(req, res) {
  const db = getDb();
  const name = decodeURIComponent(req.params.name);
  const row = db.prepare('SELECT name FROM hospitals WHERE name = ?').get(name);
  if (!row) return notFound(res, 'Hospital not found');

  // Prevent deletion if devices or users are still linked
  const devCount  = db.prepare('SELECT COUNT(*) AS n FROM devices WHERE hospital = ? AND is_active = 1').get(name).n;
  const userCount = db.prepare('SELECT COUNT(*) AS n FROM users  WHERE hospital = ? AND is_active = 1').get(name).n;
  if (devCount > 0 || userCount > 0) {
    return error(res, `Cannot remove hospital — ${devCount} active device(s) and ${userCount} active user(s) are still linked.`, 409);
  }

  db.prepare('DELETE FROM hospitals WHERE name = ?').run(name);
  return success(res, null, 'Hospital removed');
}

function getHospitalDetails(req, res) {
  const db = getDb();
  const name = decodeURIComponent(req.params.name);

  const devices = db.prepare(`
    SELECT id, device_id, name, location, hospital, last_seen, firmware_version, is_active, created_at
    FROM devices WHERE hospital = ? AND is_active = 1 ORDER BY name
  `).all(name).map((d) => {
    const diffMinutes = d.last_seen
      ? (Date.now() - new Date(d.last_seen).getTime()) / 60000
      : Infinity;
    const status = diffMinutes <= 30 ? 'online' : diffMinutes <= 120 ? 'stale' : 'offline';
    return { ...d, status };
  });

  const deviceIds = devices.map((d) => d.device_id);

  let exposureStaff = [];
  if (deviceIds.length) {
    const placeholders = deviceIds.map(() => '?').join(',');
    exposureStaff = db.prepare(`
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

  const registeredStaff = db.prepare(
    'SELECT id, full_name, card_number, department, hospital, role FROM users WHERE hospital = ? AND is_active = 1'
  ).all(name);

  const staffMap = new Map(exposureStaff.map((s) => [s.card_number, s]));
  const merged = registeredStaff.map((u) =>
    staffMap.has(u.card_number)
      ? staffMap.get(u.card_number)
      : { ...u, total_readings: 0, total_dose: 0, last_reading: null }
  );
  exposureStaff.forEach((s) => {
    if (!merged.find((m) => m.card_number === s.card_number)) merged.push(s);
  });
  merged.sort((a, b) => b.total_dose - a.total_dose);

  return success(res, { name, devices, staff: merged });
}

module.exports = { listHospitals, createHospital, deleteHospital, getHospitalDetails };
