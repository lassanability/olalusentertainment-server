const router = require('express').Router();
const { requireSuperAdmin } = require('../middleware/auth');
const ctrl = require('../controllers/adminUser');

router.get('/', requireSuperAdmin, ctrl.getAll);
router.post('/', requireSuperAdmin, ctrl.create);
router.put('/:id', requireSuperAdmin, ctrl.update);
router.delete('/:id', requireSuperAdmin, ctrl.remove);
router.post('/:id/reset-password', requireSuperAdmin, ctrl.resetPassword);

module.exports = router;
