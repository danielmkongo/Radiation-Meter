const router = require('express').Router();
const { listAlerts, getAlert, acknowledgeAlert, getUnreadCount } = require('../controllers/alertController');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

router.get('/unread-count', getUnreadCount);
router.get('/',             listAlerts);
router.get('/:id',          getAlert);
router.patch('/:id/acknowledge', acknowledgeAlert);

module.exports = router;
