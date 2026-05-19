const router = require('express').Router();
const ctrl = require('../controllers/checkout');
const { requireAuth } = require('../middleware/auth');

router.post('/', ctrl.processPayment);
router.get('/orders', requireAuth, ctrl.getAllOrders);
router.get('/order/:orderId', ctrl.getOrderStatus);

module.exports = router;
