const express = require("express");
const proxy = require("express-http-proxy");
const cors = require("cors");
const morgan = require("morgan");
const { authenticateToken, requireRole, requireOwnerOrAdmin } = require("./middleware/auth");
const axios = require("axios");

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
    "/clientes/validate",
    express.json(),
    proxy(process.env.CLIENT_SERVICE_URL, {
        proxyReqPathResolver: (req) => {
            console.log(`[PROXY] Redirecionando para: /clientes/validateCPF`);
            return "/clientes/validateCPF";
        },
        proxyReqBodyDecorator: (bodyContent, srcReq) => {
            // Valida e sanitiza o CPF no body
            if (!bodyContent.cpf) {
                throw new Error("CPF é obrigatório");
            }
            
            const cpf = bodyContent.cpf.replace(/[^\d]/g, '');
            
            if (cpf.length !== 11) {
                throw new Error("CPF inválido");
            }
            
            console.log(`[PROXY] CPF sanitizado: ${cpf}`);
            return { cpf }; // Retorna o body sanitizado
        },
        userResDecorator: (proxyRes, proxyResData, userReq, userRes) => {
            console.log(`[PROXY] Status recebido: ${proxyRes.statusCode}`);
            
            // Se o microserviço retornar 404, significa que o CPF não existe
            if (proxyRes.statusCode === 404) {
                console.log(`[PROXY] CPF não encontrado (404) - retornando exists: false`);
                return JSON.stringify({ exists: false });
            }
            
            // Trata outros status codes de erro
            if (proxyRes.statusCode >= 400) {
                console.log(`[PROXY] Erro ${proxyRes.statusCode} - retornando exists: false`);
                return JSON.stringify({ exists: false });
            }
            
            // Converte a resposta do microserviço para o formato esperado pelo frontend
            try {
                const apiResponse = JSON.parse(proxyResData.toString('utf8'));
                console.log(`[PROXY] ApiResponse recebida:`, apiResponse);
                
                // Extrai o valor de 'data' do ApiResponse<Boolean>
                const exists = apiResponse.data === true;
                console.log(`[PROXY] CPF exists: ${exists}`);
                
                return JSON.stringify({ exists });
            } catch (error) {
                console.error(`[PROXY] Erro ao processar resposta:`, error);
                // Em caso de erro, assume que não existe
                return JSON.stringify({ exists: false });
            }
        },
        proxyErrorHandler: (err, res, next) => {
            console.error(`[PROXY] Erro:`, err.message);
            res.status(503).json({
                error: "Client Service unavailable",
                message: err.message,
            });
        },
    })
);

// Verifica email do cliente
app.post(
    "/clientes/validateEmail",
    express.json(),
    proxy(process.env.CLIENT_SERVICE_URL, {
        proxyReqPathResolver: (req) => {
            console.log(`[PROXY] Redirecionando para: /clientes/validateEmail`);
            return "/clientes/validateEmail";
        },
        proxyReqBodyDecorator: (bodyContent, srcReq) => {
            // Valida o email no body
            if (!bodyContent.email) {
                throw new Error("Email é obrigatório");
            }

            const email = bodyContent.email.trim().toLowerCase();
            console.log(`[PROXY] Email processado: ${email}`);
            return { email }; // Retorna o body processado
        },
        userResDecorator: (proxyRes, proxyResData, userReq, userRes) => {
            console.log(`[PROXY] Status recebido: ${proxyRes.statusCode}`);
            
            // Trata status codes de erro
            if (proxyRes.statusCode >= 400) {
                console.log(`[PROXY] Erro ${proxyRes.data} - retornando exists: false`);
                return JSON.stringify({ exists: false });
            }
            
            // Converte a resposta do microserviço para o formato esperado pelo frontend
            try {
                const apiResponse = JSON.parse(proxyResData.toString('utf8'));
                console.log(`[PROXY] ApiResponse recebida:`, apiResponse);
                
                // Extrai o valor de 'data' do ApiResponse<Boolean>
                const exists = apiResponse.data === true;
                console.log(`[PROXY] Email exists: ${exists}`);
                
                return JSON.stringify({ exists });
            } catch (error) {
                console.error(`[PROXY] Erro ao processar resposta:`, error);
                // Em caso de erro, assume que não existe
                return JSON.stringify({ exists: false });
            }
        },
        proxyErrorHandler: (err, res, next) => {
            console.error(`[PROXY] Erro:`, err.message);
            res.status(503).json({
                error: "Client Service unavailable",
                message: err.message,
            });
        },
    })
);

app.post(
    "/clientes",
    express.json(),
    proxy(process.env.CLIENT_SERVICE_URL, {
        proxyReqPathResolver: (req) => {
            console.log(`[PROXY] Redirecionando para: /clientes/cadastro`);
            return "/clientes/cadastro";
        },
        proxyReqBodyDecorator: (bodyContent, srcReq) => {
            console.log(`[PROXY] Dados recebidos para cadastro:`, bodyContent);
            
            // Valida campos obrigatórios
            const requiredFields = ['cpf', 'nome', 'email', 'telefone', 'salario', 'endereco', 'cep', 'cidade', 'estado'];
            for (const field of requiredFields) {
                if (!bodyContent[field]) {
                    throw new Error(`Campo obrigatório ausente: ${field}`);
                }
            }
            
            // Sanitiza CPF e CEP (remove formatação)
            const sanitizedBody = {
                ...bodyContent,
                cpf: bodyContent.cpf.replace(/[^\d]/g, ''),
                cep: bodyContent.cep.replace(/[^\d]/g, ''),
                email: bodyContent.email.trim().toLowerCase(),
                estado: bodyContent.estado.toUpperCase()
            };
            
            console.log(`[PROXY] Dados sanitizados:`, sanitizedBody);
            return sanitizedBody;
        },
        userResDecorator: (proxyRes, proxyResData, userReq, userRes) => {
            console.log(`[PROXY] Status recebido: ${proxyRes.statusCode}`);
            
            try {
                const apiResponse = JSON.parse(proxyResData.toString('utf8'));
                console.log(`[PROXY] Resposta do microserviço:`, apiResponse);
                
                // Retorna a resposta do microserviço como está (ApiResponse)
                return JSON.stringify(apiResponse);
            } catch (error) {
                console.error(`[PROXY] Erro ao processar resposta:`, error);
                return JSON.stringify({
                    success: false,
                    message: "Erro ao processar resposta do servidor"
                });
            }
        },
        proxyErrorHandler: (err, res, next) => {
            console.error(`[PROXY] Erro no cadastro:`, err.message);
            res.status(503).json({
                success: false,
                message: "Client Service unavailable",
                error: err.message
            });
        },
    })
);

// R9: Listar clientes pendentes (GERENTE)
app.get(
    "/clientes/pending",
    authenticateToken,
    requireRole("GERENTE"),
    proxy(process.env.CLIENT_SERVICE_URL, {
        proxyReqPathResolver: (req) => {
            console.log(`[PROXY] R9: ${req.url}`);
            return req.originalUrl;
        },
        proxyErrorHandler: (err, res, next) => {
            res.status(503).json({ error: "Client Service unavailable", message: err.message });
        },
    })
);
// R10: Aprovar cliente (GERENTE)
app.post(
    "/clientes/:cpf/approve",
    authenticateToken,
    requireRole("GERENTE"),
    proxy(process.env.CLIENT_SERVICE_URL, {
        proxyReqPathResolver: (req) => {
            console.log(`[PROXY] R10: ${req.url}`);
            return req.originalUrl;
        },
        proxyErrorHandler: (err, res, next) => {
            res.status(503).json({ error: "Client Service unavailable", message: err.message });
        },
    })
);
// R11: Rejeitar cliente (GERENTE)
app.post(
    "/clientes/:cpf/reject",
    authenticateToken,
    requireRole("GERENTE"),
    proxy(process.env.CLIENT_SERVICE_URL, {
        proxyReqPathResolver: (req) => {
            console.log(`[PROXY] R11: ${req.url}`);
            return req.originalUrl;
        },
        proxyErrorHandler: (err, res, next) => {
            res.status(503).json({ error: "Client Service unavailable", message: err.message });
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
// API COMPOSITION ROUTES
// ============================================

// R13: Consultar Cliente Detalhado (Agregação)
// (rota original mantida caso exista em outro arquivo)

// R15: Admin Manager Dashboard (Agregação)
app.get(
    "/admin/dashboard/managers",
    authenticateToken,
    requireRole("ADMINISTRADOR"),
    async (req, res) => {
        const authHeader = req.headers.authorization;
        const config = authHeader
            ? { headers: { Authorization: authHeader } }
            : {};

        const managerServiceUrl = process.env.MANAGER_SERVICE_URL || "http://localhost:8083";
        const clientServiceUrl = process.env.CLIENT_SERVICE_URL || "http://localhost:8081";

        try {
            const [managersResponse, clientsResponse] = await Promise.all([
                axios.get(`${managerServiceUrl}/gerentes`, config),
                axios.get(`${clientServiceUrl}/clientes?filtro=adm_relatorio_clientes`, config),
            ]);

            const managers = Array.isArray(managersResponse.data) ? managersResponse.data : [];
            const clients = Array.isArray(clientsResponse.data) ? clientsResponse.data : [];

            const managerStats = new Map();

            for (const manager of managers) {
                managerStats.set(manager.cpf, {
                    ...manager,
                    clientCount: 0,
                    totalSalary: 0,
                });
            }

            for (const client of clients) {
                const managerCpf = client?.gerente_cpf;
                if (!managerCpf || !managerStats.has(managerCpf)) continue;

                const stats = managerStats.get(managerCpf);
                stats.clientCount += 1;
                stats.totalSalary += Number(client.salario) || 0;
            }

            res.status(200).json(Array.from(managerStats.values()));
        } catch (error) {
            console.error("[API COMPOSITION ERROR] R15 Admin Dashboard:", error.message);

            if (error.response) {
                return res.status(error.response.status).json(error.response.data);
            }

            res.status(503).json({
                error: "Serviço indisponível",
                message: "Falha ao compor dados para o dashboard do administrador.",
            });
        }
    }
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
