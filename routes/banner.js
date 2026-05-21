const router = require('express').Router();
const multer = require('multer');
const { requireAuth, requireRole } = require('../middleware/auth');
const ctrl = require('../controllers/banner');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 30 * 1024 * 1024 } });

router.get('/', ctrl.get);
router.put('/', requireAuth, requireRole('banner'), upload.fields([
  { name: 'heroImage', maxCount: 1 },
  { name: 'blobImage', maxCount: 1 },
]), ctrl.update);

module.exports = router;
