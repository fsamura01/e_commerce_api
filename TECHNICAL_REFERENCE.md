# 🛠️ E-Commerce API: Technical Reference Manual

This document serves as a persistent reference for the architectural decisions, debugging strategies, and security patterns implemented in this project.

---

## 🏗️ 1. Project Architecture & Restructuring
### **The "Root-Level" Structure**
Initially, the project was split into a nested `/server` folder. We consolidated everything to the **root** (`d:/e_commerce_api/`) for several reasons:
- **Simplified Dependency Management**: One `package.json` at the root avoids confusion about where `npm install` should be run.
- **Cleaner Entry Point**: `app.js` is now directly accessible, making deployment and containerization (Docker) more straightforward.
- **Improved Tooling Integration**: VS Code and other IDEs default to the root directory for Git, Linting, and Debugging configurations.

### **Layered Logic**
We use a **Model-View-Controller (MVC) neighbor** pattern (without the View):
- **Routes**: Handle URL definitions only.
- **Controllers**: Handle logic and request/response orchestration.
- **DB (Data Layer)**: Handles raw SQL and connection pooling.

---

## 🪲 2. Debugging Strategy
### **Node.js Flags**
- `--inspect`: Starts the debugger. Safe for general use.
- `--inspect-brk`: Pauses on the **very first line** of code. Use this only when you need to debug the *startup* of your app (e.g., checking if `.env` loads correctly).

### **VS Code Troubleshooting**
- **The "Step Over" vs "Step Into" Rule**: 
    - Always **Step Over (F10)** when you are on a line involving `app.use` or `require`. 
    - **Step Into (F11)** only when you want to enter a function *you* wrote. If you step into Express internals, use **Step Out (Shift + F11)** to return to your code.
- **Breakpoints**: Set breakpoints **inside** function bodies (e.g., inside `async (req, res) => { ... }`). Breakpoints on the function definition line often trigger during "warm-up" rather than when the request actually happens.

---

## 🔐 3. Security Implementation
### **Password Safety (Bcrypt)**
We use **Bcrypt** because it includes an automatic "Salt." 
- **The Rationale**: Even if two users have the password `123456`, their hashes in the database will be completely different.
- **Performance**: We use 10 salt rounds. This is the industry standard for a balance between high security (making brute-force hard) and fast server response times (~100ms per hash).

### **Stateless Auth (JWT)**
- **Why JWT?**: It allows the server to verify a user's identity without querying the database on every single request. The user stores the token, and the server just "checks the signature."
- **Secret Management**: The `JWT_SECRET` must be a high-entropy string (generated via `crypto.randomBytes`). If this secret is leaked, anyone can forge admin access.

---

## 📊 4. Database Integration
### **Connection Pooling**
Instead of `client.connect()`, we use `new Pool()`. 
- **Efficiency**: Opening a new connection to Postgres takes ~20-50ms. A pool keeps 10+ connections "warm" and ready to use, reducing latency for every API call.
- **The .env Pattern**: We use `connectionString: process.env.DATABASE_URL`. This allows the app to work seamlessly on your local machine and in the cloud (Heroku, AWS) without changing any code.

### **`pool.query()` vs `pool.connect()`**
Understanding how connections are managed is key to preventing app crashes:

| Feature | `pool.query()` | `pool.connect()` + `release()` |
| :--- | :--- | :--- |
| **Logic** | **Automatic Utilities** | **Manual Management** |
| **Safety** | High (Returns connection automatically) | Risky (Forget `release` = App crash) |
| **Use Case** | 95% of standard queries (Find, Insert, etc) | Complex multi-step SQL **Transactions** |

- **Pro-Tip**: Use our custom `query` helper in `db/index.js`. It uses `pool.query()` behind the scenes, ensuring connections are never "leaked" and logs performance timings automatically.


---

## 🧪 5. Verification Checklist
When testing a new feature:
1. **Restart Server**: `npm run dev` (monitors file changes).
2. **Environment**: Ensure `.env` contains all keys from `.env.example`.
3. **Database**: Check that `schema.sql` has been run on the current database.
4. **Client**: Use a JSON body in Postman and set the `Content-Type` to `application/json`.
