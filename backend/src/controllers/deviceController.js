const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../config/database');
const { success, created, error, notFound, paginated } = require('../utils/response');
const audit = require('../services/auditService');
const { DEVICE_STATUS, DEVICE_STALE_MINUTES, DEVICE_OFFLINE_MINUTES } = require('../config/constants');

function computeDeviceStatus(lastSeen) {
  if (!lastSeen) return DEVICE_STATUS.OFFLINE;
  const diffMinutes = (Date.now() - new Date(lastSeen).getTime()) / 60000;
  if (diffMinutes <= DEVICE_STALE_MINUTES) return DEVICE_STATUS.ONLINE;
  if (diffMinutes <= DEVICE_OFFLINE_MINUTES) return DEVICE_STATUS.STALE;
  return DEVICE_STATUS.OFFLINE;
}

function listDevices(req, res) {
  const db = getDb();
  const { hospital, search, page = 1, limit = 20 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);

  let where = ['1=1'];
  const params = [];
  
  // Hospital manager can only see their own hospital's devices
  if (req.user.role === 'hospital_manager' && req.user.hospital) {
    where.push('hospital = ?');
    params.push(req.user.hospital);
  } else if (hospital) {
    where.push('hospital = ?');
    params.push(hospital);
  }
  
  if (search) {
    where.push('(device_id LIKE ? OR name LIKE ? OR location LIKE ?)');
    const s = `%${search}%`;
    params.push(s, s, s);
  }

  const whereClause = where.join(' AND ');
  const total = db.prepare(`SELECT COUNT(*) as n FROM devices WHERE ${whereClause}`).get(...params).n;
  const devices = db.prepare(
    `SELECT id, device_id, name, location, hospital, last_seen, firmware_version, is_active, created_at
     FROM devices WHERE ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`
  ).all(...params, parseInt(limit), offset);

  const enriched = devices.map((d) => ({ ...d, status: computeDeviceStatus(d.last_seen) }));
  return paginated(res, enriched, { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) });
}

function getDevice(req, res) {
  const db = getDb();
  const device = db.prepare(
    'SELECT id, device_id, name, location, hospital, last_seen, firmware_version, is_active, created_at FROM devices WHERE id = ?'
  ).get(req.params.id);
  if (!device) return notFound(res, 'Device not found');
  
  // Hospital manager can only view their own hospital's devices
  if (req.user.role === 'hospital_manager' && device.hospital !== req.user.hospital) {
    return notFound(res, 'Device not found');
  }
  
  return success(res, { ...device, status: computeDeviceStatus(device.last_seen) });
}

function createDevice(req, res) {
  const { device_id, name, location, hospital, firmware_version } = req.body;
  if (!device_id || !name || !location) {
    return error(res, 'device_id, name, and location are required');
  }

  const db = getDb();
  const api_key = `rm_${uuidv4().replace(/-/g, '')}`;
  const id = uuidv4();

  try {
    db.prepare(
      `INSERT INTO devices (id, device_id, name, location, hospital, api_key, firmware_version)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(id, device_id.toUpperCase().trim(), name, location, hospital || null, api_key, firmware_version || '1.0.0');
  } catch (e) {
    if (e.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return error(res, 'Device ID already registered', 409);
    }
    throw e;
  }

  audit.log({ userId: req.user.id, userEmail: req.user.email, action: 'CREATE_DEVICE', resourceType: 'device', resourceId: device_id, req });

  const device = db.prepare('SELECT * FROM devices WHERE id = ?').get(id);
  return created(res, { ...device, status: DEVICE_STATUS.OFFLINE, api_key }, 'Device registered. Save the API key — it will not be shown again.');
}

function updateDevice(req, res) {
  const db = getDb();
  const device = db.prepare('SELECT * FROM devices WHERE id = ?').get(req.params.id);
  if (!device) return notFound(res, 'Device not found');
  
  // Hospital manager can only update their own hospital's devices
  if (req.user.role === 'hospital_manager' && device.hospital !== req.user.hospital) {
    return notFound(res, 'Device not found');
  }

  const { name, location, hospital, firmware_version, is_active } = req.body;
  
  // Hospital manager cannot change hospital assignment
  const finalHospital = req.user.role === 'hospital_manager' ? device.hospital : (hospital !== undefined ? hospital : device.hospital);
  
  db.prepare(
    `UPDATE devices SET name=?, location=?, hospital=?, firmware_version=?, is_active=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`
  ).run(
    name ?? device.name,
    location ?? device.location,
    finalHospital,
    firmware_version ?? device.firmware_version,
    is_active !== undefined ? (is_active ? 1 : 0) : device.is_active,
    req.params.id
  );

  audit.log({ userId: req.user.id, userEmail: req.user.email, action: 'UPDATE_DEVICE', resourceType: 'device', resourceId: device.device_id, req });
  const updated = db.prepare('SELECT id, device_id, name, location, hospital, last_seen, firmware_version, is_active FROM devices WHERE id=?').get(req.params.id);
  return success(res, { ...updated, status: computeDeviceStatus(updated.last_seen) });
}

function regenerateApiKey(req, res) {
  const db = getDb();
  const device = db.prepare('SELECT * FROM devices WHERE id = ?').get(req.params.id);
  if (!device) return notFound(res, 'Device not found');
  
  // Hospital manager can only regenerate keys for their own hospital's devices
  if (req.user.role === 'hospital_manager' && device.hospital !== req.user.hospital) {
    return notFound(res, 'Device not found');
  }

  const api_key = `rm_${uuidv4().replace(/-/g, '')}`;
  db.prepare('UPDATE devices SET api_key=?, updated_at=CURRENT_TIMESTAMP WHERE id=?').run(api_key, req.params.id);
  audit.log({ userId: req.user.id, userEmail: req.user.email, action: 'REGENERATE_API_KEY', resourceType: 'device', resourceId: device.device_id, req });
  return success(res, { api_key }, 'API key regenerated. Save it — it will not be shown again.');
}

function deleteDevice(req, res) {
  const db = getDb();
  const device = db.prepare('SELECT id, device_id, hospital FROM devices WHERE id = ?').get(req.params.id);
  if (!device) return notFound(res, 'Device not found');
  
  // Hospital manager can only delete their own hospital's devices
  if (req.user.role === 'hospital_manager' && device.hospital !== req.user.hospital) {
    return notFound(res, 'Device not found');
  }
  
  db.prepare('UPDATE devices SET is_active=0, updated_at=CURRENT_TIMESTAMP WHERE id=?').run(req.params.id);
  audit.log({ userId: req.user.id, userEmail: req.user.email, action: 'DELETE_DEVICE', resourceType: 'device', resourceId: device.device_id, req });
  return success(res, null, 'Device deactivated');
}

function getDeviceUsers(req, res) {
  const db = getDb();
  const device = db.prepare('SELECT device_id, hospital FROM devices WHERE id = ?').get(req.params.id);
  if (!device) return notFound(res, 'Device not found');
  
  // Hospital manager can only view users for their own hospital's devices
  if (req.user.role === 'hospital_manager' && device.hospital !== req.user.hospital) {
    return notFound(res, 'Device not found');
  }

  const users = db.prepare(`
    SELECT
      u.id, u.full_name, u.card_number, u.department, u.hospital, u.role,
      COUNT(el.id)                     AS total_readings,
      COALESCE(SUM(el.radiation_value), 0) AS total_dose,
      MAX(el.timestamp)                AS last_reading
    FROM exposure_logs el
    JOIN users u ON u.card_number = el.card_number
    WHERE el.device_id = ? AND el.is_deleted = 0
    GROUP BY u.card_number
    ORDER BY total_dose DESC
  `).all(device.device_id);

  return success(res, { device_id: device.device_id, users });
}

module.exports = { listDevices, getDevice, createDevice, updateDevice, regenerateApiKey, deleteDevice, getDeviceUsers };
