// ============ Imports ============
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");

const v1Router = require("./src/routers/v1/v1.router");
const { RequestLoggerMiddleware } = require("./src/middlewares/requestlogger.middleware.js");
const { connectToDB } = require("./src/database/db.connect.js");
// =================================

// ========== ENVIRONMENT VARIABLES ==========
const PORT = process.env.PORT || 4050;
const NODE_ENV = process.env.NODE_ENV || "Development";
// =========================================

// ============ Server ============
const server = express();

// ── Core Middleware ──
server.use(express.json({ limit: "10mb" }));
server.use(express.urlencoded({ extended: true, limit: "10mb" }));
server.use(cors({
    origin: process.env.CORS_ORIGIN || "*",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
}));
server.use(RequestLoggerMiddleware);

// ── Static uploads (optional — for local dev serving) ──
server.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ── Health check ──
server.get("/health", (req, res) => {
    res.status(200).json({ success: true, status: "ok", env: NODE_ENV });
});

// ── API Routes ──
server.use("/api/v1", v1Router);

// ── 404 Handler ──
server.use((req, res) => {
    res.status(404).json({ success: false, message: `Route ${req.method} ${req.originalUrl} not found.` });
});

// ── Global Error Handler ──
server.use((err, req, res, next) => {
    console.error("[GlobalErrorHandler]", err);
    res.status(err.statusCode || 500).json({
        success: false,
        message: err.message || "Internal server error.",
    });
});
// ================================

// ============ Start Server ============
async function startServer() {
    try {
        await connectToDB();
        server.listen(PORT, () => {
            console.log(`🚀 Server running on port ${PORT} | Environment: ${NODE_ENV}`);
        });
    } catch (error) {
        console.error(`❌ Error while starting the server: ${error.message}`);
        process.exit(1);
    }
}

startServer();
// ================================