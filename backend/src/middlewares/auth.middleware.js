const jwt = require("jsonwebtoken");

const JWT_SECRET_KEY = process.env.JWT_SECRET_KEY;

/**
 * Middleware: verifyToken
 * Validates the Bearer JWT in the Authorization header.
 * On success: attaches req.userId, req.userEmail, req.userRole
 * On failure: returns 401.
 */
const verifyToken = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ success: false, message: "Unauthorized: Token missing or malformed." });
    }

    const token = authHeader.split(" ")[1];

    if (!JWT_SECRET_KEY) {
        console.error("[AuthMiddleware] JWT_SECRET_KEY is not set.");
        return res.status(500).json({ success: false, message: "Server misconfiguration: JWT secret not set." });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET_KEY);
        req.userId = decoded.userId;
        req.userEmail = decoded.email;
        req.userRole = decoded.role;
        next();
    } catch (err) {
        if (err.name === "TokenExpiredError") {
            return res.status(401).json({ success: false, message: "Unauthorized: Token has expired." });
        }
        return res.status(401).json({ success: false, message: "Unauthorized: Invalid token." });
    }
};

// Keep backward-compatible alias for any legacy imports
const AuthMiddleware = verifyToken;

module.exports = { verifyToken, AuthMiddleware };
