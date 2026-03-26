# 🚀 Deployment Guide: Neon (Postgres) + Render (Node.js)

This guide explains how to deploy your E-commerce API for free using **Neon** for the database and **Render** for the application server.

---

## 💎 Step 1: Set up Neon (Database)

1.  **Sign up/Login**: Go to [neon.tech](https://neon.tech) and create a free account.
2.  **Create Project**: Click "Create a project". Give it a name (e.g., `ecommerce-db`).
3.  **Get Connection String**:
    *   In the Neon Dashboard, find the **Connection Details** section.
    *   Ensure the role is `alex` (or your username) and the database is `neondb`.
    *   Copy the **Connection string** (it looks like `postgres://user:password@ep-xxx.us-east-2.aws.neon.tech/neondb`).
    *   **Keep this safe!** This is your `DATABASE_URL`.

---

## 🎨 Step 2: Push your Code to GitHub

1.  Create a new, private repository on GitHub.
2.  Initialize git in your project if you haven't:
    ```bash
    git init
    git add .
    git commit -m "Prepare for deployment"
    ```
3.  Link to your GitHub repo and push:
    ```bash
    git remote add origin <your-repo-url>
    git push -u origin main
    ```

---

## ☁️ Step 3: Set up Render (Web Service)

1.  **Sign up/Login**: Go to [render.com](https://render.com).
2.  **New Web Service**: Click **New +** -> **Web Service**.
3.  **Connect Repo**: Connect your GitHub account and select your `e_commerce_api` repository.
4.  **Configure Settings**:
    *   **Name**: `ecommerce-api`
    *   **Runtime**: `Node`
    *   **Build Command**: `npm install`
    *   **Start Command**: `node app.js` (or `npm start`)
5.  **Environment Variables**:
    *   Click **Advanced** -> **Add Environment Variable**.
    *   Add the following keys:
        | Key | Value |
        | :--- | :--- |
        | `NODE_ENV` | `production` |
        | `DATABASE_URL` | *Paste your Neon Connection String* |
        | `JWT_SECRET` | *A random long string (e.g., `f5uzXFxh...`)* |
        | `STRIPE_SECRET_KEY` | *Your Stripe Secret Key (sk_test_...)* |
        | `STRIPE_PUBLIC_KEY` | *Your Stripe Public Key (pk_test_...)* |
        | `API_URL` | `https://your-app-name.onrender.com/api` |
6.  **Deploy**: Click **Create Web Service**.

---

## 🏗️ Step 4: Initialize the Database

Neon starts as an empty database. You need to run your `schema.sql` and `seed.sql` against it.

### Option A: Using Neon's SQL Editor (Easiest)
1.  In the Neon Dashboard, click **SQL Editor** on the left.
2.  Copy the contents of your `schema.sql` file and paste it into the editor. Click **Run**.
3.  Repeat for `seed.sql`.

### Option B: Using psql (Local Terminal)
Replace `<YOUR_CONNECTION_STRING>` with your Neon string:
```bash
psql "<YOUR_CONNECTION_STRING>" -f schema.sql
psql "<YOUR_CONNECTION_STRING>" -f seed.sql
```

---

## ✅ Step 5: Verify Deployment

1.  Once Render finishes the build, click the **URL** provided by Render (e.g., `https://ecommerce-api.onrender.com`).
2.  You should see your health check message: `{"message": "🛍️ E-Commerce API is running", "version": "1.0.0"}`.
3.  Navigate to `/products` to see your storefront!

---

## ⚠️ Important Notes
*   **SSL**: Neon/Render require SSL. We've already updated `server/src/db/index.js` to handle this automatically when `NODE_ENV=production`.
*   **Render Free Tier**: The server will "sleep" after 15 minutes of inactivity. The first request after a sleep might take ~30 seconds to wake up.
*   **Neon Free Tier**: Neon compute will also sleep, but wakes up much faster than Render.
