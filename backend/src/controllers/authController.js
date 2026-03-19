const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getDb } = require('../config/database');
const { success, error, unauthorized } = require('../utils/response');
const audit = require('../services/auditService');

function login(req, res) {
  const { email, password } = req.body;
  if (!email || !password) {
    return error(res, 'Email and password are required');
  }

  const db = getDb();
  const user = db
    .prepare('SELECT * FROM users WHERE email = ? AND is_active = 1')
    .get(email.toLowerCase().trim());

  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return unauthorized(res, 'Invalid credentials');
  }

  const token = jwt.sign(
    { userId: user.id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
  );

  audit.log({
    userId: user.id,
    userEmail: user.email,
    action: 'LOGIN',
    resourceType: 'auth',
    req,
  });

  return success(res, {
    token,
    user: {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      role: user.role,
      card_number: user.card_number,
      hospital: user.hospital,
      department: user.department,
    },
  }, 'Login successful');
}

function me(req, res) {
  return success(res, {
    id: req.user.id,
    email: req.user.email,
    full_name: req.user.full_name,
    role: req.user.role,
    card_number: req.user.card_number,
    hospital: req.user.hospital,
    department: req.user.department,
  });
}

function logout(req, res) {
  audit.log({
    userId: req.user.id,
    userEmail: req.user.email,
    action: 'LOGOUT',
    resourceType: 'auth',
    req,
  });
  return success(res, null, 'Logged out successfully');
}

function changePassword(req, res) {
  const { current_password, new_password } = req.body;
  if (!current_password || !new_password) {
    return error(res, 'current_password and new_password are required');
  }
  if (new_password.length < 8) {
    return error(res, 'New password must be at least 8 characters');
  }

  const db = getDb();
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  if (!bcrypt.compareSync(current_password, user.password_hash)) {
    return error(res, 'Current password is incorrect', 400);
  }

  const ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || '10', 10);
  const hash = bcrypt.hashSync(new_password, ROUNDS);
  db.prepare('UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(hash, req.user.id);

  audit.log({ userId: req.user.id, userEmail: req.user.email, action: 'CHANGE_PASSWORD', resourceType: 'auth', req });
  return success(res, null, 'Password changed successfully');
}

module.exports = { login, me, logout, changePassword };
