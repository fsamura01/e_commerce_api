// ================================================
//  src/middleware/isAdmin.js
//
//  Restricts a route to admin users only.
//
//  ⚠️  ALWAYS use AFTER authenticate — isAdmin reads
//  req.user which authenticate sets. Without authenticate
//  running first, req.user will be undefined and this
//  middleware will crash.
//
//  CORRECT ORDER (authenticate → isAdmin → handler):
//    router.post('/products', authenticate, isAdmin, createProduct);
//
//  WRONG (will crash — req.user not set yet):
//    router.post('/products', isAdmin, createProduct);
//
// ================================================

const isAdmin = (req, res, next) => {

    // req.user was attached by the authenticate middleware.
    // It looks like: { id: 1, role: 'admin', iat: ..., exp: ... }

    // STEP 1: Double-check req.user exists
    // Guards against accidentally using isAdmin without authenticate
    if (!req.user) {
        return res.status(401).json({
            error: 'Authentication required.'
        });
    }

    // STEP 2: Check the role
    if (req.user.role !== 'admin') {
        // 401 = not authenticated (who are you?)
        // 403 = authenticated but not allowed (I know who you are, but no)
        return res.status(403).json({
            error: 'Forbidden. Admin access required.'
        });
    }

    // STEP 3: Role is 'admin' — let the request through
    next();
};

module.exports = isAdmin;