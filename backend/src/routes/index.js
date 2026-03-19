const router = require('express').Router();

router.use('/auth',     require('./auth'));
router.use('/users',    require('./users'));
router.use('/devices',  require('./devices'));
router.use('/exposure', require('./exposure'));
router.use('/alerts',   require('./alerts'));
router.use('/dashboard',require('./dashboard'));
router.use('/reports',  require('./reports'));
router.use('/audit',     require('./audit'));
router.use('/hospitals', require('./hospitals'));

module.exports = router;
