// ================================================
//  src/controllers/checkoutController.js
//  Handles Stripe payment flow and order creation
//
//  PAYMENT FLOW:
//  Step 1 → POST /checkout/create-payment-intent
//           Frontend calls this to get a client_secret
//           Stripe uses client_secret to show payment form
//
//  Step 2 → Frontend collects card details via Stripe.js
//           Card never touches your server — Stripe handles it
//
//  Step 3 → POST /checkout/confirm
//           Frontend tells your server payment is done
//           Your server verifies with Stripe, creates order,
//           clears the cart, decrements stock
// ================================================

const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const db = require("../db");

// ------------------------------------------------
//  POST /checkout/create-payment-intent
//
//  What this does:
//  1. Fetches the user's cart from the database
//  2. Calculates the total in cents (Stripe uses cents)
//  3. Creates a PaymentIntent with Stripe
//  4. Returns the client_secret to the frontend
//
//  WHY CENTS?
//  Stripe never uses decimals to avoid floating point
//  errors. $49.99 becomes 4999 cents.
//  $204.95 becomes 20495 cents.
// ------------------------------------------------
const createPaymentIntent = async (req, res) => {
  try {
    const userId = req.user.id;

    // STEP 1: Fetch the user's cart with product prices
    const cartResult = await db.query(
      `SELECT
                ci.product_id,
                ci.quantity,
                p.name,
                p.price,
                p.stock,
                (ci.quantity * p.price) AS subtotal
            FROM cart_items ci
            JOIN products p ON ci.product_id = p.id
            WHERE ci.user_id = $1
              AND p.is_active = true`,
      [userId],
    );

    // Cannot checkout with an empty cart
    if (cartResult.rows.length === 0) {
      return res.status(400).json({ error: "Your cart is empty" });
    }

    // STEP 2: Check every item still has enough stock
    for (const item of cartResult.rows) {
      if (item.quantity > item.stock) {
        return res.status(400).json({
          error: `Not enough stock for "${item.name}". Available: ${item.stock}`,
        });
      }
    }

    // STEP 3: Calculate total in cents
    // reduce() adds up all subtotals
    // Math.round() removes any floating point errors
    // e.g. 204.95 × 100 = 20494.999999 → Math.round → 20495
    const totalDecimal = cartResult.rows.reduce((sum, item) => {
      return sum + parseFloat(item.subtotal);
    }, 0);

    const totalCents = Math.round(totalDecimal * 100);

    // STEP 4: Create a PaymentIntent with Stripe
    // This registers the intended payment with Stripe
    // and gives us a client_secret to send to the frontend
    const paymentIntent = await stripe.paymentIntents.create({
      amount: totalCents,
      currency: "usd",
      // allow_redirects: 'never' tells Stripe to only use
      // payment methods that do NOT redirect the user (e.g. card).
      // Required for pure API testing without a frontend.
      automatic_payment_methods: {
        enabled: true,
        allow_redirects: "never",
      },
      // metadata: {
      metadata: {
        user_id: userId.toString(),
      },
    });

    // STEP 5: Return the client_secret to the frontend
    // The frontend uses this with Stripe.js to show
    // the payment form and confirm the payment
    return res.status(200).json({
      client_secret: paymentIntent.client_secret,
      payment_intent_id: paymentIntent.id,
      amount: totalDecimal.toFixed(2),
      currency: "usd",
      items: cartResult.rows,
    });
  } catch (error) {
    console.error("createPaymentIntent error:", error.message);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// ------------------------------------------------
//  POST /checkout/confirm
//  Called after the frontend confirms payment with Stripe
//
//  What this does:
//  1. Retrieves the PaymentIntent from Stripe to verify
//     payment actually succeeded — never trust the frontend
//  2. Creates an order row in the database
//  3. Creates order_items rows for each cart item
//  4. Decrements stock for each product
//  5. Clears the user's cart
//
//  WHY VERIFY WITH STRIPE AGAIN?
//  The frontend could send any payment_intent_id.
//  We always retrieve it from Stripe directly to confirm
//  the status is "succeeded" before creating the order.
// ------------------------------------------------
const confirmOrder = async (req, res) => {
  try {
    const userId = req.user.id;
    const { payment_intent_id } = req.body;

    if (!payment_intent_id) {
      return res.status(400).json({ error: "payment_intent_id is required" });
    }

    // STEP 1: Retrieve the PaymentIntent directly from Stripe
    // This is the source of truth — not what the frontend says
    const paymentIntent =
      await stripe.paymentIntents.retrieve(payment_intent_id);

    // STEP 2: Check payment actually succeeded
    if (paymentIntent.status !== "succeeded") {
      return res.status(400).json({
        error: `Payment not completed. Status: ${paymentIntent.status}`,
      });
    }

    // STEP 3: Verify the payment belongs to this user
    // We stored user_id in metadata when creating the PaymentIntent
    if (paymentIntent.metadata.user_id !== userId.toString()) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    // STEP 4: Fetch the cart one more time to get current items
    const cartResult = await db.query(
      `SELECT
                ci.product_id,
                ci.quantity,
                p.price
            FROM cart_items ci
            JOIN products p ON ci.product_id = p.id
            WHERE ci.user_id = $1`,
      [userId],
    );

    if (cartResult.rows.length === 0) {
      return res.status(400).json({ error: "Cart is empty" });
    }

    // STEP 5: Calculate total from cart
    const total = cartResult.rows.reduce((sum, item) => {
      return sum + parseFloat(item.price) * item.quantity;
    }, 0);

    // STEP 6: Everything verified — now write to the database
    // Use a TRANSACTION so all steps succeed or all fail together
    // If creating order_items fails, the order row is also rolled back
    // Your database never ends up in a half-finished state
    await db.query("BEGIN");

    try {
      // 6a: Create the order
      const orderResult = await db.query(
        `INSERT INTO orders (user_id, status, total, stripe_payment_id)
                 VALUES ($1, 'paid', $2, $3)
                 RETURNING *`,
        [userId, total.toFixed(2), payment_intent_id],
      );

      const order = orderResult.rows[0];

      // 6b: Create order_items — one row per cart item
      // price_at_purchase freezes the price at this moment
      for (const item of cartResult.rows) {
        await db.query(
          `INSERT INTO order_items
                        (order_id, product_id, quantity, price_at_purchase)
                     VALUES ($1, $2, $3, $4)`,
          [order.id, item.product_id, item.quantity, item.price],
        );

        // 6c: Decrement stock for each product
        await db.query(
          `UPDATE products
                     SET stock = stock - $1
                     WHERE id = $2`,
          [item.quantity, item.product_id],
        );
      }

      // 6d: Clear the cart
      await db.query("DELETE FROM cart_items WHERE user_id = $1", [userId]);

      // 6e: Commit — all steps succeeded, save everything
      await db.query("COMMIT");

      return res.status(201).json({
        message: "Order placed successfully",
        order: {
          id: order.id,
          status: order.status,
          total: order.total,
          stripe_payment_id: order.stripe_payment_id,
          created_at: order.created_at,
        },
      });
    } catch (innerError) {
      // Something went wrong inside the transaction
      // ROLLBACK undoes everything — order, order_items, stock changes
      await db.query("ROLLBACK");
      throw innerError;
    }
  } catch (error) {
    console.error("confirmOrder error:", error.message);
    return res.status(500).json({ error: "Internal server error" });
  }
};

module.exports = { createPaymentIntent, confirmOrder };
