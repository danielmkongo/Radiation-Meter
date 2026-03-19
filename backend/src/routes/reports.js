const router = require('express').Router();
const { generateCsvReport, generateComplianceSummary } = require('../controllers/reportController');
const { authenticate, requireRole } = require('../middleware/auth');

router.use(authenticate);
router.use(requireRole('admin', 'hospital_manager', 'regulator'));

router.get('/exposure',    generateCsvReport);
router.get('/compliance',  generateComplianceSummary);

module.exports = router;
