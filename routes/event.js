const router = require('express').Router();
const multer = require('multer');
const { requireAuth, requireRole } = require('../middleware/auth');
const ctrl = require('../controllers/event');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 30 * 1024 * 1024 } });

router.get('/featured', ctrl.getFeatured);
router.get('/admin', requireAuth, ctrl.getAllAdmin);
router.post('/submit-listing', upload.single('image'), ctrl.submitListing);
router.get('/', ctrl.getAll);
router.get('/:id', ctrl.getById);
router.post('/', requireAuth, requireRole('events'), upload.array('images', 10), ctrl.create);
router.put('/:id', requireAuth, requireRole('events'), upload.array('images', 10), ctrl.update);
router.delete('/:id', requireAuth, requireRole('events'), ctrl.remove);
router.patch('/:id/featured', requireAuth, requireRole('events'), ctrl.toggleFeatured);

module.exports = router;
