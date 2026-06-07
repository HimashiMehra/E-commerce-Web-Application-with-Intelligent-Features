const express = require('express');
const router = express.Router();
const { createCheckoutSession } = require('../controllers/paymentController');
const { protect } = require('../middleware/authMiddleware');

// Webhook route is registered in server.js (before body parsers)
router.post('/create-checkout-session', protect, createCheckoutSession);

module.exports = router;
