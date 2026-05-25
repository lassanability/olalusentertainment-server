const router = require('express').Router();
const multer = require('multer');
const { requireAuth, requireRole } = require('../middleware/auth');
const ctrl = require('../controllers/manualTicket');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

router.get('/', requireAuth, requireRole('orders'), ctrl.getAll);
router.post('/', requireAuth, requireRole('orders'), upload.single('paymentProof'), ctrl.create);
router.patch('/:id/approve', requireAuth, requireRole('orders'), ctrl.approve);
router.patch('/:id/reject', requireAuth, requireRole('orders'), ctrl.reject);
router.delete('/:id', requireAuth, requireRole('orders'), ctrl.remove);

module.exports = router;
