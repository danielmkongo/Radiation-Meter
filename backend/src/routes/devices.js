const router = require('express').Router();
const { listDevices, getDevice, getApiKey, createDevice, updateDevice, regenerateApiKey, deleteDevice, getDeviceUsers } = require('../controllers/deviceController');
const { authenticate, requireRole } = require('../middleware/auth');

router.use(authenticate);

router.get('/',                  listDevices);
router.get('/:id',               getDevice);
router.get('/:id/users',         getDeviceUsers);
router.get('/:id/api-key',       requireRole('admin'), getApiKey);
router.post('/',                 requireRole('admin'), createDevice);
router.put('/:id',               requireRole('admin'), updateDevice);
router.post('/:id/regenerate-key', requireRole('admin'), regenerateApiKey);
router.delete('/:id',            requireRole('admin'), deleteDevice);

module.exports = router;
