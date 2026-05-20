const router = require('express').Router();
const multer = require('multer');
const { requireAuth, requireRole } = require('../middleware/auth');
const ctrl = require('../controllers/recentShow');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 },
});

router.get('/', ctrl.getAll);
router.post('/', requireAuth, requireRole('events'), upload.fields([
  { name: 'media', maxCount: 1 },
  { name: 'thumbnail', maxCount: 1 },
]), ctrl.create);
router.put('/:id', requireAuth, requireRole('events'), upload.fields([
  { name: 'media', maxCount: 1 },
  { name: 'thumbnail', maxCount: 1 },
]), ctrl.update);
router.delete('/:id', requireAuth, requireRole('events'), ctrl.remove);

module.exports = router;
