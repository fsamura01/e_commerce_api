// ================================================
//  server/src/routes/frontend.js
//
//  These routes serve HTML pages using EJS templates.
//  They are DIFFERENT from your API routes (/api/...).
//
//  API routes    → return JSON   → used by Postman / Stripe.js
//  Frontend routes → return HTML  → used by the browser
//
//  HOW EJS WORKS WITH EXPRESS:
//  res.render('products', { products, categories })
//       ↑                    ↑
//       name of the          data passed INTO the template
//       .ejs file            available as variables inside EJS
//
//  Inside products.ejs you can then write:
//  <%= products.length %>   ← outputs the value
//  <% products.forEach() %> ← runs the loop
// ================================================

const express = require('express');
const router  = express.Router();
const axios   = require('axios');

// Base URL for your API — all frontend routes call your own API
const API = process.env.API_URL || 'http://localhost:5000/api';


// ------------------------------------------------
//  HELPER: getCart
//  Gets cart item count for the nav badge.
//  Returns 0 if user is not logged in or cart is empty.
// ------------------------------------------------
const getCartCount = async (token) => {
    if (!token) return 0;
    try {
        const res = await axios.get(`${API}/cart`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        return res.data.item_count || 0;
    } catch {
        return 0;
    }
};


// ------------------------------------------------
//  GET /
//  Home page — redirects to products
// ------------------------------------------------
router.get('/', (req, res) => {
    res.redirect('/products');
});


// ------------------------------------------------
//  GET /products
//  Product listing page with search and filters
// ------------------------------------------------
router.get('/products', async (req, res) => {
    try {
        const token     = req.cookies?.token;
        const cartCount = await getCartCount(token);

        // Build query string from whatever filters were sent
        const params = new URLSearchParams(req.query).toString();

        // Call your own API
        const [productsRes, categoriesRes] = await Promise.all([
            axios.get(`${API}/products${params ? '?' + params : ''}`),
            axios.get(`${API}/categories`)
        ]);

        // res.render(templateName, dataObject)
        // EJS receives products, categories, query, cartCount as variables
        res.render('products', {
            products:   productsRes.data.products,
            categories: categoriesRes.data.categories,
            query:      req.query,
            cartCount,
            user:       req.cookies?.user ? JSON.parse(req.cookies.user) : null,
        });

    } catch (err) {
        res.render('products', {
            products: [], categories: [], query: {},
            error: 'Could not load products', cartCount: 0, user: null
        });
    }
});


// ------------------------------------------------
//  GET /products/:id
//  Single product detail page
// ------------------------------------------------
router.get('/products/:id', async (req, res) => {
    try {
        const token     = req.cookies?.token;
        const cartCount = await getCartCount(token);

        const result = await axios.get(`${API}/products/${req.params.id}`);

        res.render('product', {
            product: result.data.product,
            cartCount,
            user: req.cookies?.user ? JSON.parse(req.cookies.user) : null,
        });

    } catch (err) {
        res.redirect('/products');
    }
});


// ------------------------------------------------
//  POST /cart/add
//  Add item to cart (called from product detail form)
// ------------------------------------------------
router.post('/cart/add', async (req, res) => {
    const token = req.cookies?.token;
    if (!token) return res.redirect('/login');

    try {
        await axios.post(`${API}/cart/items`, req.body, {
            headers: { Authorization: `Bearer ${token}` }
        });
        res.redirect('/cart');
    } catch (err) {
        res.redirect(`/products/${req.body.product_id}`);
    }
});


// ------------------------------------------------
//  GET /cart
//  Cart page
// ------------------------------------------------
router.get('/cart', async (req, res) => {
    const token = req.cookies?.token;
    if (!token) return res.redirect('/login');

    try {
        const result = await axios.get(`${API}/cart`, {
            headers: { Authorization: `Bearer ${token}` }
        });

        res.render('cart', {
            items:      result.data.items,
            cart_total: result.data.cart_total,
            cartCount:  result.data.item_count,
            user: req.cookies?.user ? JSON.parse(req.cookies.user) : null,
        });
    } catch (err) {
        res.redirect('/login');
    }
});


// ------------------------------------------------
//  POST /cart/update
//  Update item quantity (called from cart form)
// ------------------------------------------------
router.post('/cart/update', async (req, res) => {
    const token = req.cookies?.token;
    if (!token) return res.redirect('/login');

    try {
        await axios.put(
            `${API}/cart/items/${req.body.product_id}`,
            { quantity: Number(req.body.quantity) },
            { headers: { Authorization: `Bearer ${token}` } }
        );
    } catch (err) { /* silently continue */ }
    res.redirect('/cart');
});


// ------------------------------------------------
//  POST /cart/remove
//  Remove item from cart
// ------------------------------------------------
router.post('/cart/remove', async (req, res) => {
    const token = req.cookies?.token;
    if (!token) return res.redirect('/login');

    try {
        await axios.delete(`${API}/cart/items/${req.body.product_id}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
    } catch (err) { /* silently continue */ }
    res.redirect('/cart');
});


// ------------------------------------------------
//  GET /checkout
//  Checkout page with Stripe.js
// ------------------------------------------------
router.get('/checkout', async (req, res) => {
    const token = req.cookies?.token;
    if (!token) return res.redirect('/login');

    try {
        const result = await axios.get(`${API}/cart`, {
            headers: { Authorization: `Bearer ${token}` }
        });

        if (result.data.item_count === 0) return res.redirect('/cart');

        res.render('checkout', {
            items:          result.data.items,
            cart_total:     result.data.cart_total,
            cartCount:      result.data.item_count,
            stripePublicKey: process.env.STRIPE_PUBLIC_KEY,
            token,
            user: req.cookies?.user ? JSON.parse(req.cookies.user) : null,
        });
    } catch (err) {
        res.redirect('/cart');
    }
});


// ------------------------------------------------
//  GET /orders
//  Order history page
// ------------------------------------------------
router.get('/orders', async (req, res) => {
    const token = req.cookies?.token;
    if (!token) return res.redirect('/login');

    try {
        const cartCount  = await getCartCount(token);
        const ordersRes  = await axios.get(`${API}/orders`, {
            headers: { Authorization: `Bearer ${token}` }
        });

        // Fetch items for each order
        const orders = await Promise.all(
            ordersRes.data.orders.map(async (order) => {
                const detail = await axios.get(`${API}/orders/${order.id}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                return detail.data.order;
            })
        );

        res.render('orders', {
            orders,
            cartCount,
            user: req.cookies?.user ? JSON.parse(req.cookies.user) : null,
            success: req.query.success ? 'Order placed successfully!' : null,
        });
    } catch (err) {
        res.redirect('/login');
    }
});


// ------------------------------------------------
//  GET /login  POST /login
// ------------------------------------------------
router.get('/login', (req, res) => {
    res.render('login', { error: null, cartCount: 0, user: null });
});

router.post('/login', async (req, res) => {
    try {
        const result = await axios.post(`${API}/auth/login`, req.body);
        const { token, user } = result.data;

        // Store token in a cookie so every subsequent request includes it
        res.cookie('token', token,         { httpOnly: true, maxAge: 7 * 24 * 60 * 60 * 1000 });
        res.cookie('user',  JSON.stringify(user), { maxAge: 7 * 24 * 60 * 60 * 1000 });
        res.redirect('/products');

    } catch (err) {
        res.render('login', {
            error: 'Invalid email or password',
            cartCount: 0, user: null
        });
    }
});


// ------------------------------------------------
//  GET /register  POST /register
// ------------------------------------------------
router.get('/register', (req, res) => {
    res.render('register', { error: null, cartCount: 0, user: null });
});

router.post('/register', async (req, res) => {
    try {
        const result = await axios.post(`${API}/auth/register`, req.body);
        const { token, user } = result.data;

        res.cookie('token', token,          { httpOnly: true, maxAge: 7 * 24 * 60 * 60 * 1000 });
        res.cookie('user',  JSON.stringify(user),  { maxAge: 7 * 24 * 60 * 60 * 1000 });
        res.redirect('/products');

    } catch (err) {
        const msg = err.response?.data?.error || 'Registration failed';
        res.render('register', { error: msg, cartCount: 0, user: null });
    }
});


// ------------------------------------------------
//  GET /logout
//  Clear cookies and redirect to login
// ------------------------------------------------
router.get('/logout', (req, res) => {
    res.clearCookie('token');
    res.clearCookie('user');
    res.redirect('/login');
});

// ------------------------------------------------
//  GET /admin/products/new
//  Render the Add Product form for admins
// ------------------------------------------------
router.get('/admin/products/new', async (req, res) => {
    const token = req.cookies?.token;
    const user = req.cookies?.user ? JSON.parse(req.cookies.user) : null;
    
    if (!token || !user || user.role !== 'admin') {
        return res.redirect('/products');
    }

    try {
        const cartCount = await getCartCount(token);
        const categoriesRes = await axios.get(`${API}/categories`);
        
        res.render('admin_add_product', {
            categories: categoriesRes.data.categories,
            cartCount,
            user,
            error: null,
            success: null
        });
    } catch (err) {
        res.redirect('/products');
    }
});

// ------------------------------------------------
//  POST /admin/products/new
//  Submit a new product (calls API)
// ------------------------------------------------
router.post('/admin/products/new', async (req, res) => {
    const token = req.cookies?.token;
    const user = req.cookies?.user ? JSON.parse(req.cookies.user) : null;
    
    if (!token || !user || user.role !== 'admin') {
        return res.redirect('/products');
    }

    try {
        await axios.post(`${API}/products`, req.body, {
            headers: { Authorization: `Bearer ${token}` }
        });
        res.redirect('/products?success=' + encodeURIComponent('Product added successfully'));
    } catch (err) {
        try {
            const cartCount = await getCartCount(token);
            const categoriesRes = await axios.get(`${API}/categories`);
            const msg = err.response?.data?.error || 'Failed to add product';
            
            res.render('admin_add_product', {
                categories: categoriesRes.data.categories,
                cartCount,
                user,
                error: msg,
                success: null
            });
        } catch (e) {
            res.redirect('/products');
        }
    }
});

// ------------------------------------------------
//  GET /admin/products/edit/:id
//  Render the Edit Product form for admins
// ------------------------------------------------
router.get('/admin/products/edit/:id', async (req, res) => {
    const token = req.cookies?.token;
    const user = req.cookies?.user ? JSON.parse(req.cookies.user) : null;
    
    if (!token || !user || user.role !== 'admin') {
        return res.redirect('/products');
    }

    try {
        const cartCount = await getCartCount(token);
        const [categoriesRes, productRes] = await Promise.all([
            axios.get(`${API}/categories`),
            axios.get(`${API}/products/${req.params.id}`)
        ]);
        
        res.render('admin_edit_product', {
            categories: categoriesRes.data.categories,
            product: productRes.data.product,
            cartCount,
            user,
            error: null,
            success: null
        });
    } catch (err) {
        res.redirect('/products');
    }
});

// ------------------------------------------------
//  POST /admin/products/edit/:id
//  Submit product updates
// ------------------------------------------------
router.post('/admin/products/edit/:id', async (req, res) => {
    const token = req.cookies?.token;
    const user = req.cookies?.user ? JSON.parse(req.cookies.user) : null;
    
    if (!token || !user || user.role !== 'admin') {
        return res.redirect('/products');
    }

    try {
        await axios.put(`${API}/products/${req.params.id}`, req.body, {
            headers: { Authorization: `Bearer ${token}` }
        });
        res.redirect(`/products/${req.params.id}`);
    } catch (err) {
        try {
            const cartCount = await getCartCount(token);
            const [categoriesRes, productRes] = await Promise.all([
                axios.get(`${API}/categories`),
                axios.get(`${API}/products/${req.params.id}`)
            ]);
            
            res.render('admin_edit_product', {
                categories: categoriesRes.data.categories,
                product: { ...productRes.data.product, ...req.body },
                cartCount,
                user,
                error: err.response?.data?.error || 'Failed to update product',
                success: null
            });
        } catch (e) {
            res.redirect('/products');
        }
    }
});

// ------------------------------------------------
//  POST /admin/products/delete/:id
//  Soft-delete product
// ------------------------------------------------
router.post('/admin/products/delete/:id', async (req, res) => {
    const token = req.cookies?.token;
    const user = req.cookies?.user ? JSON.parse(req.cookies.user) : null;
    
    if (!token || !user || user.role !== 'admin') {
        return res.redirect('/products');
    }

    try {
        await axios.delete(`${API}/products/${req.params.id}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        res.redirect('/products?success=' + encodeURIComponent('Product deleted successfully'));
    } catch (err) {
        res.redirect(`/products/${req.params.id}`);
    }
});

module.exports = router;
