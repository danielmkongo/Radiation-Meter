const router = require('express').Router();
const { listAuditLogs } = require('../controllers/auditController');
const { authenticate, requireRole } = require('../middleware/auth');

router.use(authenticate, requireRole('admin', 'regulator'));
router.get('/', listAuditLogs);

module.exports = router;
