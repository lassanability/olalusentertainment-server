const router = require('express').Router();
const multer = require('multer');
const { requireAuth } = require('../middleware/auth');
const ctrl = require('../controllers/eventAlbum');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

router.get('/', ctrl.getAll);
router.post('/', requireAuth, upload.single('image'), ctrl.create);
router.post('/bulk', requireAuth, upload.array('images', 50), ctrl.createBulk);
router.post('/import-google', requireAuth, ctrl.importFromGoogle);
router.post('/:id/like', ctrl.likePhoto);
router.put('/:id', requireAuth, upload.single('image'), ctrl.update);
router.delete('/:id', requireAuth, ctrl.remove);

module.exports = router;
