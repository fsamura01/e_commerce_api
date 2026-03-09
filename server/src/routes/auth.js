// ================================================
//  src/routes/auth.js
//  Auth routes — /auth/register, /auth/login
//  Each route maps a URL + method to a controller
// ================================================

const express        = require('express');
const router         = express.Router();
const { register, login }   = require('../controllers/authController');

// POST /auth/register
// Public route — no authentication needed
router.post('/register', register);

// POST /auth/login  ← coming in the next step
router.post('/login', login);

module.exports = router;
