const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../config/database');
const { success, created, error, notFound, paginated } = require('../utils/response');
const audit = require('../services/auditService');
const { ROLES } = require('../config/constants');

const VALID_ROLES = Object.values(ROLES);
const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || '12', 10);

function listUsers(req, res) {
  const db = getDb();
  const { role, hospital, search, page = 1, limit = 20 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);

  let where = ['1=1'];
  const params = [];

  if (role) { where.push('role = ?'); params.push(role); }
  if (hospital) { where.push('hospital = ?'); params.push(hospital); }
  if (search) {
    where.push('(full_name LIKE ? OR email LIKE ? OR card_number LIKE ?)');
    const s = `%${search}%`;
    params.push(s, s, s);
  }

  const whereClause = where.join(' AND ');
  const total = db.prepare(`SELECT COUNT(*) as n FROM users WHERE ${whereClause}`).get(...params).n;
  const users = db.prepare(
    `SELECT id, full_name, email, card_number, role, department, hospital, is_active, created_at
     FROM users WHERE ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`
  ).all(...params, parseInt(limit), offset);

  return paginated(res, users, { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) });
}

function getUser(req, res) {
  const db = getDb();
  const user = db
    .prepare('SELECT id, full_name, email, card_number, role, department, hospital, is_active, created_at FROM users WHERE id = ?')
    .get(req.params.id);
  if (!user) return notFound(res, 'User not found');
  return success(res, user);
}

function createUser(req, res) {
  const { full_name, email, password, card_number, role, department, hospital } = req.body;
  if (!full_name || !email || !password || !card_number || !role) {
    return error(res, 'full_name, email, password, card_number, and role are required');
  }
  if (!VALID_ROLES.includes(role)) {
    return error(res, `Role must be one of: ${VALID_ROLES.join(', ')}`);
  }
  if (password.length < 8) {
    return error(res, 'Password must be at least 8 characters');
  }

  const db = getDb();
  const id = uuidv4();
  const hash = bcrypt.hashSync(password, BCRYPT_ROUNDS);

  try {
    db.prepare(
      `INSERT INTO users (id, full_name, email, password_hash, card_number, role, department, hospital)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(id, full_name, email.toLowerCase().trim(), hash, card_number.toUpperCase().trim(), role, department || null, hospital || null);
  } catch (e) {
    if (e.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return error(res, 'Email or card number already in use', 409);
    }
    throw e;
  }

  audit.log({ userId: req.user.id, userEmail: req.user.email, action: 'CREATE_USER', resourceType: 'user', resourceId: id, req });

  const created_ = db.prepare('SELECT id, full_name, email, card_number, role, department, hospital, is_active, created_at FROM users WHERE id = ?').get(id);
  return created(res, created_, 'User created successfully');
}

function updateUser(req, res) {
  const db = getDb();
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!user) return notFound(res, 'User not found');

  const { full_name, email, role, department, hospital, is_active, password } = req.body;

  if (role && !VALID_ROLES.includes(role)) {
    return error(res, `Role must be one of: ${VALID_ROLES.join(', ')}`);
  }

  const updates = {
    full_name: full_name ?? user.full_name,
    email: email ? email.toLowerCase().trim() : user.email,
    role: role ?? user.role,
    department: department !== undefined ? department : user.department,
    hospital: hospital !== undefined ? hospital : user.hospital,
    is_active: is_active !== undefined ? (is_active ? 1 : 0) : user.is_active,
    password_hash: password ? bcrypt.hashSync(password, BCRYPT_ROUNDS) : user.password_hash,
  };

  db.prepare(
    `UPDATE users SET full_name=?, email=?, role=?, department=?, hospital=?, is_active=?, password_hash=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`
  ).run(updates.full_name, updates.email, updates.role, updates.department, updates.hospital, updates.is_active, updates.password_hash, req.params.id);

  audit.log({ userId: req.user.id, userEmail: req.user.email, action: 'UPDATE_USER', resourceType: 'user', resourceId: req.params.id, req });

  const updated = db.prepare('SELECT id, full_name, email, card_number, role, department, hospital, is_active, created_at, updated_at FROM users WHERE id = ?').get(req.params.id);
  return success(res, updated, 'User updated');
}

function deleteUser(req, res) {
  const db = getDb();
  const user = db.prepare('SELECT id, email FROM users WHERE id = ?').get(req.params.id);
  if (!user) return notFound(res, 'User not found');
  if (user.id === req.user.id) return error(res, 'Cannot delete your own account');

  db.prepare('UPDATE users SET is_active=0, updated_at=CURRENT_TIMESTAMP WHERE id=?').run(req.params.id);
  audit.log({ userId: req.user.id, userEmail: req.user.email, action: 'DELETE_USER', resourceType: 'user', resourceId: req.params.id, req });
  return success(res, null, 'User deactivated');
}

module.exports = { listUsers, getUser, createUser, updateUser, deleteUser };
