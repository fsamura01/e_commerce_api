// ================================================
//  src/routes/orders.js
// ================================================

const express      = require('express');
const router       = express.Router();
const authenticate = require('../middleware/authenticate');
const {
    getOrders,
    getOrderById,
} = require('../controllers/orderController');

// GET /orders       → all orders for this user
router.get('/',    authenticate, getOrders);

// GET /orders/:id   → single order with all items
router.get('/:id', authenticate, getOrderById);

module.exports = router;
