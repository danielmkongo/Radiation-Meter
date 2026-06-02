const router = require('express').Router();
const { listHospitals, createHospital, deleteHospital, getHospitalDetails } = require('../controllers/hospitalController');
const { authenticate, requireRole } = require('../middleware/auth');

router.use(authenticate);

// All authenticated users can fetch the hospital list (needed for dropdown in forms)
router.get('/', listHospitals);

// Admin only — manage the hospital registry
router.post('/',          requireRole('admin'), createHospital);
router.delete('/:name',   requireRole('admin'), deleteHospital);

// Managers/regulators/admin can see hospital details
router.get('/:name/details', requireRole('admin', 'hospital_manager', 'regulator'), getHospitalDetails);

module.exports = router;
