const router = require('express').Router();
const { requireAuth, requireRole } = require('../middleware/auth');
const ctrl = require('../controllers/comment');

// Public
router.post('/', ctrl.submit);
router.get('/approved', ctrl.getApproved);
router.get('/stats', ctrl.getStats);

// Dashboard
router.get('/', requireAuth, requireRole('comments'), ctrl.getAll);
router.patch('/:id/approve', requireAuth, requireRole('comments'), ctrl.approve);
router.delete('/:id', requireAuth, requireRole('comments'), ctrl.reject);

module.exports = router;
