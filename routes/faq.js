const router = require('express').Router();
const { requireAuth, requireRole } = require('../middleware/auth');
const ctrl = require('../controllers/faq');

router.get('/', ctrl.getAll);
router.get('/:id', ctrl.getById);
router.post('/', requireAuth, requireRole('faq'), ctrl.create);
router.put('/:id', requireAuth, requireRole('faq'), ctrl.update);
router.delete('/:id', requireAuth, requireRole('faq'), ctrl.remove);

module.exports = router;
