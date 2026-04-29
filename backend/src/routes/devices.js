const router = require('express').Router();
const { listDevices, getDevice, createDevice, updateDevice, regenerateApiKey, deleteDevice, getDeviceUsers } = require('../controllers/deviceController');
const { authenticate, requireRole, enforceHospitalIsolation } = require('../middleware/auth');

router.use(authenticate);

router.get('/',                  listDevices);
router.get('/:id',               getDevice);
router.get('/:id/users',         getDeviceUsers);
router.post('/',                 requireRole('admin', 'hospital_manager'), enforceHospitalIsolation, createDevice);
router.put('/:id',               requireRole('admin', 'hospital_manager'), enforceHospitalIsolation, updateDevice);
router.post('/:id/regenerate-key', requireRole('admin', 'hospital_manager'), enforceHospitalIsolation, regenerateApiKey);
router.delete('/:id',            requireRole('admin', 'hospital_manager'), enforceHospitalIsolation, deleteDevice);

module.exports = router;
