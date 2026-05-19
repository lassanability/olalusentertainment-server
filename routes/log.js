const router = require('express').Router();
const { requireSuperAdmin } = require('../middleware/auth');
const ctrl = require('../controllers/activityLog');

router.get('/', requireSuperAdmin, ctrl.getAll);

module.exports = router;
