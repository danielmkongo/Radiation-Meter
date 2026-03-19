const router = require('express').Router();
const { listHospitals, getHospitalDetails } = require('../controllers/hospitalController');
const { authenticate, requireRole } = require('../middleware/auth');

router.use(authenticate);
router.get('/',          requireRole('admin', 'hospital_manager', 'regulator'), listHospitals);
router.get('/:name/details', requireRole('admin', 'hospital_manager', 'regulator'), getHospitalDetails);

module.exports = router;
