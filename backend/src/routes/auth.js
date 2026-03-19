const router = require('express').Router();
const { login, me, logout, changePassword } = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiter');

router.post('/login',           authLimiter, login);
router.get('/me',               authenticate, me);
router.post('/logout',          authenticate, logout);
router.post('/change-password', authenticate, changePassword);

module.exports = router;
