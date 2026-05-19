const router = require('express').Router();
const { requireAuth } = require('../middleware/auth');
const ctrl = require('../controllers/auth');

router.post('/login', ctrl.login);
router.post('/change-password', requireAuth, ctrl.changePassword);
router.get('/me', requireAuth, ctrl.getMe);

module.exports = router;
