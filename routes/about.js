const router = require('express').Router();
const multer = require('multer');
const { requireAuth, requireRole } = require('../middleware/auth');
const ctrl = require('../controllers/about');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

router.get('/', ctrl.get);
router.put('/', requireAuth, requireRole('about'), upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'howToImage', maxCount: 1 },
]), ctrl.update);

module.exports = router;
