const router = require('express').Router();
const { requireAuth, requireRole } = require('../middleware/auth');
const ctrl = require('../controllers/contact');

router.post('/', ctrl.submit);
router.get('/', requireAuth, requireRole('contacts'), ctrl.getAll);
router.patch('/:id/read', requireAuth, requireRole('contacts'), ctrl.markRead);
router.delete('/:id', requireAuth, requireRole('contacts'), ctrl.remove);

module.exports = router;
