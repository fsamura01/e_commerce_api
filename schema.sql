-- ============================================================
--  schema.sql
--  E-Commerce Database Schema
--  Database : ecommerce_db
--  Schema   : ecommerce
-- ============================================================
--  HOW TO RUN:
--    psql -U ecommerce_user -d ecommerce_db -f schema.sql
-- ============================================================

-- Make sure the schema exists and use it
CREATE SCHEMA IF NOT EXISTS ecommerce;
SET search_path TO ecommerce, public;


-- ============================================================
-- STEP 1: Drop tables in reverse order (so foreign keys don't block)
-- Useful when re-running this file during development
-- ============================================================
DROP TABLE IF EXISTS order_items  CASCADE;
DROP TABLE IF EXISTS orders       CASCADE;
DROP TABLE IF EXISTS cart_items   CASCADE;
DROP TABLE IF EXISTS products     CASCADE;
DROP TABLE IF EXISTS categories   CASCADE;
DROP TABLE IF EXISTS users        CASCADE;


-- ============================================================
-- TABLE 1: categories
-- No foreign keys — must be created first
-- One category can have MANY products
-- ============================================================
CREATE TABLE categories (
    id          SERIAL          PRIMARY KEY,
    name        VARCHAR(100)    NOT NULL UNIQUE,
    description TEXT,
    created_at  TIMESTAMP       DEFAULT NOW()
);


-- ============================================================
-- TABLE 2: users
-- No foreign keys — must be created before cart_items & orders
-- Role is either 'customer' or 'admin'
-- ============================================================
CREATE TABLE users (
    id            SERIAL        PRIMARY KEY,
    email         VARCHAR(255)  NOT NULL UNIQUE,
    password_hash VARCHAR(255)  NOT NULL,
    first_name    VARCHAR(100),
    last_name     VARCHAR(100),
    role          VARCHAR(20)   DEFAULT 'customer'
                                CHECK (role IN ('customer', 'admin')),
    created_at    TIMESTAMP     DEFAULT NOW()
);


-- ============================================================
-- TABLE 3: products
-- Foreign key → categories(id)
-- is_active allows soft-delete (we hide, not delete, products)
-- ============================================================
CREATE TABLE products (
    id          SERIAL          PRIMARY KEY,
    name        VARCHAR(255)    NOT NULL,
    description TEXT,
    price       NUMERIC(10, 2)  NOT NULL CHECK (price >= 0),
    stock       INTEGER         NOT NULL DEFAULT 0 CHECK (stock >= 0),
    is_active   BOOLEAN         DEFAULT TRUE,
    category_id INTEGER         REFERENCES categories(id) ON DELETE SET NULL,
    created_at  TIMESTAMP       DEFAULT NOW()
);


-- ============================================================
-- TABLE 4: cart_items
-- Foreign keys → users(id) and products(id)
-- UNIQUE(user_id, product_id) prevents the same product
-- appearing as two separate rows in the same user's cart
-- ============================================================
CREATE TABLE cart_items (
    id         SERIAL    PRIMARY KEY,
    user_id    INTEGER   NOT NULL REFERENCES users(id)    ON DELETE CASCADE,
    product_id INTEGER   NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    quantity   INTEGER   NOT NULL DEFAULT 1 CHECK (quantity > 0),
    added_at   TIMESTAMP DEFAULT NOW(),

    UNIQUE (user_id, product_id)
);


-- ============================================================
-- TABLE 5: orders
-- Foreign key → users(id)
-- ON DELETE RESTRICT means: you cannot delete a user
-- who already has orders (protects order history)
-- stripe_payment_id stores the PaymentIntent id from Stripe
-- ============================================================
CREATE TABLE orders (
    id                SERIAL          PRIMARY KEY,
    user_id           INTEGER         NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    status            VARCHAR(20)     DEFAULT 'pending'
                                      CHECK (status IN ('pending', 'paid', 'shipped', 'cancelled')),
    total             NUMERIC(10, 2)  NOT NULL CHECK (total >= 0),
    stripe_payment_id VARCHAR(255),
    created_at        TIMESTAMP       DEFAULT NOW()
);


-- ============================================================
-- TABLE 6: order_items
-- Foreign keys → orders(id) and products(id)
-- price_at_purchase: CRITICAL — stores the price at the time
-- of purchase so future price changes don't alter receipts
-- ON DELETE RESTRICT on product_id: protects purchase records
-- ============================================================
CREATE TABLE order_items (
    id                 SERIAL          PRIMARY KEY,
    order_id           INTEGER         NOT NULL REFERENCES orders(id)   ON DELETE CASCADE,
    product_id         INTEGER         NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    quantity           INTEGER         NOT NULL CHECK (quantity > 0),
    price_at_purchase  NUMERIC(10, 2)  NOT NULL,

    UNIQUE (order_id, product_id)
);


-- ============================================================
-- INDEXES
-- Speed up the most common lookups your API will perform
-- ============================================================

-- Find all products in a category
CREATE INDEX idx_products_category  ON products(category_id);

-- Find all cart items for a user
CREATE INDEX idx_cart_user          ON cart_items(user_id);

-- Find all orders for a user
CREATE INDEX idx_orders_user        ON orders(user_id);

-- Find all items inside an order
CREATE INDEX idx_order_items_order  ON order_items(order_id);

-- Look up users by email (used on every login)
CREATE UNIQUE INDEX idx_users_email ON users(email);



-- ============================================================
-- CONFIRMATION
-- ============================================================
SELECT 'schema.sql executed successfully ✅' AS status;
