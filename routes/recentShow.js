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
  limits: { fileSize: 200 * 1024 * 1024 },
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

router.use((err, req, res, next) => {
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ success: false, message: 'File too large. Maximum size is 200MB.' });
  }
  next(err);
});

module.exports = router;
