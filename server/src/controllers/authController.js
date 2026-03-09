// ================================================
//  src/controllers/authController.js
//  Handles all authentication logic
//  register, login (login coming in next phase)
// ================================================

const bcrypt   = require('bcrypt');
const jwt      = require('jsonwebtoken');
const db       = require('../db');

// ------------------------------------------------
//  Helper: createToken
//  Signs a JWT with the user's id and role
//  Expires in 7 days
// ------------------------------------------------
const createToken = (user) => {
    return jwt.sign(
        // PAYLOAD — data stored inside the token
        // Keep this small, never store passwords here
        {
            id:   user.id,
            role: user.role,
        },
        // SECRET — from your .env file
        process.env.JWT_SECRET,
        // OPTIONS
        { expiresIn: '7d' }
    );
};


// ------------------------------------------------
//  POST /auth/register
//
//  What happens step by step:
//  1. Read email + password from req.body
//  2. Check the email is not already taken
//  3. Hash the password with bcrypt (10 salt rounds)
//  4. Insert the new user into the database
//  5. Sign a JWT and return it
// ------------------------------------------------
const register = async (req, res) => {
    try {
        // STEP 1: Pull data from the request body
        const { email, password, first_name, last_name } = req.body;

        // STEP 2: Basic validation — make sure required fields exist
        if (!email || !password) {
            return res.status(400).json({
                error: 'Email and password are required'
            });
        }

        // Password length validation
        if (password.length < 6) {
            return res.status(400).json({
                error: 'Password must be at least 6 characters'
            });
        }

        // STEP 3: Check if that email is already registered
        // $1 is a placeholder — pg replaces it with the value
        // in the array [email]. This prevents SQL injection.
        const existingUser = await db.query(
            'SELECT id FROM users WHERE email = $1',
            [email]
        );

        if (existingUser.rows.length > 0) {
            return res.status(409).json({
                error: 'An account with that email already exists'
            });
        }

        // STEP 4: Hash the password
        // bcrypt.hash(password, saltRounds)
        // saltRounds = 10 means bcrypt runs the hashing
        // algorithm 2^10 = 1024 times, making brute-force hard
        // This is intentionally slow — takes ~100ms, which is fine
        const password_hash = await bcrypt.hash(password, 10);

        // STEP 5: Insert the new user into the database
        // RETURNING * gives us back the inserted row immediately
        // so we don't need a second SELECT query
        const result = await db.query(
            `INSERT INTO users (email, password_hash, first_name, last_name)
             VALUES ($1, $2, $3, $4)
             RETURNING id, email, first_name, last_name, role, created_at`,
            [email, password_hash, first_name || null, last_name || null]
        );

        const newUser = result.rows[0];

        // STEP 6: Create a JWT for the new user
        const token = createToken(newUser);

        // STEP 7: Send back the token + user info (no password!)
        return res.status(201).json({
            message: 'Account created successfully',
            token,
            user: {
                id:         newUser.id,
                email:      newUser.email,
                first_name: newUser.first_name,
                last_name:  newUser.last_name,
                role:       newUser.role,
                created_at: newUser.created_at,
            }
        });

    } catch (error) {
        console.error('Register error:', error.message);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                error: 'Email and password are required'
            });
        }

        const existingUser = await db.query(
            'SELECT id, password_hash FROM users WHERE email = $1',
            [email]
        );

        if (existingUser.rows.length === 0) {
            return res.status(401).json({
                error: 'Invalid email or password'
            });
        }

        const user = existingUser.rows[0];

        const isPasswordValid = await bcrypt.compare(password, user.password_hash);

        if (!isPasswordValid) {
            return res.status(401).json({
                error: 'Invalid email or password'
            });
        }

        const token = createToken(user);

        return res.status(200).json({
            message: 'Login successful',
            token,
            user: {
                id:         user.id,
                email:      user.email,
                first_name: user.first_name,
                last_name:  user.last_name,
                role:       user.role,
                created_at: user.created_at,
            }
        });
    } catch (error) {
        console.error('Login error:', error.message);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

module.exports = { register, login };
