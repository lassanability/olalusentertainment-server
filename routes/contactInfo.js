const router = require('express').Router();
const { requireAuth, requireRole } = require('../middleware/auth');
const ctrl = require('../controllers/contactInfo');

router.get('/', ctrl.get);
router.put('/', requireAuth, requireRole('contact-info'), ctrl.update);

module.exports = router;
