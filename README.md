# 🛒 E-Commerce API

![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![Express.js](https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-336791?style=for-the-badge&logo=postgresql&logoColor=white)
![License](https://img.shields.io/badge/License-ISC-blue?style=for-the-badge)

A robust and scalable E-Commerce API built with Node.js, Express, and PostgreSQL. This project provides a solid foundation for building a full-featured online marketplace, complete with user management, product categorization, shopping carts, and order processing.

---

## 🚀 Features

- **User Management**: Authentication-ready schema for customers and admins.
- **Product Catalog**: Efficient organization with categories and detailed product information.
- **Shopping Cart**: Persistent cart management for registered users.
- **Order Processing**: Full lifecycle tracking from pending to shipped/cancelled.
- **Database Optimized**: Includes indexes for high-performance queries and foreign key constraints for data integrity.
- **Seed Data**: Comprehensive test data for immediate development and testing.

---

## 🛠️ Tech Stack

- **Backend**: [Node.js](https://nodejs.org/) & [Express.js](https://expressjs.com/)
- **Database**: [PostgreSQL](https://www.postgresql.org/)
- **Utility**: `dotenv` (Environment Variables), `cors` (Cross-Origin Resource Sharing), `pg` (Postgres Client)
- **Development**: `nodemon` (Hot Reloading)

---

## 📂 Project Structure

```text
e_commerce_api/
├── server/
│   ├── src/
│   │   ├── controllers/    # Request handlers (logic)
│   │   ├── routes/         # API endpoint definitions
│   │   ├── middleware/     # Custom auth & validation middleware
│   │   └── db/             # Database connection & queries
│   ├── app.js              # Entry point & server configuration
│   ├── schema.sql          # Database table definitions
│   ├── seed.sql            # Initial test data
│   └── package.json        # Dependencies & scripts
└── README.md
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

# Navigate to the server directory
cd e_commerce_api/server

# Install dependencies
npm install
```

### 3. Database Setup
1. Create a new PostgreSQL database:
   ```sql
   CREATE DATABASE ecommerce_db;
   ```
2. Initialize the schema and seed data:
   ```bash
   # Run schema lines
   psql -U your_user -d ecommerce_db -f schema.sql
   
   # Run seed lines
   psql -U your_user -d ecommerce_db -f seed.sql
   ```

### 4. Environment Configuration
Create a `.env` file in the `server` directory and add your credentials:
```env
PORT=5000
DATABASE_URL=postgres://your_user:your_password@localhost:5432/ecommerce_db
```

### 5. Running the Application
```bash
# Development mode (with nodemon)
npm run dev

# Production mode
npm start
```

---

## 🛣️ API Endpoints (Core)

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/test` | Verify server status |
| `GET` | `/api/db-test` | Check database connectivity |
| `POST` | `/api/auth/register` | Register a new user (Pending) |
| `GET` | `/api/products` | Browse all products (Pending) |
| `GET` | `/api/categories` | List product categories (Pending) |

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

## 🤝 Contributing

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

Distributed under the **ISC License**. See `LICENSE` for more information.
