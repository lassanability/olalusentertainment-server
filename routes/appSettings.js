const router = require('express').Router();
const { requireSuperAdmin } = require('../middleware/auth');
const ctrl = require('../controllers/appSettings');

router.get('/', ctrl.get);
router.put('/', requireSuperAdmin, ctrl.update);

module.exports = router;
