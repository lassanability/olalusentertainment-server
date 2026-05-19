const router = require('express').Router();
const multer = require('multer');
const { requireAuth, requireRole } = require('../middleware/auth');
const ctrl = require('../controllers/banner');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

router.get('/', ctrl.getAll);
router.get('/:id', ctrl.getById);
router.post('/', requireAuth, requireRole('banner'), upload.single('image'), ctrl.create);
router.put('/:id', requireAuth, requireRole('banner'), upload.single('image'), ctrl.update);
router.delete('/:id', requireAuth, requireRole('banner'), ctrl.remove);

module.exports = router;
