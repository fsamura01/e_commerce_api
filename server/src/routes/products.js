// ================================================
//  src/routes/products.js
//
//  Shows exactly how authenticate + isAdmin chain together.
//  Public routes  → no middleware
//  Admin routes   → authenticate + isAdmin (both required)
// ================================================

const express      = require('express');
const router       = express.Router();
const authenticate = require('../middleware/authenticate');
const isAdmin = require('../middleware/isAdmin');
const { getAllProducts, getProductById, createProduct, updateProduct, deleteProduct } = require('../controllers/productController');


// ------------------------------------------------
//  HOW THE MIDDLEWARE CHAIN WORKS
//
//  router.post('/', authenticate, isAdmin, createProduct)
//                   ↑             ↑         ↑
//                   runs 1st     runs 2nd   runs 3rd
//                   sets         checks     handles
//                   req.user     role       the logic
//
//  Express runs them LEFT → RIGHT.
//  If any middleware does NOT call next(), the chain stops
//  and a response is sent back immediately.
//
//  authenticate fails → 401 stops everything (no token / bad token)
//  isAdmin fails      → 403 stops everything (not an admin)
//  both pass          → handler runs ✅
// ------------------------------------------------


// ------------------------------------------------
//  PUBLIC ROUTES — no middleware
//  Any visitor (logged in or not) can browse products
// ------------------------------------------------

// GET /products
router.get('/', getAllProducts);

// GET /products/:id
router.get('/:id', getProductById);


// ------------------------------------------------
//  ADMIN-ONLY ROUTES — authenticate + isAdmin required
// ------------------------------------------------

// POST /products — create a new product
router.post('/', authenticate, isAdmin, createProduct);

// PUT /products/:id — update a product
router.put('/:id',  authenticate, isAdmin, updateProduct);

// DELETE /products/:id — soft-delete a product
router.delete('/:id', authenticate, isAdmin, deleteProduct);

module.exports = router;