# 🛒 E-Commerce API

![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![Express.js](https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-336791?style=for-the-badge&logo=postgresql&logoColor=white)
![Stripe](https://img.shields.io/badge/Stripe-626CD9?style=for-the-badge&logo=Stripe&logoColor=white)
![JWT](https://img.shields.io/badge/JWT-black?style=for-the-badge&logo=JSON%20web%20tokens)
![License](https://img.shields.io/badge/License-ISC-blue?style=for-the-badge)

A robust and scalable RESTful E-Commerce API built with Node.js, Express, and PostgreSQL. This project provides a solid foundation for building a full-featured online marketplace, complete with JWT authentication, product management, shopping carts, Stripe payments processing, and order history.

---

## 🚀 Features

- **User Management**: Authentication-ready schema for customers and admins using JWT.
- **Admin Dashboard UI**: Built-in visual interface for admins to add, edit, and soft-delete products directly from the browser.
- **Product Catalog**: Efficient organization with categories, detailed product information, and search/filtering.
- **Shopping Cart**: Persistent cart management for registered users.
- **Checkout & Payments**: Secure payment processing integration with Stripe.
- **Order Processing**: Full lifecycle tracking from pending to shipped/cancelled, with immutable order items.
- **Security & Rate Limiting**: Brute force protection via `express-rate-limit` and secure headers with `helmet`.
- **Database Optimized**: Includes indexes for high-performance queries and foreign key constraints for data integrity.
- **Seed Data**: Comprehensive test data for immediate development and testing.

---

## 🛠️ Tech Stack

| Technology           | Purpose                      |
|----------------------|------------------------------|
| Node.js + Express    | HTTP server and routing      |
| PostgreSQL           | Database                     |
| EJS                  | Frontend HTML templates      |
| bcrypt               | Password hashing             |
| jsonwebtoken         | Authentication tokens        |
| Stripe               | Payment processing           |
| helmet               | Security headers             |
| express-rate-limit   | Brute force protection       |

---

## 📂 Project Structure

```text
server/
├── src/
│   ├── app.js                    ← Entry point, middleware, routes
│   ├── db/
│   │   └── index.js              ← PostgreSQL connection pool
│   ├── middleware/
│   │   ├── authenticate.js       ← JWT verification
│   │   └── isAdmin.js            ← Admin role check
│   ├── controllers/
│   │   ├── authController.js     ← Register, login
│   │   ├── productController.js  ← Product CRUD
│   │   ├── cartController.js     ← Cart management
│   │   ├── checkoutController.js ← Stripe payments
│   │   └── orderController.js    ← Order history
│   └── routes/
│       ├── auth.js
│       ├── products.js
│       ├── cart.js
│       ├── checkout.js
│       └── orders.js
├── schema.sql                    ← Table definitions
├── seed.sql                      ← Test data
├── package.json
└── .env                          ← Environment variables (never commit)
```

---

## ⚙️ Getting Started

### 1. Prerequisites
- **Node.js** (v14+)
- **PostgreSQL** (v12+)
- **npm** or **yarn**

### 2. Installation
```bash
# Clone the repository
git clone <repository-url>

# Navigate to the project directory
cd e_commerce_api

# Install dependencies
npm install
```

### 3. Environment Configuration
Copy the example environment file and set up your variables:
```bash
cp .env.example .env
```

Edit `.env`:
```env
PORT=5000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=ecommerce_db
DB_USER=ecommerce_user
DB_PASSWORD=your_password
JWT_SECRET=your_long_random_secret
STRIPE_SECRET_KEY=sk_test_your_stripe_key
```

### 4. Database Setup
1. Create a new PostgreSQL database:
   ```sql
   CREATE DATABASE ecommerce_db;
   ```
2. Initialize the schema and seed data (ensure you are logged in with a user that has privileges):
   ```bash
   psql -U ecommerce_user -d ecommerce_db -f schema.sql
   psql -U ecommerce_user -d ecommerce_db -f seed.sql
   ```

### 5. Running the Application
```bash
# Development mode (with nodemon)
npm run dev

# Production mode
npm start
```

---

## 📜 Database Schema Overview

The database is built on a relational architecture ensuring high integrity:

- **Users**: Admin and Customer roles.
- **Categories**: Logical grouping of items.
- **Products**: Detailed inventory items with stock tracking.
- **Cart Items**: Temporary storage for user selections.
- **Orders**: Secure records of finalized purchases.
- **Order Items**: Immutable snapshot of products at time of purchase.

---

## 🛡️ Authentication & Rate Limiting

### Authentication
This API uses **JWT (JSON Web Tokens)**. After logging in, include the token in every protected request:

```
Authorization: Bearer <your_token>
```

Tokens expire after **7 days**. Log in again to get a fresh token.

### Rate Limiting

| Route group       | Limit                      |
|-------------------|----------------------------|
| `/auth/*`         | 10 requests per 15 minutes |
| All other routes  | 100 requests per 15 minutes|

Exceeding the limit returns `429 Too Many Requests`.

---

## 👑 Admin GUI Dashboard

A built-in HTML interface has been added for administrators to intuitively manage the store's inventory right from the browser. 

- **Access URL**: `/login`
- **Test Admin Credentials**: `admin@myshop.com` / `Password123!`
- **Capabilities**: 
  - **Add Products**: Dedicated form to populate new inventory item data.
  - **Edit Products**: Safely update a product's details and active stock from its page.
  - **Soft-Delete Products**: Remove a product from public visibility without breaking historical order data attached to it.

---

## 🛣️ API Reference

### 🔐 Auth

#### POST `/api/auth/register`
Create a new customer account.

**Access:** Public

**Request body:**
```json
{
    "email": "john@email.com",
    "password": "mypassword",
    "first_name": "John",
    "last_name": "Doe"
}
```

**Success response `201`:**
```json
{
    "message": "Account created successfully",
    "token": "eyJhbGci...",
    "user": {
        "id": 1,
        "email": "john@email.com",
        "first_name": "John",
        "last_name": "Doe",
        "role": "customer",
        "created_at": "2026-03-15T18:00:00.000Z"
    }
}
```

**Error responses:**
| Status| Reason                            |
|-------|-----------------------------------|
| `400` | Email or password missing         |
| `400` | Password shorter than 6 characters|
| `409` | Email already registered          |

---

#### POST `/auth/login`
Log in and receive a JWT token.

**Access:** Public

**Request body:**
```json
{
    "email": "john@email.com",
    "password": "mypassword"
}
```

**Success response `200`:**
```json
{
    "message": "Login successful",
    "token": "eyJhbGci...",
    "user": {
        "id": 1,
        "email": "john@email.com",
        "first_name": "John",
        "last_name": "Doe",
        "role": "customer",
        "created_at": "2026-03-15T18:00:00.000Z"
    }
}
```

**Error responses:**
| Status| Reason                            |
|-------|-----------------------------------|
| `400` | Email or password missing         |
| `401` | Invalid email or password         |

---

### 📦 Products

#### GET `/products`
Get all active products. Supports optional filtering.

**Access:** Public

**Query parameters (all optional):**
| Parameter  | Type   | Example                | Description                 |
|------------|--------|------------------------|-----------------------------|
| `search`   | string | `?search=headphones`   | Search name and description |
| `category` | number | `?category=1`          | Filter by category ID       |
| `minPrice` | number | `?minPrice=10`         | Minimum price               |
| `maxPrice` | number | `?maxPrice=100`        | Maximum price               |

**Example requests:**
```
GET /products
GET /products?search=headphones
GET /products?category=1&minPrice=10&maxPrice=100
GET /products?search=book&maxPrice=30
```

**Success response `200`:**
```json
{
    "count": 2,
    "products": [
        {
            "id": 1,
            "name": "Wireless Headphones",
            "description": "Noise-cancelling over-ear headphones",
            "price": "49.99",
            "stock": 100,
            "is_active": true,
            "category": "Electronics",
            "created_at": "2026-03-08T13:53:02.000Z"
        }
    ]
}
```

---

#### GET `/products/:id`
Get a single product by ID.

**Access:** Public

**Success response `200`:**
```json
{
    "product": {
        "id": 1,
        "name": "Wireless Headphones",
        "description": "Noise-cancelling over-ear headphones",
        "price": "49.99",
        "stock": 100,
        "is_active": true,
        "category": "Electronics",
        "category_id": 1,
        "created_at": "2026-03-08T13:53:02.000Z"
    }
}
```

**Error responses:**
| Status | Reason |
|---|---|
| `404` | Product not found or deactivated |

---

#### POST `/products`
Create a new product.

**Access:** Admin only

**Headers:**
```
Authorization: Bearer <admin_token>
```

**Request body:**
```json
{
    "name": "Smart Watch",
    "description": "Tracks steps and sleep",
    "price": 79.99,
    "stock": 30,
    "category_id": 1
}
```

**Success response `201`:**
```json
{
    "message": "Product created successfully",
    "product": {
        "id": 11,
        "name": "Smart Watch",
        "description": "Tracks steps and sleep",
        "price": "79.99",
        "stock": 30,
        "is_active": true,
        "category_id": 1,
        "created_at": "2026-03-15T18:00:00.000Z"
    }
}
```

**Error responses:**
| Status| Reason                              |
|-------|-------------------------------------|
| `400` | Missing name, price, or stock       |
| `400` | Price is negative                   |
| `400` | Stock is not a non-negative integer |
| `400` | category_id does not exist          |
| `401` | No token provided                   |
| `403` | Not an admin                        |

---

#### PUT `/products/:id`
Update a product. Only send the fields you want to change.

**Access:** Admin only

**Request body (all fields optional):**
```json
{
    "price": 44.99,
    "stock": 80
}
```

**Success response `200`:**
```json
{
    "message": "Product updated successfully",
    "product": { ... }
}
```

---

#### DELETE `/products/:id`
Soft-delete a product (sets `is_active = false`). The product disappears from listings but order history stays intact.

**Access:** Admin only

**Success response `200`:**
```json
{
    "message": "Product \"Wireless Headphones\" has been deactivated",
    "product": {
        "id": 1,
        "name": "Wireless Headphones",
        "is_active": false
    }
}
```

---

### 🛒 Cart

All cart routes require a valid JWT token. Users can only access their own cart.

---

#### GET `/cart`
Get the current user's cart with subtotals and total.

**Access:** Authenticated

**Success response `200`:**
```json
{
    "item_count": 2,
    "cart_total": "119.97",
    "items": [
        {
            "cart_item_id": 1,
            "quantity": 1,
            "added_at": "2026-03-15T18:36:39.000Z",
            "product_id": 1,
            "name": "Wireless Headphones",
            "price": "49.99",
            "stock": 100,
            "subtotal": "49.99"
        }
    ]
}
```

---

#### POST `/cart/items`
Add a product to the cart. If the product is already in the cart, quantity is incremented.

**Access:** Authenticated

**Request body:**
```json
{
    "product_id": 1,
    "quantity": 2
}
```

**Success response `201`:**
```json
{
    "message": "Wireless Headphones added to cart",
    "cart_item": {
        "id": 1,
        "user_id": 2,
        "product_id": 1,
        "quantity": 2,
        "added_at": "2026-03-15T18:36:39.000Z"
    }
}
```

**Error responses:**
| Status| Reason                            |
|-------|-----------------------------------|
| `400` | product_id missing                |
| `400` | Quantity is not a positive integer|
| `400` | Not enough stock available        |
| `404` | Product not found or inactive     |

---

#### PUT `/cart/items/:productId`
Update the quantity of a cart item. Setting quantity to `0` removes the item entirely.

**Access:** Authenticated

**Request body:**
```json
{
    "quantity": 3
}
```

**Success response `200`:**
```json
{
    "message": "Cart updated",
    "cart_item": { ... }
}
```

---

#### DELETE `/cart/items/:productId`
Remove a single item from the cart.

**Access:** Authenticated

**Success response `200`:**
```json
{
    "message": "Item removed from cart"
}
```

---

#### DELETE `/cart`
Clear all items from the cart.

**Access:** Authenticated

**Success response `200`:**
```json
{
    "message": "Cart cleared"
}
```

---

### 💳 Checkout

---

#### POST `/checkout/create-payment-intent`
Calculates the cart total and creates a Stripe PaymentIntent. Returns a `client_secret` for the frontend to confirm payment with Stripe.js.

**Access:** Authenticated

**No request body needed** — reads directly from the user's cart.

**Success response `200`:**
```json
{
    "client_secret": "pi_xxx_secret_xxx",
    "payment_intent_id": "pi_3xxx",
    "amount": "119.97",
    "currency": "usd",
    "items": [ ... ]
}
```

**Error responses:**
| Status| Reason                           |
|-------|----------------------------------|
| `400` | Cart is empty                    |
| `400` | A product has insufficient stock |

---

#### POST `/checkout/confirm`
Verifies the Stripe payment succeeded, creates the order, decrements stock, and clears the cart. All database writes happen inside a transaction — if anything fails, everything is rolled back.

**Access:** Authenticated

**Request body:**
```json
{
    "payment_intent_id": "pi_3xxx"
}
```

**Success response `201`:**
```json
{
    "message": "Order placed successfully",
    "order": {
        "id": 1,
        "status": "paid",
        "total": "119.97",
        "stripe_payment_id": "pi_3xxx",
        "created_at": "2026-03-15T18:00:00.000Z"
    }
}
```

**Error responses:**
| Status| Reason                                    |
|-------|-------------------------------------------|
| `400` | payment_intent_id missing                 |
| `400` | Payment status is not succeeded           |
| `403` | PaymentIntent belongs to a different user |

---

### 📋 Orders

---

#### GET `/orders`
Get all orders for the logged in user, most recent first.

**Access:** Authenticated

**Success response `200`:**
```json
{
    "order_count": 2,
    "orders": [
        {
            "id": 1,
            "status": "paid",
            "total": "119.97",
            "stripe_payment_id": "pi_3xxx",
            "created_at": "2026-03-15T18:00:00.000Z"
        }
    ]
}
```

---

#### GET `/orders/:id`
Get a single order with all its items and the price paid at purchase time.

**Access:** Authenticated

**Success response `200`:**
```json
{
    "order": {
        "id": 1,
        "status": "paid",
        "total": "119.97",
        "stripe_payment_id": "pi_3xxx",
        "created_at": "2026-03-15T18:00:00.000Z",
        "items": [
            {
                "id": 1,
                "quantity": 1,
                "price_at_purchase": "49.99",
                "subtotal": "49.99",
                "name": "Wireless Headphones",
                "description": "Noise-cancelling over-ear headphones"
            }
        ]
    }
}
```

**Error responses:**
| Status| Reason                                    |
|-------|-------------------------------------------|
| `404` | Order not found or belongs to another user|

---

## 🚦 HTTP Status Codes Used

| Code  | Meaning                                   |
|-------|-------------------------------------------|
| `200` | Success                                   |
| `201` | Created successfully                      |
| `400` | Bad request — invalid or missing data     |
| `401` | Unauthorized — no token or invalid token  |
| `403` | Forbidden — authenticated but not allowed |
| `404` | Not found                                 |
| `409` | Conflict — e.g. email already exists      |
| `429` | Too many requests — rate limit hit        |
| `500` | Internal server error                     |

---

## 🧪 Testing with Postman

1. Register or login to get a token.
2. In Postman go to **Headers** tab.
3. Add key `Authorization` with value `Bearer <your_token>`.
4. Or use the **Auth** tab → Type: Bearer Token → paste token.

### Test card numbers (Stripe test mode)
| Card number           | Result            |
|-----------------------|-------------------|
| `4242 4242 4242 4242` | Payment succeeds  |
| `4000 0000 0000 9995` | Payment declined  |

*Use any future expiry date and any 3-digit CVC.*

---

## 🤝 Contributing

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

Distributed under the **ISC License**. See `LICENSE` for more information.