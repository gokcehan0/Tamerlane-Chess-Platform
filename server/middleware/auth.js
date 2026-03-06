const admin = require('firebase-admin');

/**
 * Middleware to verify Firebase ID Token
 * Expects header: Authorization: Bearer <token>
 */
async function verifyToken(req, res, next) {
    const header = req.headers.authorization;

    // If no header, and route is not protected, proceed (anonymous)
    // If you want strict protection, check inside the route or add a strict middleware
    if (!header || !header.startsWith('Bearer ')) {
        // req.user = null;
        return next();
    }

    const token = header.split(' ')[1];

    try {
        const decodedToken = await admin.auth().verifyIdToken(token);
        req.user = decodedToken;
        next();
    } catch (error) {
        console.error("Token Verification Error:", error.message);
        // If token is invalid but present, returns 401
        return res.status(401).json({ error: 'Unauthorized: Invalid Token' });
    }
}

/**
 * Middleware to REQUIRE authentication
 */
function requireAuth(req, res, next) {
    if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized: Login required' });
    }
    next();
}

module.exports = { verifyToken, requireAuth };
