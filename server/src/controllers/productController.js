// ================================================
//  src/controllers/productController.js
//  Handles all product CRUD logic
//
//  PUBLIC   → getAllProducts, getProductById
//  ADMIN    → createProduct, updateProduct, deleteProduct
// ================================================

const db = require('../db');


// ------------------------------------------------
//  GET /products
//  Public — anyone can browse
//
//  Supports optional query parameters:
//    ?search=headphones     → searches name + description
//    ?category=1            → filters by category_id
//    ?minPrice=10           → filters by minimum price
//    ?maxPrice=100          → filters by maximum price
//
//  HOW DYNAMIC FILTERING WORKS:
//  Instead of writing separate SQL for every combination,
//  we build the WHERE clause dynamically by pushing
//  conditions into an array and values into a params array.
//  This keeps the code clean and prevents SQL injection.
// ------------------------------------------------
const getAllProducts = async (req, res) => {
    try {
        const { search, category, minPrice, maxPrice } = req.query;

        // Start with the base query
        let query  = `
            SELECT
                p.id,
                p.name,
                p.description,
                p.price,
                p.stock,
                p.is_active,
                c.name  AS category,
                p.created_at
            FROM products p
            LEFT JOIN categories c ON p.category_id = c.id
            WHERE p.is_active = true
        `;

        // conditions holds extra WHERE clauses
        // params holds the actual values ($1, $2 etc.)
        const conditions = [];
        const params     = [];

        // Each time we add a condition we increment the
        // param counter so placeholders stay sequential
        if (search) {
            params.push(`%${search}%`);
            // ILIKE = case-insensitive LIKE in PostgreSQL
            conditions.push(
                `(p.name ILIKE $${params.length} OR p.description ILIKE $${params.length})`
            );
        }

        if (category) {
            params.push(category);
            conditions.push(`p.category_id = $${params.length}`);
        }

        if (minPrice) {
            params.push(minPrice);
            conditions.push(`p.price >= $${params.length}`);
        }

        if (maxPrice) {
            params.push(maxPrice);
            conditions.push(`p.price <= $${params.length}`);
        }

        // Append each condition with AND
        if (conditions.length > 0) {
            query += ' AND ' + conditions.join(' AND ');
        }

        query += ' ORDER BY p.created_at DESC';

        const result = await db.query(query, params);

        return res.status(200).json({
            count:    result.rows.length,
            products: result.rows,
        });

    } catch (error) {
        console.error('getAllProducts error:', error.message);
        return res.status(500).json({ error: 'Internal server error' });
    }
};


// ------------------------------------------------
//  GET /products/:id
//  Public — returns a single product by ID
// ------------------------------------------------
const getProductById = async (req, res) => {
    try {
        const { id } = req.params;

        const result = await db.query(
            `SELECT
                p.id,
                p.name,
                p.description,
                p.price,
                p.stock,
                p.is_active,
                c.name  AS category,
                c.id    AS category_id,
                p.created_at
            FROM products p
            LEFT JOIN categories c ON p.category_id = c.id
            WHERE p.id = $1 AND p.is_active = true`,
            [id]
        );

        // No product found with that ID
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Product not found' });
        }

        return res.status(200).json({ product: result.rows[0] });

    } catch (error) {
        console.error('getProductById error:', error.message);
        return res.status(500).json({ error: 'Internal server error' });
    }
};


// ------------------------------------------------
//  POST /products
//  Admin only — create a new product
//
//  Required fields: name, price, stock
//  Optional fields: description, category_id
// ------------------------------------------------
const createProduct = async (req, res) => {
    try {
        const { name, description, price, stock, category_id } = req.body;

        // --- Validation ---
        if (!name || price === undefined || stock === undefined) {
            return res.status(400).json({
                error: 'name, price and stock are required'
            });
        }

        if (isNaN(price) || Number(price) < 0) {
            return res.status(400).json({
                error: 'price must be a positive number'
            });
        }

        if (!Number.isInteger(Number(stock)) || Number(stock) < 0) {
            return res.status(400).json({
                error: 'stock must be a non-negative integer'
            });
        }

        // If category_id was provided, check it actually exists
        if (category_id) {
            const cat = await db.query(
                'SELECT id FROM categories WHERE id = $1',
                [category_id]
            );
            if (cat.rows.length === 0) {
                return res.status(400).json({ error: 'category_id does not exist' });
            }
        }

        // --- Insert ---
        const result = await db.query(
            `INSERT INTO products (name, description, price, stock, category_id)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING *`,
            [name, description || null, price, stock, category_id || null]
        );

        return res.status(201).json({
            message: 'Product created successfully',
            product: result.rows[0],
        });

    } catch (error) {
        console.error('createProduct error:', error.message);
        return res.status(500).json({ error: 'Internal server error' });
    }
};


// ------------------------------------------------
//  PUT /products/:id
//  Admin only — update a product
//
//  PARTIAL UPDATE: only fields sent in the body
//  are updated. Fields not included are left alone.
//
//  HOW IT WORKS:
//  Same dynamic building trick as getAllProducts —
//  we only SET the columns the client actually sent.
// ------------------------------------------------
const updateProduct = async (req, res) => {
    try {
        const { id }  = req.params;
        const { name, description, price, stock, category_id, is_active } = req.body;

        // Check the product exists first
        const existing = await db.query(
            'SELECT id FROM products WHERE id = $1',
            [id]
        );

        if (existing.rows.length === 0) {
            return res.status(404).json({ error: 'Product not found' });
        }

        // Build SET clause dynamically
        // Only include fields that were actually sent
        const fields = [];
        const params = [];

        if (name !== undefined) {
            params.push(name);
            fields.push(`name = $${params.length}`);
        }

        if (description !== undefined) {
            params.push(description);
            fields.push(`description = $${params.length}`);
        }

        if (price !== undefined) {
            if (isNaN(price) || Number(price) < 0) {
                return res.status(400).json({ error: 'price must be a positive number' });
            }
            params.push(price);
            fields.push(`price = $${params.length}`);
        }

        if (stock !== undefined) {
            if (!Number.isInteger(Number(stock)) || Number(stock) < 0) {
                return res.status(400).json({ error: 'stock must be a non-negative integer' });
            }
            params.push(stock);
            fields.push(`stock = $${params.length}`);
        }

        if (category_id !== undefined) {
            params.push(category_id);
            fields.push(`category_id = $${params.length}`);
        }

        if (is_active !== undefined) {
            params.push(is_active);
            fields.push(`is_active = $${params.length}`);
        }

        // Nothing was sent to update
        if (fields.length === 0) {
            return res.status(400).json({ error: 'No fields provided to update' });
        }

        // Add the id as the last param for the WHERE clause
        params.push(id);

        const result = await db.query(
            `UPDATE products
             SET ${fields.join(', ')}
             WHERE id = $${params.length}
             RETURNING *`,
            params
        );

        return res.status(200).json({
            message: 'Product updated successfully',
            product: result.rows[0],
        });

    } catch (error) {
        console.error('updateProduct error:', error.message);
        return res.status(500).json({ error: 'Internal server error' });
    }
};


// ------------------------------------------------
//  DELETE /products/:id
//  Admin only — SOFT delete a product
//
//  WHY SOFT DELETE?
//  Hard delete (DELETE FROM products) would break any
//  order_items row that references this product via
//  foreign key ON DELETE RESTRICT.
//  Soft delete just flips is_active to false so the
//  product disappears from public listings but all
//  historical order data stays intact.
// ------------------------------------------------
const deleteProduct = async (req, res) => {
    try {
        const { id } = req.params;

        const result = await db.query(
            `UPDATE products
             SET is_active = false
             WHERE id = $1
             RETURNING id, name, is_active`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Product not found' });
        }

        return res.status(200).json({
            message: `Product "${result.rows[0].name}" has been deactivated`,
            product: result.rows[0],
        });

    } catch (error) {
        console.error('deleteProduct error:', error.message);
        return res.status(500).json({ error: 'Internal server error' });
    }
};


module.exports = {
    getAllProducts,
    getProductById,
    createProduct,
    updateProduct,
    deleteProduct,
};
