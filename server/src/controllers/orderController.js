// ================================================
//  src/controllers/orderController.js
//  Handles order history for users
//
//  GET /orders       → all orders for the logged in user
//  GET /orders/:id   → single order with all items
// ================================================

const db = require('../db');


// ------------------------------------------------
//  GET /orders
//  Returns all orders for the logged in user
//  Most recent order first
// ------------------------------------------------
const getOrders = async (req, res) => {
    try {
        const userId = req.user.id;

        const result = await db.query(
            `SELECT
                id,
                status,
                total,
                stripe_payment_id,
                created_at
            FROM orders
            WHERE user_id = $1
            ORDER BY created_at DESC`,
            [userId]
        );

        return res.status(200).json({
            order_count: result.rows.length,
            orders:      result.rows,
        });

    } catch (error) {
        console.error('getOrders error:', error.message);
        return res.status(500).json({ error: 'Internal server error' });
    }
};


// ------------------------------------------------
//  GET /orders/:id
//  Returns a single order with all its items
//
//  Uses price_at_purchase — the price frozen at
//  checkout — not the current product price
//  This is what keeps receipts accurate forever
// ------------------------------------------------
const getOrderById = async (req, res) => {
    try {
        const userId  = req.user.id;
        const orderId = req.params.id;

        // Fetch the order — make sure it belongs to this user
        const orderResult = await db.query(
            `SELECT id, status, total, stripe_payment_id, created_at
             FROM orders
             WHERE id = $1 AND user_id = $2`,
            [orderId, userId]
        );

        if (orderResult.rows.length === 0) {
            return res.status(404).json({ error: 'Order not found' });
        }

        const order = orderResult.rows[0];

        // Fetch all items in this order
        // price_at_purchase is used — NOT p.price
        // so the receipt always shows what was paid
        const itemsResult = await db.query(
            `SELECT
                oi.id,
                oi.quantity,
                oi.price_at_purchase,
                (oi.quantity * oi.price_at_purchase) AS subtotal,
                p.name,
                p.description
            FROM order_items oi
            JOIN products p ON oi.product_id = p.id
            WHERE oi.order_id = $1`,
            [orderId]
        );

        return res.status(200).json({
            order: {
                ...order,
                items: itemsResult.rows,
            }
        });

    } catch (error) {
        console.error('getOrderById error:', error.message);
        return res.status(500).json({ error: 'Internal server error' });
    }
};


module.exports = { getOrders, getOrderById };
