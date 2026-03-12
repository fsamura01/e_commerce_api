// Import required packages
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const db = require('./server/src/db/index');
const authenticate = require('./server/src/middleware/authenticate');
const productRoutes = require('./server/src/routes/products');

// Create Express application
const app = express();
const PORT = process.env.PORT || 5000;


// Middleware setup
app.use(cors()); // Allow cross-origin requests from your React app
app.use(express.json()); // Parse JSON request bodies

// Test database connection on startup
db.testConnection();

const authRoutes = require('./server/src/routes/auth');

app.use('/api/auth', authRoutes);
// Future routes:
app.use('/api/products', productRoutes);
// app.use('/cart',     cartRoutes);
// app.use('/orders',   orderRoutes);

app.get('/', (req, res) => {
    res.json({ message: '🛍️  E-Commerce API is running' });
});


app.use((err, req, res, next) => {
    console.error('Unhandled error:', err.message);
    res.status(500).json({ error: 'Something went wrong' });
})


// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});