const db = require('../db');

const getCart = async (req, res) => {
    try {
        const userId = req.user.id;
 
        const result = await db.query(
            `SELECT
                ci.id              AS cart_item_id,
                ci.quantity,
                ci.added_at,
                p.id               AS product_id,
                p.name,
                p.price,
                p.stock,
                -- subtotal per line item calculated in SQL
                (ci.quantity * p.price)  AS subtotal
            FROM cart_items ci
            JOIN products p ON ci.product_id = p.id
            WHERE ci.user_id = $1
              AND p.is_active = true
            ORDER BY ci.added_at ASC`,
            [userId]
        );
 
        // Calculate cart total from all subtotals
        // reduce() walks through every item and adds up the subtotals
        // starting from 0
        const total = result.rows.reduce((sum, item) => {
            return sum + parseFloat(item.subtotal);
        }, 0);
 
        return res.status(200).json({
            item_count: result.rows.length,
            cart_total: total.toFixed(2),  // round to 2 decimal places
            items:      result.rows,
        });
 
    } catch (error) {
        console.error('getCart error:', error.message);
        return res.status(500).json({ error: 'Internal server error' });
    }
};


const addToCart = async (req, res) => {
    try {
        const userId = req.user.id;
        const { product_id, quantity = 1 } = req.body;
 
        // --- Validation ---
        if (!product_id) {
            return res.status(400).json({ error: 'product_id is required' });
        }
 
        if (!Number.isInteger(Number(quantity)) || Number(quantity) < 1) {
            return res.status(400).json({ error: 'quantity must be a positive integer' });
        }
 
        // --- Check product exists and is active ---
        const product = await db.query(
            'SELECT id, name, price, stock FROM products WHERE id = $1 AND is_active = true',
            [product_id]
        );
 
        if (product.rows.length === 0) {
            return res.status(404).json({ error: 'Product not found' });
        }
 
        // --- Check there is enough stock ---
        // First check how many are already in the cart
        const existingItem = await db.query(
            'SELECT quantity FROM cart_items WHERE user_id = $1 AND product_id = $2',
            [userId, product_id]
        );
 
        const currentQty  = existingItem.rows[0]?.quantity || 0;
        const requestedQty = currentQty + Number(quantity);
 
        if (requestedQty > product.rows[0].stock) {
            return res.status(400).json({
                error: `Not enough stock. Available: ${product.rows[0].stock}, In your cart: ${currentQty}`
            });
        }
 
        // --- Insert or increment quantity ---
        // ON CONFLICT (user_id, product_id) means:
        // "if this user already has this product in their cart"
        // DO UPDATE SET quantity = ... means:
        // "instead of inserting a new row, just add to the existing quantity"
        const result = await db.query(
            `INSERT INTO cart_items (user_id, product_id, quantity)
             VALUES ($1, $2, $3)
             ON CONFLICT (user_id, product_id)
             DO UPDATE SET quantity = cart_items.quantity + $3
             RETURNING *`,
            [userId, product_id, quantity]
        );
 
        return res.status(201).json({
            message: `${product.rows[0].name} added to cart`,
            cart_item: result.rows[0],
        });
 
    } catch (error) {
        console.error('addToCart error:', error.message);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

const updateCartItem = async (req, res) => {
    try {
        const userId    = req.user.id;
        const productId = req.params.productId;
        const { quantity } = req.body;
 
        // --- Validation ---
        if (quantity === undefined) {
            return res.status(400).json({ error: 'quantity is required' });
        }
 
        if (!Number.isInteger(Number(quantity)) || Number(quantity) < 0) {
            return res.status(400).json({ error: 'quantity must be a non-negative integer' });
        }
 
        // --- Check the item is actually in this user's cart ---
        const existing = await db.query(
            'SELECT id FROM cart_items WHERE user_id = $1 AND product_id = $2',
            [userId, productId]
        );
 
        if (existing.rows.length === 0) {
            return res.status(404).json({ error: 'Item not found in your cart' });
        }
 
        // --- If quantity is 0, remove the item entirely ---
        if (Number(quantity) === 0) {
            await db.query(
                'DELETE FROM cart_items WHERE user_id = $1 AND product_id = $2',
                [userId, productId]
            );
            return res.status(200).json({ message: 'Item removed from cart' });
        }
 
        // --- Otherwise check stock and update quantity ---
        const product = await db.query(
            'SELECT stock FROM products WHERE id = $1',
            [productId]
        );
 
        if (Number(quantity) > product.rows[0].stock) {
            return res.status(400).json({
                error: `Not enough stock. Available: ${product.rows[0].stock}`
            });
        }
 
        const result = await db.query(
            `UPDATE cart_items
             SET quantity = $1
             WHERE user_id = $2 AND product_id = $3
             RETURNING *`,
            [quantity, userId, productId]
        );
 
        return res.status(200).json({
            message: 'Cart updated',
            cart_item: result.rows[0],
        });
 
    } catch (error) {
        console.error('updateCartItem error:', error.message);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

const removeCartItem = async (req, res) => {
    try {
        const userId    = req.user.id;
        const productId = req.params.productId;
 
        const result = await db.query(
            `DELETE FROM cart_items
             WHERE user_id = $1 AND product_id = $2
             RETURNING *`,
            [userId, productId]
        );
 
        // RETURNING * gives back the deleted row
        // If nothing was returned, the item wasn't in the cart
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Item not found in your cart' });
        }
 
        return res.status(200).json({ message: 'Item removed from cart' });
 
    } catch (error) {
        console.error('removeCartItem error:', error.message);
        return res.status(500).json({ error: 'Internal server error' });
    }
};
 
const clearCart = async (req, res) => {
    try {
        const userId = req.user.id;
 
        await db.query(
            'DELETE FROM cart_items WHERE user_id = $1',
            [userId]
        );
 
        return res.status(200).json({ message: 'Cart cleared' });
 
    } catch (error) {
        console.error('clearCart error:', error.message);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

module.exports = {
    getCart,
    addToCart,
    updateCartItem,
    removeCartItem,
    clearCart,
};