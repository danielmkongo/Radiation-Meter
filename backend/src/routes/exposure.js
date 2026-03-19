const router = require('express').Router();
const { ingestExposure, listExposure, getExposureById, deleteExposure, getExposureSummary } = require('../controllers/exposureController');
const { authenticate, requireRole } = require('../middleware/auth');
const { apiKeyAuth } = require('../middleware/apiKey');
const { ingestionLimiter } = require('../middleware/rateLimiter');

// IoT device ingestion — uses API key auth
router.post('/', ingestionLimiter, apiKeyAuth, ingestExposure);

// Human dashboard queries — use JWT auth
router.use(authenticate);
router.get('/',                          listExposure);
router.get('/summary/:card_number',      getExposureSummary);
router.get('/:id',                       getExposureById);
router.delete('/:id',                    requireRole('admin'), deleteExposure);

module.exports = router;
