const router = require('express').Router();
const { getDashboard, getChartData } = require('../controllers/dashboardController');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);
router.get('/',       getDashboard);
router.get('/chart',  getChartData);

module.exports = router;
