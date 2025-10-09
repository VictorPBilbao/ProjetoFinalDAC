const express = require("express");
const proxy = require("express-http-proxy");
const cors = require("cors");
const morgan = require("morgan");
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
            client: process.env.CLIENT_SERVICE_URL || "http://localhost:8081",
            account: process.env.ACCOUNT_SERVICE_URL || "http://localhost:8082",
            manager: process.env.MANAGER_SERVICE_URL || "http://localhost:8083",
            auth: process.env.AUTH_SERVICE_URL || "http://localhost:8084",
        },
    });
});

// ============================================
// SERVICE HEALTH CHECKS (Individual)
// ============================================

app.get(
    "/health/auth",
    proxy(process.env.AUTH_SERVICE_URL || "http://localhost:8084", {
        proxyReqPathResolver: () => {
            console.log(`📤 [AUTH-HEALTH] Proxying to: /health`);
            return "/health";
        },
        proxyErrorHandler: (err, res, next) => {
            console.error("❌ Auth Service health check error:", err.message);
            res.status(503).json({
                error: "Auth Service unavailable",
                message: err.message,
            });
        },
    })
);

app.get(
    "/health/client",
    proxy(process.env.CLIENT_SERVICE_URL || "http://localhost:8081", {
        proxyReqPathResolver: () => {
            console.log(`📤 [CLIENT-HEALTH] Proxying to: /health`);
            return "/health";
        },
        proxyErrorHandler: (err, res, next) => {
            console.error("❌ Client Service health check error:", err.message);
            res.status(503).json({
                error: "Client Service unavailable",
                message: err.message,
            });
        },
    })
);

// ============================================
// REBOOT ENDPOINT (R01 - Initialize Database)
// ============================================

app.get(
    "/reboot",
    proxy(process.env.CLIENT_SERVICE_URL || "http://localhost:8081", {
        proxyReqPathResolver: () => "/reboot",
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

app.use(
    "/api/clientes",
    proxy(process.env.CLIENT_SERVICE_URL || "http://localhost:8081", {
        proxyReqPathResolver: (req) => {
            // Remove the leading slash from req.url to avoid double slashes
            const path = req.url.startsWith("/") ? req.url.substring(1) : req.url;
            const url = `/api/clientes${path ? "/" + path : ""}`;
            console.log(`📤 [CLIENT] Proxying to: ${url}`);
            return url;
        },
        proxyErrorHandler: (err, res, next) => {
            console.error("❌ Client Service error:", err.message);
            res.status(503).json({
                error: "Client Service unavailable",
                message: err.message,
            });
        },
    })
);

// ============================================
// ACCOUNT SERVICE ROUTES (Placeholder)
// ============================================

app.use(
    "/api/contas",
    proxy(process.env.ACCOUNT_SERVICE_URL || "http://localhost:8082", {
        proxyReqPathResolver: (req) => {
            const path = req.url.startsWith("/") ? req.url.substring(1) : req.url;
            const url = `/api/contas${path ? "/" + path : ""}`;
            console.log(`📤 [ACCOUNT] Proxying to: ${url}`);
            return url;
        },
        proxyErrorHandler: (err, res, next) => {
            console.error("❌ Account Service error:", err.message);
            res.status(503).json({
                error: "Account Service unavailable",
                message: "This service is not yet implemented",
            });
        },
    })
);

// ============================================
// MANAGER SERVICE ROUTES (Placeholder)
// ============================================

app.use(
    "/api/gerentes",
    proxy(process.env.MANAGER_SERVICE_URL || "http://localhost:8083", {
        proxyReqPathResolver: (req) => {
            const path = req.url.startsWith("/") ? req.url.substring(1) : req.url;
            const url = `/api/gerentes${path ? "/" + path : ""}`;
            console.log(`📤 [MANAGER] Proxying to: ${url}`);
            return url;
        },
        proxyErrorHandler: (err, res, next) => {
            console.error("❌ Manager Service error:", err.message);
            res.status(503).json({
                error: "Manager Service unavailable",
                message: "This service is not yet implemented",
            });
        },
    })
);

// ============================================
// AUTH SERVICE ROUTES (Placeholder)
// ============================================

app.post(
    "/login",
    proxy(process.env.AUTH_SERVICE_URL || "http://localhost:8084", {
        proxyReqPathResolver: () => {
            console.log(`📤 [AUTH] Proxying to: /login`);
            return "/login";
        },
        proxyErrorHandler: (err, res, next) => {
            console.error("❌ Auth Service error:", err.message);
            res.status(503).json({
                error: "Auth Service unavailable",
                message: "This service is not yet implemented",
            });
        },
    })
);

app.post(
    "/logout",
    proxy(process.env.AUTH_SERVICE_URL || "http://localhost:8084", {
        proxyReqPathResolver: () => {
            console.log(`📤 [AUTH] Proxying to: /logout`);
            return "/logout";
        },
        proxyErrorHandler: (err, res, next) => {
            console.error("❌ Auth Service error:", err.message);
            res.status(503).json({
                error: "Auth Service unavailable",
                message: "This service is not yet implemented",
            });
        },
    })
);

// ============================================
// JWT VALIDATION ROUTE
// ============================================

app.get(
    "/validate",
    proxy(process.env.AUTH_SERVICE_URL || "http://localhost:8084", {
        proxyReqPathResolver: () => {
            console.log(`📤 [AUTH] Proxying to: /validate`);
            return "/validate";
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
