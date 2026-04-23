const router = require('express').Router();
const { listUsers, getUser, createUser, updateUser, deleteUser } = require('../controllers/userController');
const { authenticate, requireRole } = require('../middleware/auth');

router.use(authenticate);

router.get('/',       requireRole('admin', 'hospital_manager', 'regulator'), listUsers);
router.get('/:id',    requireRole('admin', 'hospital_manager'), getUser);
router.post('/',      requireRole('admin'), createUser);
router.put('/:id',    requireRole('admin', 'hospital_manager'), updateUser);
router.delete('/:id', requireRole('admin', 'hospital_manager'), deleteUser);

module.exports = router;
