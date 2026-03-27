const { Pool } = require('pg');
require('dotenv').config();

// Create a connection pool using environment variables
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    // Add SSL for production platforms like Neon/Render, disable for local
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    max: 10, 
    idleTimeoutMillis: 30000, 
    connectionTimeoutMillis: 2000, 
});


// Helper function to run queries with error handling
const query = async (text, params) => {
    const start = Date.now();
    try {
        const result = await pool.query(text, params);
        const duration = Date.now() - start;
        console.log('Executed query', { text, duration, rows: result.rowCount });
        return result;
    } catch (error) {
        console.error('Database query error:', error);
        throw error;
    }
};

// Function to test database connectivity
const testConnection = async () => {
    try {
        const result = await query('SELECT NOW()');
        console.log('Database connected successfully at:', result.rows[0].now);
        return true;
    } catch (error) {
        console.error('Database connection failed:', error);
        return false;
    }
};

module.exports = {
    query,
    testConnection,
    pool
};