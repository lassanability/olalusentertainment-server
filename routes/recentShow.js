const os = require('os');
const path = require('path');
const router = require('express').Router();
const multer = require('multer');
const { requireAuth, requireRole } = require('../middleware/auth');
const ctrl = require('../controllers/recentShow');

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, os.tmpdir()),
    filename: (_req, file, cb) =>
      cb(null, `olalus-${Date.now()}-${Math.random().toString(36).slice(2)}${path.extname(file.originalname)}`),
  }),
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
