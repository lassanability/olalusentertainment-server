const router = require('express').Router();
const { requireAuth, requireSuperAdmin } = require('../middleware/auth');
const ctrl = require('../controllers/policy');

router.get('/', ctrl.getAll);
router.get('/:key', ctrl.getByKey);
router.put('/:key', requireAuth, requireSuperAdmin, ctrl.upsert);

module.exports = router;
