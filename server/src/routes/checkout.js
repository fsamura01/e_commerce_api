// ================================================
//  src/routes/checkout.js
// ================================================

const express      = require('express');
const router       = express.Router();
const authenticate = require('../middleware/authenticate');

const {
    createPaymentIntent,
    confirmOrder,
} = require('../controllers/checkoutController');

// POST /checkout/create-payment-intent
// Creates a Stripe PaymentIntent and returns client_secret
router.post('/create-payment-intent', authenticate, createPaymentIntent);

// POST /checkout/confirm
// Verifies payment with Stripe, creates order, clears cart
router.post('/confirm', authenticate, confirmOrder);

module.exports = router;
