const router = require('express').Router();
const multer = require('multer');
const { requireAuth, requireRole } = require('../middleware/auth');
const ctrl = require('../controllers/testimonial');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 30 * 1024 * 1024 } });

router.get('/', ctrl.getAll);
router.post('/submit', upload.single('image'), ctrl.submitPublic);
router.get('/:id', ctrl.getById);
router.post('/', requireAuth, requireRole('testimonials'), upload.single('image'), ctrl.create);
router.put('/:id', requireAuth, requireRole('testimonials'), upload.single('image'), ctrl.update);
router.delete('/:id', requireAuth, requireRole('testimonials'), ctrl.remove);

module.exports = router;
