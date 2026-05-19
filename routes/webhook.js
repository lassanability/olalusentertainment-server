const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/webhook');

router.post('/square', express.raw({ type: 'application/json' }), ctrl.handleSquare);

module.exports = router;
