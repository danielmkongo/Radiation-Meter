const jwt = require('jsonwebtoken');
const { getDb } = require('../config/database');
const { unauthorized, forbidden } = require('../utils/response');

/**
 * Verify JWT Bearer token and attach user to request
 */
function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return unauthorized(res, 'No token provided');
  }

  const token = authHeader.slice(7);
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    // Verify user still exists and is active
    const db = getDb();
    const user = db
      .prepare('SELECT id, email, role, full_name, card_number, hospital, is_active FROM users WHERE id = ?')
      .get(payload.userId);

    if (!user || !user.is_active) {
      return unauthorized(res, 'Account not found or deactivated');
    }

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return unauthorized(res, 'Token expired');
    }
    return unauthorized(res, 'Invalid token');
  }
}

/**
 * RBAC middleware factory — usage: requireRole('admin', 'hospital_manager')
 */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return unauthorized(res);
    if (!roles.includes(req.user.role)) {
      return forbidden(res, 'Insufficient permissions');
    }
    next();
  };
}

/**
 * Allow a radiologist to only access their own data, or admins/managers all data
 */
function requireSelfOrPrivileged(cardNumberParam = 'card_number') {
  return (req, res, next) => {
    if (!req.user) return unauthorized(res);
    const { role, card_number } = req.user;
    if (['admin', 'hospital_manager', 'regulator'].includes(role)) return next();
    const requested = req.params[cardNumberParam] || req.query[cardNumberParam];
    if (requested && requested !== card_number) {
      return forbidden(res, 'You can only access your own data');
    }
    next();
  };
}

/**
 * Hospital managers can only access their own hospital
 * Admins and regulators can access any hospital
 */
function requireSameHospital(hospitalParam = 'hospital') {
  return (req, res, next) => {
    if (!req.user) return unauthorized(res);
    const { role, hospital } = req.user;

    // Admins and regulators have unrestricted access
    if (['admin', 'regulator'].includes(role)) return next();

    // Hospital managers can only access their own hospital
    if (role === 'hospital_manager') {
      if (!hospital) {
        return forbidden(res, 'Hospital manager must be assigned to a hospital');
      }

      // Check hospital from query params, route params, or request body
      const requestedHospital = 
        req.params[hospitalParam] || 
        req.query[hospitalParam] || 
        req.body?.hospital;

      if (requestedHospital && requestedHospital !== hospital) {
        return forbidden(res, 'You can only manage your own hospital');
      }
      return next();
    }

    // Other roles cannot use this middleware
    return forbidden(res, 'Insufficient permissions');
  };
}

module.exports = { authenticate, requireRole, requireSelfOrPrivileged, requireSameHospital };
