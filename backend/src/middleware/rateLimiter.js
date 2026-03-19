const rateLimit = require('express-rate-limit');
const { RATE_LIMITS } = require('../config/constants');

const authLimiter = rateLimit({
  windowMs: RATE_LIMITS.AUTH_WINDOW_MS,
  max: RATE_LIMITS.AUTH_MAX_REQUESTS,
  message: { success: false, message: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const apiLimiter = rateLimit({
  windowMs: RATE_LIMITS.API_WINDOW_MS,
  max: RATE_LIMITS.API_MAX_REQUESTS,
  message: { success: false, message: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const ingestionLimiter = rateLimit({
  windowMs: RATE_LIMITS.INGESTION_WINDOW_MS,
  max: RATE_LIMITS.INGESTION_MAX_REQUESTS,
  keyGenerator: (req) => req.headers['x-api-key'] || req.ip,
  message: { success: false, message: 'Ingestion rate limit exceeded.' },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = { authLimiter, apiLimiter, ingestionLimiter };
