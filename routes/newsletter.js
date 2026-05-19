const router = require('express').Router();
const { requireAuth } = require('../middleware/auth');
const ctrl = require('../controllers/newsletter');

router.post('/subscribe', ctrl.subscribe);
router.post('/unsubscribe', ctrl.unsubscribe);
router.get('/', requireAuth, ctrl.getAll);
router.post('/send', requireAuth, ctrl.sendBulk);

module.exports = router;
