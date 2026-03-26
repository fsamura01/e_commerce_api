-- ============================================================
--  seed.sql
--  E-Commerce Test Data
--  Database : ecommerce_db
--  Schema   : ecommerce
-- ============================================================
--  HOW TO RUN (ALWAYS run schema.sql first):
--    psql -U ecommerce_user -d ecommerce_db -f schema.sql
--    psql -U ecommerce_user -d ecommerce_db -f seed.sql
--
--  TO RESET AND RESEED:
--    psql -U ecommerce_user -d ecommerce_db -f schema.sql
--    psql -U ecommerce_user -d ecommerce_db -f seed.sql
-- Make sure the schema exists and use it
CREATE SCHEMA IF NOT EXISTS ecommerce;
SET search_path TO ecommerce, public;


-- ============================================================
-- SEED 1: categories
-- ============================================================
INSERT INTO categories (name, description) VALUES
    ('Electronics',  'Gadgets, devices, and accessories'),
    ('Clothing',     'Apparel for men and women'),
    ('Books',        'Fiction, non-fiction, and technical titles'),
    ('Home & Kitchen','Cookware, décor, and appliances'),
    ('Sports',       'Equipment and activewear');


-- ============================================================
-- SEED 2: users
-- ⚠️  NOTE: password_hash values here are FAKE placeholders.
--     In your real app, bcrypt will generate these hashes.
--     Never store plain text passwords.
--
--     Fake hash below represents the password: 'Password123!'
-- ============================================================
INSERT INTO users (email, password_hash, first_name, last_name, role) VALUES
    (
        'admin@myshop.com',
        '$2b$10$TY8CGrecXP390vlpIIQqIuxSfqLhrffmO5fRy.UR60yHLIJXrr5Se',
        'Admin',
        'User',
        'admin'
    ),
    (
        'john@email.com',
        '$2b$10$26eoRCW6Kj1tl5kTPPNRuunmqvOVQ3AUQSbXq47ovoMlYQFX6lPfC',
        'John',
        'Doe',
        'customer'
    ),
    (
        'sarah@email.com',
        '$2b$10$48zsrJgaQAX0wAf4FaRJB.rKLOzDUbg228d0oarxprov/iUbPic56',
        'Sarah',
        'Smith',
        'customer'
    ),
    (
        'mike@email.com',
        '$2b$10$s63aqcgP7qx3f2bamgw3LuMH0ro9OsVGgvsS3hP/sDFB.R/aPJopS',
        'Mike',
        'Johnson',
        'customer'
    );


-- ============================================================
-- SEED 3: products
-- category_id references the categories inserted above
-- ============================================================
INSERT INTO products (name, description, price, stock, category_id) VALUES

    -- Electronics (category_id = 1)
    ('Wireless Headphones',   'Noise-cancelling over-ear headphones',     49.99,  100, 1),
    ('Bluetooth Speaker',     'Portable waterproof speaker',              29.99,   75, 1),
    ('USB-C Charging Cable',  '6ft fast-charging braided cable',           9.99,  200, 1),

    -- Clothing (category_id = 2)
    ('Classic T-Shirt',       '100% cotton unisex tee, multiple colours', 19.99,   50, 2),
    ('Running Shorts',        'Lightweight breathable shorts',            24.99,   40, 2),

    -- Books (category_id = 3)
    ('JavaScript: The Good Parts', 'Essential JS concepts by Douglas Crockford', 29.99, 30, 3),
    ('Clean Code',            'Best practices for writing readable code', 34.99,   25, 3),

    -- Home & Kitchen (category_id = 4)
    ('Ceramic Coffee Mug',    '350ml microwave-safe mug',                 12.99,   80, 4),
    ('Non-stick Frying Pan',  '28cm oven-safe frying pan',                39.99,   35, 4),

    -- Sports (category_id = 5)
    ('Yoga Mat',              '6mm thick non-slip exercise mat',          22.99,   60, 5);


-- ============================================================
-- SEED 4: cart_items
-- Simulates two users currently shopping
-- ============================================================
INSERT INTO cart_items (user_id, product_id, quantity) VALUES
    -- John's cart  (user_id = 2)
    (2, 1, 1),   -- 1x Wireless Headphones
    (2, 7, 2),   -- 2x Clean Code book

    -- Sarah's cart (user_id = 3)
    (3, 4, 3),   -- 3x Classic T-Shirt
    (3, 8, 1);   -- 1x Ceramic Coffee Mug


-- ============================================================
-- SEED 5: orders
-- Simulates completed orders with different statuses
-- ============================================================
INSERT INTO orders (user_id, status, total, stripe_payment_id) VALUES
    (2, 'paid',      49.99,  'pi_test_john_order1_FAKE'),   -- John's first order
    (2, 'shipped',   64.98,  'pi_test_john_order2_FAKE'),   -- John's second order
    (3, 'paid',      19.99,  'pi_test_sarah_order1_FAKE'),  -- Sarah's first order
    (4, 'cancelled', 29.99,  NULL);                          -- Mike's cancelled order


-- ============================================================
-- SEED 6: order_items
-- Links each order to the products it contained
-- price_at_purchase is frozen — independent of products.price
-- ============================================================
INSERT INTO order_items (order_id, product_id, quantity, price_at_purchase) VALUES
    -- Order 1: John bought Wireless Headphones
    (1, 1, 1, 49.99),

    -- Order 2: John bought Clean Code + JS Good Parts
    (2, 7, 1, 34.99),
    (2, 6, 1, 29.99),

    -- Order 3: Sarah bought Classic T-Shirt
    (3, 4, 1, 19.99),

    -- Order 4: Mike had a Bluetooth Speaker (cancelled)
    (4, 2, 1, 29.99);


-- ============================================================
-- VERIFICATION QUERIES
-- Run these to confirm your data looks right
-- ============================================================

-- 1. All products with their category names
SELECT
    p.id,
    p.name        AS product,
    p.price,
    p.stock,
    c.name        AS category
FROM products p
JOIN categories c ON p.category_id = c.id
ORDER BY c.name, p.name;


-- 2. Each user's current cart with product names and subtotals
SELECT
    u.first_name,
    p.name              AS product,
    ci.quantity,
    p.price,
    (ci.quantity * p.price)  AS subtotal
FROM cart_items ci
JOIN users    u ON ci.user_id    = u.id
JOIN products p ON ci.product_id = p.id
ORDER BY u.first_name;


-- 3. All orders with their items and what was paid
SELECT
    o.id           AS order_id,
    u.first_name,
    o.status,
    p.name         AS product,
    oi.quantity,
    oi.price_at_purchase,
    o.total        AS order_total
FROM orders o
JOIN users       u  ON o.user_id      = u.id
JOIN order_items oi ON oi.order_id    = o.id
JOIN products    p  ON oi.product_id  = p.id
ORDER BY o.id;


-- ============================================================
-- CONFIRMATION
-- ============================================================
SELECT 'seed.sql executed successfully ✅' AS status;
