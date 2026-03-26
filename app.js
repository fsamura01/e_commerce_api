// Import required packages
require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const rateLimit  = require('express-rate-limit');
const cors = require('cors');
const path = require('path');
const db = require('./server/src/db/index');
const authenticate = require('./server/src/middleware/authenticate');
const productRoutes = require('./server/src/routes/products');
const categoryRoutes = require('./server/src/routes/categories');
const cartRoutes  = require('./server/src/routes/cart');
const checkoutRoutes = require('./server/src/routes/checkout');
const orderRoutes = require('./server/src/routes/orders');
const frontendRoutes = require('./server/src/routes/frontend');

// Create Express application
const app = express();
const PORT = process.env.PORT || 5000;


const cookieParser = require('cookie-parser');

// Middleware setup
app.use(helmet());
app.use(cors()); // Allow cross-origin requests from your React app
app.use(express.json()); // Parse JSON request bodies
app.use(express.urlencoded({ extended: true })); // Parse HTML form submissions
app.use(cookieParser()); // Parse cookies sent by the browser

// Strict limiter for auth routes
const authLimiter = rateLimit({
    windowMs:         15 * 60 * 1000,  // 15 minutes in milliseconds
    max:              10,               // max 10 requests per window
    message:          { error: 'Too many attempts. Please try again in 15 minutes.' },
    standardHeaders:  true,             // sends RateLimit headers in response
    legacyHeaders:    false,
});
 
// Relaxed limiter for all other API routes
const apiLimiter = rateLimit({
    windowMs:         15 * 60 * 1000,  // 15 minutes
    max:              100,              // max 100 requests per window
    message:          { error: 'Too many requests. Please slow down.' },
    standardHeaders:  true,
    legacyHeaders:    false,
});
 


// Test database connection on startup
db.testConnection();

const authRoutes = require('./server/src/routes/auth');

app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/products', apiLimiter, productRoutes);
app.use('/api/categories', apiLimiter, categoryRoutes);
app.use('/api/cart', apiLimiter, cartRoutes);
app.use('/api/checkout', apiLimiter, checkoutRoutes);
app.use('/api/orders', apiLimiter, orderRoutes);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));


app.use('/', frontendRoutes);

//  HEALTH CHECK
app.get('/', (req, res) => {
  res.json({ message: '🛍️  E-Commerce API is running', version: '1.0.0', });
  
});



//  404 HANDLER
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

//  GLOBAL ERROR HANDLER
app.use((err, req, res, next) => {
    console.error('Global error:', err.stack);
 
    // Use the error's status code if it has one,
    // otherwise default to 500
    const statusCode = err.status || err.statusCode || 500;
 
    return res.status(statusCode).json({
        error: err.message || 'Internal server error'
    });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});