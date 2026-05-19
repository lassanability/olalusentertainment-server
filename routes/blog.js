const router = require('express').Router();
const multer = require('multer');
const { requireAuth, requireRole } = require('../middleware/auth');
const ctrl = require('../controllers/blog');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

router.get('/featured', ctrl.getFeatured);
router.get('/categories', ctrl.getCategories);
router.get('/tags', ctrl.getTags);
router.get('/author/:authorId', ctrl.getByAuthor);
router.get('/', ctrl.getAll);
router.get('/:id', ctrl.getById);
router.post('/', requireAuth, requireRole('blog'), upload.array('images', 10), ctrl.create);
router.put('/:id', requireAuth, requireRole('blog'), upload.array('images', 10), ctrl.update);
router.delete('/:id', requireAuth, requireRole('blog'), ctrl.remove);
router.patch('/:id/featured', requireAuth, requireRole('blog'), ctrl.toggleFeatured);

module.exports = router;
