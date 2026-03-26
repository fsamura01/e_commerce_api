# 🛍️ E-Commerce API

> A beginner-friendly, step-by-step guide to building a production-ready REST API with authentication, shopping cart, and real payments.

**Stack:** Node.js · Express 4 · PostgreSQL · Stripe

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Phase 1 — Database Setup](#2-phase-1--database-setup)
3. [Phase 2 — JWT Authentication](#3-phase-2--jwt-authentication)
4. [Phase 3 — Products & CRUD](#4-phase-3--products--crud)
5. [Phase 4 — Shopping Cart](#5-phase-4--shopping-cart)
6. [Phase 5 — Stripe Payments](#6-phase-5--stripe-payments)
7. [Phase 6 — Security & Frontend](#7-phase-6--security--frontend)
8. [Deployment — Railway](#8-deployment--railway)
9. [Complete API Reference](#9-complete-api-reference)
10. [Key Lessons Learned](#10-key-lessons-learned)

---

## 1. Project Overview

### Technology Stack

| Technology            | Purpose                          |
|-----------------------|----------------------------------|
| Node.js               | Runtime                          |
| Express 4             | HTTP framework                   |
| PostgreSQL            | Database                         |
| pg (node-postgres)    | DB driver                        |
| bcrypt + jsonwebtoken | Authentication                   |
| Stripe                | Payment processing               |
| helmet                | Security headers                 |
| express-rate-limit    | Brute force protection           |
| EJS                   | HTML templating                  |
| nodemon               | Dev server                       |
| axios                 | HTTP client                      |
| Postman               | API testing                      |

### Project Structure

```
D:\e_commerce_api\
├── app.js                        ← Entry point
├── package.json
├── .env                          ← Environment variables (never commit)
├── schema.sql                    ← Table definitions
├── seed.sql                      ← Test data
├── views\                        ← EJS templates
│   ├── partials\
│   │   ├── header.ejs
│   │   └── footer.ejs
│   ├── products.ejs
│   ├── product.ejs
│   ├── cart.ejs
│   ├── checkout.ejs
│   ├── orders.ejs
│   ├── login.ejs
│   └── register.ejs
├── public\css\style.css          ← Stylesheet
└── server\src\
    ├── db\index.js               ← DB connection pool
    ├── middleware\
    │   ├── authenticate.js       ← JWT verification
    │   └── isAdmin.js            ← Admin role check
    ├── controllers\
    │   ├── authController.js
    │   ├── productController.js
    │   ├── cartController.js
    │   ├── checkoutController.js
    │   └── orderController.js
    └── routes\
        ├── auth.js
        ├── products.js
        ├── cart.js
        ├── checkout.js
        ├── orders.js
        └── frontend.js
```

### Getting Started

```powershell
# 1. Install dependencies
npm install

# 2. Set up environment variables
copy .env.example .env
# Open .env and fill in your values

# 3. Set up the database
psql -U ecommerce_user -d ecommerce_db -f schema.sql
psql -U ecommerce_user -d ecommerce_db -f seed.sql

# 4. Start the server
npm run dev
```

### Environment Variables

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=ecommerce_db
DB_USER=ecommerce_user
DB_PASSWORD=your_password
JWT_SECRET=your_long_random_secret_32_chars_minimum
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLIC_KEY=pk_test_...
PORT=5000
API_URL=http://localhost:5000/api
```

---

## 2. Phase 1 — Database Setup

### Database and User Creation

Run the following as the PostgreSQL superuser:

```sql
psql -U postgres

CREATE DATABASE ecommerce_db;
CREATE USER ecommerce_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE ecommerce_db TO ecommerce_user;

\c ecommerce_db
GRANT ALL ON SCHEMA public TO ecommerce_user;
ALTER USER ecommerce_user SET search_path TO ecommerce, public;
```

### Schema Creation

A schema is an organisational namespace inside the database — like a folder for your tables:

```sql
\c ecommerce_db
CREATE SCHEMA ecommerce;
GRANT ALL ON SCHEMA ecommerce TO ecommerce_user;
```

### Data Model

The order of table creation matters — foreign key targets must exist first:

| Table        | Depends On       | Description                   |
|--------------|------------------|-------------------------------|
| `categories` | —                | Product categories            |
| `users`      | —                | Customer and admin accounts   |
| `products`   | categories       | Items for sale                |
| `cart_items` | users, products  | Items in a user's active cart |
| `orders`     | users            | Completed purchase records    |
| `order_items`| orders, products | Line items inside each order  |

### Running the SQL Files

```powershell
psql -U ecommerce_user -d ecommerce_db -f schema.sql
psql -U ecommerce_user -d ecommerce_db -f seed.sql
```

> **Note:** Always run `schema.sql` before `seed.sql`. Running `schema.sql` again resets all tables — useful during development.

### Key Design Decisions

- **Soft delete on products** — `is_active = false` instead of `DELETE`, so order history stays intact
- **`price_at_purchase` on order_items** — freezes the price at checkout; future price changes do not alter old receipts
- **`UNIQUE(user_id, product_id)` on cart_items** — prevents duplicate rows for the same product in the same cart
- **`ON CONFLICT DO UPDATE`** — when adding a product already in the cart, quantity is incremented instead of inserting a new row

---

## 3. Phase 2 — JWT Authentication

### How JWT Works

A JWT (JSON Web Token) is a signed string containing a payload of user data. When a user logs in, the server signs a token with its secret key. The user includes this token in every subsequent request. The server verifies the signature without touching the database.

|                  |                                         |
|------------------|-----------------------------------------|
| Token structure  | `header.payload.signature`              |
| Payload contains | `{ id: 1, role: 'customer' }`           |
| Token expiry     | 7 days                                  |
| Header format    | `Authorization: Bearer <token>`         |
| Packages used    | bcrypt (hashing), jsonwebtoken (tokens) |

### Registration Flow — `POST /api/auth/register`

1. Read `email`, `password`, `first_name`, `last_name` from `req.body`
2. Validate required fields and password length (min 6 chars)
3. Check the email is not already registered
4. Hash the password with `bcrypt.hash(password, 10)`
5. `INSERT` the new user into the `users` table
6. Sign a JWT with the user's `id` and `role`
7. Return the token and user object — **never the password hash**

### Login Flow — `POST /api/auth/login`

1. Read `email` and `password` from `req.body`
2. `SELECT` user by email (including `password_hash`)
3. If no user found → return `401 "Invalid email or password"`
4. Use `bcrypt.compare()` to verify the password against the stored hash
5. If wrong password → return the **same vague 401 error**
6. Sign a JWT and return it with the user object

> **Why vague errors?** Both "email not found" and "wrong password" return the same error message on purpose. Specific messages would reveal which emails are registered in your system.

### Middleware Chain

Two middleware functions protect routes and must always run in this order:

| Middleware         | What it does                                                                                        |
|--------------------|-----------------------------------------------------------------------------------------------------|
| `authenticate.js`  | Reads the Bearer token, verifies it with `jwt.verify()`, attaches decoded payload to `req.user`     |
| `isAdmin.js`       | Checks `req.user.role === 'admin'`. Returns `403` if not. Must always run **after** `authenticate`. |

```js
// Usage on a route:
router.post('/', authenticate, isAdmin, createProduct);
//            ↑             ↑         ↑
//            1st           2nd       3rd
```

### Creating the Admin User

Admin users cannot self-register through the API. Create one directly in psql:

```js
// hashgen.js — run once then delete
const bcrypt = require('bcrypt');
async function generate() {
    const hash = await bcrypt.hash('AdminPassword123!', 10);
    console.log(hash);
}
generate();
```

```powershell
node hashgen.js   # copy the hash output
```

```sql
-- Option 1: Update an existing registered user
UPDATE users SET role = 'admin' WHERE email = 'admin@myshop.com';

-- Option 2: Insert a new admin with the hash from above
INSERT INTO users (email, password_hash, first_name, role)
VALUES ('admin@myshop.com', '$2b$10$...paste_hash_here...', 'Admin', 'admin');
```

---

## 4. Phase 3 — Products & CRUD

### Route Summary

| Method + Path             | Access | Description                                    |
|---------------------------|--------|------------------------------------------------|
| `GET /api/products`       | Public | List all active products with optional filters |
| `GET /api/products/:id`   | Public | Get a single product by ID                     |
| `POST /api/products`      | Admin  | Create a new product                           |
| `PUT /api/products/:id`   | Admin  | Partial update — only sent fields are changed  |
| `DELETE /api/products/:id`| Admin  | Soft delete — sets `is_active = false`         |

### Dynamic Filtering

`GET /api/products` supports four optional query parameters that can be combined in any combination:

| Query Parameter        | Description                                              |
|------------------------|----------------------------------------------------------|
| `?search=headphones`   | `ILIKE` match on name AND description (case-insensitive) |
| `?category=1`          | Filter by `category_id`                                  |
| `?minPrice=10`         | Filter products priced at or above value                 |
| `?maxPrice=100`        | Filter products priced at or below value                 |

**Examples:**
```
GET /api/products?search=headphones
GET /api/products?category=1&minPrice=10&maxPrice=100
GET /api/products?search=book&maxPrice=30
```

The `WHERE` clause is built dynamically using arrays. Each filter pushes a condition and a value — the placeholder number (`$1`, `$2`, etc.) always equals `params.length` at the moment of pushing, so it is always correct regardless of which filters are present.

### Why `ILIKE` and not `LIKE`?

`ILIKE` is PostgreSQL's case-insensitive version of `LIKE`. A user searching `"Headphones"` will match a product named `"Wireless headphones"`. Without `ILIKE` the search would be case-sensitive and miss results.

### Partial Update

`PUT /api/products/:id` only updates fields that are sent in the request body. The `SET` clause is built dynamically. The product `id` is always pushed last so `params.length` always equals the correct `$N` placeholder.

```js
// Only price and stock sent:
params = [44.99, 20, 5]          // id is last → length = 3
fields = ['price = $1', 'stock = $2']
// Final SQL: SET price = $1, stock = $2 WHERE id = $3
```

---

## 5. Phase 4 — Shopping Cart

The cart is implemented as a simple `cart_items` table. There is no separate "cart" object — the cart IS the collection of rows for a given `user_id`. One row = one product. The `quantity` column says how many.

### Route Summary

| Method + Path                       | Access | Description                                    |
|-------------------------------------|--------|------------------------------------------------|
| `GET /api/cart`                     | Auth   | View cart with subtotals and total              |
| `POST /api/cart/items`              | Auth   | Add item or increment quantity if already exists|
| `PUT /api/cart/items/:productId`    | Auth   | Update quantity. Setting to `0` removes the item|
| `DELETE /api/cart/items/:productId` | Auth   | Remove single item                              |
| `DELETE /api/cart`                  | Auth   | Clear entire cart                               |

### ON CONFLICT DO UPDATE

When a user adds a product already in their cart, instead of inserting a duplicate row, the quantity is incremented:

```sql
INSERT INTO cart_items (user_id, product_id, quantity)
VALUES ($1, $2, $3)
ON CONFLICT (user_id, product_id)
DO UPDATE SET quantity = cart_items.quantity + $3
```

> This works because of the `UNIQUE(user_id, product_id)` constraint defined in `schema.sql`.

### Security

The `user_id` in every cart query comes from `req.user` (the verified JWT), not from the request body. A user can never access or modify another user's cart — even if they know the other user's id.

---

## 6. Phase 5 — Stripe Payments

### Payment Flow

The card number never touches your server — Stripe handles it entirely.

| Step                     | What happens                                                                                                         |
|--------------------------|----------------------------------------------------------------------------------------------------------------------|
| 1 — Create PaymentIntent | Server calculates cart total in cents, calls `stripe.paymentIntents.create()`, returns `client_secret` to frontend   |
| 2 — Frontend confirms    | Frontend passes card to `Stripe.js`, Stripe charges the card securely                                                |
| 3 — Server confirms      | Server retrieves PaymentIntent from Stripe, verifies `status === 'succeeded'`, creates the order                     |

### Why Cents?

Stripe uses the smallest currency unit to avoid floating point errors:

```js
// $119.97 → 11997 cents
const totalCents = Math.round(totalDecimal * 100);
```

### Database Transaction

All four writes happen inside a `BEGIN / COMMIT / ROLLBACK` transaction:

1. `INSERT INTO orders` — create the order row
2. `INSERT INTO order_items` — create line items with `price_at_purchase`
3. `UPDATE products SET stock = stock - quantity` — decrement stock
4. `DELETE FROM cart_items` — clear the cart

If any step fails, `ROLLBACK` undoes everything. The database can never end up half-finished.

### Important Configuration

Set `allow_redirects: 'never'` to disable redirect-based payment methods that require a `return_url`:

```js
automatic_payment_methods: {
    enabled: true,
    allow_redirects: 'never'   // disables Klarna, Affirm, CashApp etc.
}
```

### Stripe Test Cards

| Card Number               | Result           |
|---------------------------|------------------|
| `4242 4242 4242 4242`     | Payment succeeds |
| `4000 0000 0000 9995`     | Payment declined |

Use any future expiry date and any 3-digit CVC. Stay on `sk_test_` keys throughout development.

---

## 7. Phase 6 — Security & Frontend

### Security Middleware

| Middleware           | What it does                                                                                               |
|----------------------|------------------------------------------------------------------------------------------------------------|
| `helmet()`           | Sets 10+ HTTP security headers on every response. Removes `X-Powered-By` header. Must be placed **first**. |
| `express-rate-limit` | Auth routes: 10 requests per 15 minutes. Other routes: 100 per 15 minutes.                                 |
| `express.json()`     | Parses incoming JSON request bodies. Without this `req.body` is `undefined`.                               |
| `cookie-parser`      | Parses cookies so the frontend can store the JWT token across page visits.                                 |

> **Important:** Helmet must be the very first middleware — before `cors()`.

> **Express version:** Express 5 has compatibility issues with helmet 8. Use Express 4 (`npm install express@4.18.2`) for stability.

### Error Handling — Three Layers

| Layer                | Purpose                                                                                                                    |
|----------------------|----------------------------------------------------------------------------------------------------------------------------|
| Local catch blocks   | Each controller catches its own errors and logs which function failed. Calls `next(error)` to forward to global handler.   |
| Global error handler | Catches any error passed via `next(error)`. Must have exactly **4 parameters** `(err, req, res, next)`. Placed **last**.   |
| 404 handler          | Catches requests to routes that do not exist. Returns clean JSON.                                                          |

```js
// app.js — order matters
app.use(helmet());                // 1st always
app.use(cors());
app.use(express.json());

app.use('/api/auth',     authLimiter, authRoutes);
app.use('/api/products', apiLimiter,  productRoutes);
// ... other routes

app.use((req, res) => {           // 404 — after all routes
    res.status(404).json({ error: `Route ${req.method} ${req.originalUrl} not found` });
});

app.use((err, req, res, next) => { // Error handler — last of all
    const statusCode = err.status || 500;
    res.status(statusCode).json({ error: err.message || 'Internal server error' });
});
```

### EJS Templating

EJS (Embedded JavaScript) lets you write JavaScript inside HTML files. Express renders the template and sends finished HTML to the browser.

| Tag | Purpose |
|---|---|
| `<% %>` | Runs JavaScript — no output. Used for loops and conditionals. |
| `<%= %>` | Outputs a value, HTML-escaped. Safe for user data. |
| `<%- %>` | Outputs raw HTML, unescaped. Used for `include()` calls. |

```js
// In app.js:
app.set('view engine', 'ejs');     // use EJS as template engine
app.set('views', './views');        // where .ejs files live
app.use(express.static('public'));  // serve CSS and JS files

// In a route handler:
res.render('products', { products, cartCount, user });
//           ↑                      ↑
//   views/products.ejs    data available as variables inside the template
```

---

## 8. Deployment — Railway

### Pre-Deployment Checklist

- `.gitignore` includes `node_modules/` and `.env`
- `package.json` has `"start": "node app.js"`
- `db/index.js` supports `DATABASE_URL` for Railway's connection string
- SSL enabled for Railway PostgreSQL

### DATABASE_URL Support

Update `db/index.js` to support both local and Railway connection:

```js
const pool = process.env.DATABASE_URL
    ? new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }   // required for Railway
    })
    : new Pool({
        host:     process.env.DB_HOST,
        port:     process.env.DB_PORT,
        database: process.env.DB_NAME,
        user:     process.env.DB_USER,
        password: process.env.DB_PASSWORD,
    });
```

### Deployment Steps

1. Push project to GitHub (`git init`, `git add .`, `git commit`, `git push`)
2. Go to [railway.app](https://railway.app) and sign in with GitHub
3. New Project → Deploy from GitHub repo → select your repo
4. Add PostgreSQL: click **+ New** → Database → PostgreSQL
5. Set all environment variables in the **Variables** tab
6. Run SQL files against the Railway database:

```powershell
psql "postgresql://postgres:password@host.railway.app:5432/railway" -f schema.sql
psql "postgresql://postgres:password@host.railway.app:5432/railway" -f seed.sql
```

7. Generate a domain in **Settings** → Domains
8. Test the live URL in Postman

### Environment Variables to Set in Railway

| Variable | Value |
|---|---|
| `DB_HOST` | Railway PostgreSQL host |
| `DB_PORT` | `5432` |
| `DB_NAME` | `railway` |
| `DB_USER` | `postgres` |
| `DB_PASSWORD` | Railway PostgreSQL password |
| `JWT_SECRET` | Long random string (32+ characters) |
| `STRIPE_SECRET_KEY` | `sk_test_...` |
| `STRIPE_PUBLIC_KEY` | `pk_test_...` |
| `PORT` | `5000` |
| `API_URL` | `https://your-app.up.railway.app/api` |
| `NODE_ENV` | `production` |

---

## 9. Complete API Reference

All protected routes require:
```
Authorization: Bearer <your_token>
```

### Auth

| Endpoint | Body | Response |
|---|---|---|
| `POST /api/auth/register` | `email, password, first_name, last_name` | `201` — token + user |
| `POST /api/auth/login` | `email, password` | `200` — token + user |

### Products

| Endpoint | Auth | Response |
|---|---|---|
| `GET /api/products` | Public — `?search ?category ?minPrice ?maxPrice` | `200` — `{ count, products }` |
| `GET /api/products/:id` | Public | `200` — `{ product }` |
| `POST /api/products` | Admin | `201` — `{ product }` |
| `PUT /api/products/:id` | Admin | `200` — `{ product }` |
| `DELETE /api/products/:id` | Admin | `200` — deactivated message |

### Cart

| Endpoint | Auth | Response |
|---|---|---|
| `GET /api/cart` | Auth | `200` — `{ item_count, cart_total, items }` |
| `POST /api/cart/items` | Auth — `product_id, quantity` | `201` — `{ cart_item }` |
| `PUT /api/cart/items/:productId` | Auth — `quantity` | `200` — `{ cart_item }` |
| `DELETE /api/cart/items/:productId` | Auth | `200` — removed message |
| `DELETE /api/cart` | Auth | `200` — cleared message |

### Checkout & Orders

| Endpoint | Auth | Response |
|---|---|---|
| `POST /api/checkout/create-payment-intent` | Auth | `200` — `{ client_secret, payment_intent_id, amount }` |
| `POST /api/checkout/confirm` | Auth — `payment_intent_id` | `201` — `{ order }` |
| `GET /api/orders` | Auth | `200` — `{ orders }` |
| `GET /api/orders/:id` | Auth | `200` — `{ order with items }` |

### HTTP Status Codes

| Code | Meaning |
|---|---|
| `200` | Success |
| `201` | Created successfully |
| `400` | Bad request — invalid or missing data |
| `401` | Unauthorized — no token or invalid token |
| `403` | Forbidden — authenticated but not allowed |
| `404` | Not found |
| `409` | Conflict — e.g. email already exists |
| `429` | Too many requests — rate limit exceeded |
| `500` | Internal server error |

---

## 10. Key Lessons Learned

### Security
- Never store plain text passwords — always use bcrypt with salt rounds of 10+
- Never expose `JWT_SECRET` or `STRIPE_SECRET_KEY` in code or GitHub
- Use vague error messages for auth failures to avoid revealing which emails are registered
- The `user_id` in protected routes must always come from `req.user` (the verified token), never from `req.body`
- Helmet must be the first middleware — before `cors()`
- Never commit `.env` to GitHub — add it to `.gitignore` immediately

### Database
- The order tables are created in matters — foreign key targets must exist first
- Use parameterised queries (`$1`, `$2`) always — never string interpolation in SQL
- Soft delete (`is_active = false`) is safer than hard delete for data with relationships
- `price_at_purchase` must be stored at checkout — never recalculate from current product price
- Database transactions (`BEGIN/COMMIT/ROLLBACK`) ensure all-or-nothing writes

### JWT Tokens
- A JWT is a snapshot — it does not update when the database changes
- After updating a user's role in the database, the user must log in again to get a fresh token
- Keep the JWT payload small — only store `id` and `role`, not sensitive data

### Express
- Middleware order matters — helmet first, then cors, then express.json
- The global error handler must have exactly 4 parameters `(err, req, res, next)`
- The 404 handler must come after all routes, and the error handler must come last of all
- Express 5 has compatibility issues with many packages — use Express 4 for stability

### Stripe
- The card number must never touch your server — always use Stripe.js on the frontend
- Always verify PaymentIntent status directly from Stripe on your server — never trust the frontend
- Use `allow_redirects: 'never'` when testing without a frontend
- Stripe uses cents — multiply dollars by 100 and use `Math.round()`
- Stay on `sk_test_` keys throughout development

---

*E-Commerce API — Complete Development Guide*
