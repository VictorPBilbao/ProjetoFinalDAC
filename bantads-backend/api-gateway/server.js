const express = require("express");
const proxy = require("express-http-proxy");
const cors = require("cors");
const morgan = require("morgan");
const { authenticateToken, requireRole, requireOwnerOrAdmin } = require("./middleware/auth");

require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

// ============================================
// MIDDLEWARE CONFIGURATION
// ============================================

// Enable CORS for all origins (adjust in production)
app.use(cors());

// Parse JSON request bodies
app.use(express.json());

// Log all HTTP requests
app.use(morgan("dev"));

// ============================================
// HEALTH CHECK ENDPOINT
// ============================================

app.get("/health", (req, res) => {
    res.json({
        status: "✅ API Gateway is running!",
        timestamp: new Date().toISOString(),
        services: {
            client: process.env.CLIENT_SERVICE_URL,
            account: process.env.ACCOUNT_SERVICE_URL,
            manager: process.env.MANAGER_SERVICE_URL,
            auth: process.env.AUTH_SERVICE_URL,
        },
    });
});

// ============================================
// SERVICE HEALTH CHECKS (Individual)
// ============================================

app.get("/health/auth", proxy(process.env.AUTH_SERVICE_URL));

app.get("/health/client", proxy(process.env.CLIENT_SERVICE_URL));

// ============================================
// REBOOT ENDPOINT (R01 - Initialize Database)
// ============================================

app.get(
    "/reboot",
    proxy(process.env.CLIENT_SERVICE_URL || "http://localhost:8081", {
        proxyErrorHandler: (err, res, next) => {
            console.error("❌ Reboot proxy error:", err.message);
            res.status(503).json({
                error: "Service unavailable",
                message: "Could not initialize database",
            });
        },
    })
);

// ============================================
// CLIENT SERVICE ROUTES
// ============================================

app.get(
    "/clientes",
    authenticateToken,
    requireRole("ADMINISTRADOR"),
    proxy(process.env.CLIENT_SERVICE_URL, {
        proxyReqPathResolver: (req) => {
            return `${req.url}`;
        },
        proxyErrorHandler: (err, res, next) => {
            res.status(503).json({
                error: "Client Service unavailable",
                message: err.message,
            });
        },
    })
);

app.post(
    "/clientes",
    proxy(process.env.CLIENT_SERVICE_URL, {
        proxyReqPathResolver: (req) => {
            return `${req.url}`;
        },
        proxyErrorHandler: (err, res, next) => {
            res.status(503).json({
                error: "Client Service unavailable",
                message: err.message,
            });
        },
    })
);

app.get(
    "/clientes/:cpf",
    authenticateToken,
    requireOwnerOrAdmin("cpf"),
    proxy(process.env.CLIENT_SERVICE_URL, {
        proxyReqPathResolver: (req) => {
            return `${req.url}`;
        },
        proxyErrorHandler: (err, res, next) => {
            res.status(503).json({
                error: "Client Service unavailable",
                message: err.message,
            });
        },
    })
);

// ============================================
// AUTH SERVICE ROUTES
// ============================================

// All auth routes proxy directly without path manipulation
app.use(
    ["/login", "/logout", "/validate"],
    proxy(process.env.AUTH_SERVICE_URL || "http://localhost:8084", {
        proxyReqPathResolver: (req) => {
            console.log(`📤 [AUTH] ${req.method} ${req.originalUrl}`);
            return req.originalUrl;
        },
        proxyErrorHandler: (err, res, next) => {
            console.error("❌ Auth Service error:", err.message);
            res.status(503).json({
                error: "Auth Service unavailable",
                message: err.message,
            });
        },
    })
);

// ============================================
// 404 HANDLER - Route Not Found
// ============================================

app.use((req, res) => {
    console.log(`❌ Route not found: ${req.method} ${req.originalUrl}`);
    res.status(404).json({
        error: "Route not found",
        path: req.originalUrl,
        method: req.method,
    });
});

// ============================================
// START SERVER
// ============================================

app.listen(PORT, () => {
    console.log("\n🚀 =============================================");
    console.log(`   BANTADS API GATEWAY`);
    console.log("   =============================================");
    console.log(`   📍 Running on: http://localhost:${PORT}`);
    console.log(`   🕐 Started at: ${new Date().toLocaleString("pt-BR")}`);
    console.log("   =============================================");
    console.log("\n📡 Microservices Configuration:");
    console.log(
        `   • Client Service:  ${process.env.CLIENT_SERVICE_URL || "http://localhost:8081"}`
    );
    console.log(
        `   • Account Service: ${process.env.ACCOUNT_SERVICE_URL || "http://localhost:8082"}`
    );
    console.log(
        `   • Manager Service: ${process.env.MANAGER_SERVICE_URL || "http://localhost:8083"}`
    );
    console.log(`   • Auth Service:    ${process.env.AUTH_SERVICE_URL || "http://localhost:8084"}`);
    console.log("   =============================================\n");
});
