const express = require('express');
const router = express.Router();
const { getCart, addToCart, updateCartItem, removeCartItem, clearCart } = require('../controllers/cartController');
const authenticate = require('../middleware/authenticate');


// Get cart
router.get('/', authenticate, getCart);

// Add to cart
router.post('/items', authenticate, addToCart);

router.put('/items/:productId', authenticate, updateCartItem);

router.delete('/items/:productId', authenticate, removeCartItem);

router.delete('/', authenticate, clearCart);

module.exports = router;