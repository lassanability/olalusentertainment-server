const router = require('express').Router();
const ctrl = require('../controllers/ticket');
const { requireAuth } = require('../middleware/auth');

router.get('/', requireAuth, ctrl.getAllTickets);
router.get('/:ticketId/qr', ctrl.getQrImage);
router.get('/:ticketId', requireAuth, ctrl.getTicket);
router.post('/:ticketId/scan', requireAuth, ctrl.scanTicket);

module.exports = router;
