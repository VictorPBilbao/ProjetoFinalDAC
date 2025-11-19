require("dotenv").config();
const express = require("express");
const proxy = require("express-http-proxy");
const cors = require("cors");
const morgan = require("morgan");
const {
  authenticateToken,
  requireRole,
  requireOwnerOrAdmin,
} = require("./middleware/auth");
const axios = require("axios");
const axiosInstance = axios.create({
  timeout: Number(process.env.GATEWAY_AXIOS_TIMEOUT_MS || 4000),
});

require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

// ============================================
// Helpers de autorização
// ============================================
const requireOneOfRoles =
  (...roles) =>
  (req, res, next) => {
    const tipo = req.user?.tipo;
    if (roles.includes(tipo)) return next();
    return res.status(403).json({ error: "Forbidden" });
  };

// GET /clientes: regra por filtro
const authorizeClientesList = (req, res, next) => {
  const filtro = req.query?.filtro;
  const tipo = req.user?.tipo;

  // Relatório do ADM só para ADMINISTRADOR
  if (filtro === "adm_relatorio_clientes") {
    if (tipo !== "ADMINISTRADOR")
      return res.status(403).json({ error: "Forbidden" });
    return next();
  }

  // Demais listagens: GERENTE ou ADMINISTRADOR
  if (tipo === "GERENTE" || tipo === "ADMINISTRADOR") return next();
  return res.status(403).json({ error: "Forbidden" });
};

// GET /clientes/:cpf: ADMIN, GERENTE, ou o próprio CLIENTE
const authorizeClienteByCpf =
  (paramName = "cpf") =>
  (req, res, next) => {
    const tipo = req.user?.tipo;
    const userCpf = req.user?.cpf;
    const targetCpf = req.params?.[paramName];

    if (tipo === "ADMINISTRADOR" || tipo === "GERENTE") return next();
    if (tipo === "CLIENTE" && userCpf && targetCpf && userCpf === targetCpf)
      return next();
    return res.status(403).json({ error: "Forbidden" });
  };

// ============================================
// MIDDLEWARE CONFIGURATION
// ============================================
app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

// ============================================
// API COMPOSITION LOGIC
// ============================================

/**
 * R13: Consultar Cliente Detalhado (Agregação)
 * Combina dados do Client-Service e do Account-Query-Service
 */
app.get(
  "/relatorio/cliente-detalhado/:cpf",
  authenticateToken,
  authorizeClienteByCpf("cpf"),
  async (req, res) => {
    const { cpf } = req.params;
    const authHeader = req.headers.authorization;

    const clientServiceUrl =
      process.env.CLIENT_SERVICE_URL || "http://localhost:8081"; // Note: Client Service
    const accountServiceUrl =
      process.env.ACCOUNT_SERVICE_URL || "http://localhost:8082"; //porta do account-service

    try {
      const config = {
        headers: {
          Authorization: authHeader,
          "X-User-CPF": cpf,
        },
      };

      // Chamada 1: Client Service (GET /clientes/:cpf)
      const clientPromise = axios.get(
        `${clientServiceUrl}/clientes/${cpf}`,
        config
      );

      // Chamada 2: Account Query Service (GET /query/my-account)
      const accountPromise = axios.get(
        `${accountServiceUrl}/query/my-account`,
        config
      );

      const [clientResponse, accountResponse] = await Promise.all([
        clientPromise,
        accountPromise,
      ]);

      const clientData = clientResponse.data;
      const accountData = accountResponse.data;

      const composedResponse = {
        cpf: clientData.cpf,
        nome: clientData.nome,
        email: clientData.email,
        endereco: clientData.endereco,
        salario: clientData.salario,

        conta: {
          id: accountData.id,
          numero: accountData.numero,
          saldo: accountData.saldo,
          limite: accountData.limite,
          dataCriacao: accountData.dataCriacao,
          gerente: accountData.gerente,
        },
      };

      res.status(200).json(composedResponse);
    } catch (error) {
      console.error(
        `[API COMPOSITION ERROR] R13 para CPF ${cpf}:`,
        error.message
      );

      if (error.response) {
        return res.status(error.response.status).json(error.response.data);
      }

      res.status(503).json({
        error: "Serviço indisponível",
        message: "Falha ao se comunicar com um ou mais microsserviços.",
      });
    }
  }
);

// R15: Admin Manager Dashboard (Agregação) - usa /query/summary-by-manager no Account Query Service
app.get(
  "/admin/dashboard/managers",
  authenticateToken,
  requireRole("ADMINISTRADOR"),
  async (req, res) => {
    const authHeader = req.headers.authorization;
    const config = authHeader ? { headers: { Authorization: authHeader } } : {};

    const managerServiceUrl =
      process.env.MANAGER_SERVICE_URL || "http://localhost:8083";
    const clientServiceUrl =
      process.env.CLIENT_SERVICE_URL || "http://localhost:8081";
    const accountQueryServiceUrl =
      process.env.ACCOUNT_QUERY_SERVICE_URL || "http://localhost:8086"; // porta do account-query-service

    try {
      const [managersResp, clientsResp] = await Promise.all([
        axiosInstance.get(`${managerServiceUrl}/gerentes`, config),
        axiosInstance.get(
          `${clientServiceUrl}/clientes?filtro=adm_relatorio_clientes`,
          config
        ),
      ]);

      const managers = Array.isArray(managersResp.data)
        ? managersResp.data
        : [];
      const clients = Array.isArray(clientsResp.data) ? clientsResp.data : [];

      let accountsSummary = null;
      try {
        const summaryResp = await axiosInstance.get(
          `${accountQueryServiceUrl}/query/summary-by-manager`,
          config
        );
        accountsSummary = Array.isArray(summaryResp.data)
          ? summaryResp.data
          : [];
      } catch (err) {
        accountsSummary = null;
        console.warn(
          "[Gateway] Account summary endpoint indisponível; usando fallback a partir dos clients (pode faltar saldos)."
        );
      }
      const managerStats = new Map();
      for (const m of managers) {
        managerStats.set(m.cpf, {
          cpf: m.cpf,
          nome: m.nome,
          email: m.email,
          telefone: m.telefone,
          clientCount: 0,
          totalPositivo: 0.0,
          totalNegativo: 0.0,
        });
      }

      if (accountsSummary) {
        for (const s of accountsSummary) {
          const gerenteCpf = s.gerenteCpf || s.managerId || s.gerenteCpf;
          const qtd = s.qtdClientes ?? s.qtd ?? 0;
          const pos = Number(s.totalPositivo ?? s.totalPositive ?? 0);
          const neg = Number(s.totalNegativo ?? s.totalNegative ?? 0);

          const stat = managerStats.get(gerenteCpf) || {
            cpf: gerenteCpf,
            nome: "(Desconhecido)",
            email: null,
            telefone: null,
            clientCount: qtd,
            totalPositivo: 0.0,
            totalNegativo: 0.0,
          };
          stat.clientCount = qtd;
          stat.totalPositivo = Number(pos).toFixed(2);
          stat.totalNegativo = Number(neg).toFixed(2);
          managerStats.set(gerenteCpf, stat);
        }
      } else {
        for (const c of clients) {
          const managerCpf = c?.gerente_cpf ?? c?.gerenteCpf ?? c?.gerente;
          if (!managerCpf) continue;
          if (!managerStats.has(managerCpf)) {
            managerStats.set(managerCpf, {
              cpf: managerCpf,
              nome: "(Desconhecido)",
              email: null,
              telefone: null,
              clientCount: 0,
              totalPositivo: 0.0,
              totalNegativo: 0.0,
            });
          }
          const s = managerStats.get(managerCpf);
          s.clientCount = (s.clientCount || 0) + 1;
          const saldo = (() => {
            if (typeof c.saldo !== "undefined") return Number(c.saldo);
            if (c.conta && typeof c.conta.saldo !== "undefined")
              return Number(c.conta.saldo);
            return 0;
          })();
          if (saldo >= 0) s.totalPositivo += saldo;
          else s.totalNegativo += saldo;
        }

        for (const [k, v] of managerStats.entries()) {
          v.totalPositivo = Number(v.totalPositivo).toFixed(2);
          v.totalNegativo = Number(v.totalNegativo).toFixed(2);
          managerStats.set(k, v);
        }
      }

      const result = Array.from(managerStats.values()).sort(
        (a, b) => Number(b.totalPositivo) - Number(a.totalPositivo)
      );
      return res.status(200).json(result);
    } catch (error) {
      console.error(
        "[API COMPOSITION ERROR] R15 Admin Dashboard:",
        error.message || error
      );
      if (error.code === "ECONNABORTED") {
        return res.status(504).json({
          error: "Timeout",
          message: "Uma ou mais chamadas demoraram demais.",
        });
      }
      if (error.response) {
        return res.status(error.response.status).json(error.response.data);
      }
      return res.status(503).json({
        error: "Serviço indisponível",
        message: "Falha ao compor dados para o dashboard do administrador.",
      });
    }
  }
);

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
app.get(
  "/health/auth",
  proxy(process.env.AUTH_SERVICE_URL || "http://localhost:8084")
);
app.get(
  "/health/client",
  proxy(process.env.CLIENT_SERVICE_URL || "http://localhost:8081")
);
app.get(
  "/health/account",
  proxy(process.env.ACCOUNT_SERVICE_URL || "http://localhost:8082")
);
app.get(
  "/health/manager",
  proxy(process.env.MANAGER_SERVICE_URL || "http://localhost:8083")
);

// ============================================
// REBOOT ENDPOINT (R00 - Initialize Database)
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

// GET /clientes (R09, R12, R14, R16) com autorização por filtro
app.get(
  "/clientes",
  authenticateToken,
  authorizeClientesList,
  proxy(process.env.CLIENT_SERVICE_URL || "http://localhost:8081", {
    proxyReqPathResolver: (req) => req.originalUrl,
    proxyErrorHandler: (err, res, next) => {
      res.status(503).json({
        error: "Client Service unavailable",
        message: err.message,
      });
    },
  })
);

// POST /clientes/validate -> validado no service (pass-through)
app.post(
  "/clientes/validate",
  express.json(),
  proxy(process.env.CLIENT_SERVICE_URL || "http://localhost:8081", {
    proxyReqPathResolver: (req) => req.originalUrl,
    userResDecorator: (proxyRes, proxyResData) => {
      try {
        const json = JSON.parse(proxyResData.toString("utf8"));
        return JSON.stringify({ exists: !!json?.data });
      } catch {
        return proxyResData;
      }
    },
  })
);

// POST /clientes/validateEmail -> validado no service (pass-through)
app.post(
  "/clientes/validateEmail",
  express.json(),
  proxy(process.env.CLIENT_SERVICE_URL || "http://localhost:8081", {
    proxyReqPathResolver: (req) => req.originalUrl,
    userResDecorator: (proxyRes, proxyResData) => {
      try {
        const json = JSON.parse(proxyResData.toString("utf8"));
        return JSON.stringify({ exists: !!json?.data });
      } catch {
        return proxyResData;
      }
    },
  })
);

// POST /clientes (R01) autocadastro, apenas normalização leve
app.post(
  "/clientes",
  express.json(),
  proxy(process.env.CLIENT_SERVICE_URL || "http://localhost:8081", {
    proxyReqPathResolver: () => "/clientes/cadastro",
    proxyReqBodyDecorator: (bodyContent) => {
      const sanitized = { ...bodyContent };
      // normaliza CPF
      if (sanitized.cpf)
        sanitized.cpf = String(sanitized.cpf).replace(/[^\d]/g, "");
      // aceita CEP (maiúsculo) e cep (minúsculo)
      const cepRaw = sanitized.cep ?? sanitized.CEP;
      if (cepRaw !== undefined) {
        sanitized.cep = String(cepRaw).replace(/[^\d]/g, "");
        delete sanitized.CEP;
      }
      // normaliza email e UF
      if (sanitized.email)
        sanitized.email = String(sanitized.email).trim().toLowerCase();
      if (sanitized.estado)
        sanitized.estado = String(sanitized.estado).toUpperCase();
      return sanitized;
    },
    userResDecorator: (proxyRes, proxyResData) => proxyResData,
    proxyErrorHandler: (err, res, next) => {
      console.error(`[PROXY] Erro no cadastro:`, err.message);
      res.status(503).json({
        success: false,
        message: "Client Service unavailable",
        error: err.message,
      });
    },
  })
);

app.put(
  "/clientes/:cpf",
  authenticateToken,
  authorizeClienteByCpf("cpf"),
  proxy(process.env.CLIENT_SERVICE_URL || "http://localhost:8081", {
    proxyReqPathResolver: (req) => req.originalUrl,
    proxyErrorHandler: (err, res, next) => {
      res.status(503).json({
        error: "Client Service unavailable",
        message: err.message,
      });
    },
  })
);

// POST /clientes/:cpf/aprovar (R10) - GERENTE
app.post(
  "/clientes/:cpf/aprovar",
  authenticateToken,
  requireRole("GERENTE"),
  proxy(process.env.CLIENT_SERVICE_URL || "http://localhost:8081", {
    proxyReqPathResolver: (req) => req.originalUrl,
    proxyErrorHandler: (err, res, next) => {
      res
        .status(503)
        .json({ error: "Client Service unavailable", message: err.message });
    },
  })
);

// POST /clientes/:cpf/rejeitar (R11) - GERENTE
app.post(
  "/clientes/:cpf/rejeitar",
  authenticateToken,
  requireRole("GERENTE"),
  proxy(process.env.CLIENT_SERVICE_URL || "http://localhost:8081", {
    proxyReqPathResolver: (req) => req.originalUrl,
    proxyErrorHandler: (err, res, next) => {
      res
        .status(503)
        .json({ error: "Client Service unavailable", message: err.message });
    },
  })
);

// GET /clientes/:cpf (R13) - ADMIN, GERENTE, ou o próprio CLIENTE
app.get(
  "/clientes/:cpf",
  authenticateToken,
  authorizeClienteByCpf("cpf"),
  proxy(process.env.CLIENT_SERVICE_URL || "http://localhost:8081", {
    proxyReqPathResolver: (req) => req.originalUrl,
    proxyErrorHandler: (err, res, next) => {
      res.status(503).json({
        error: "Client Service unavailable",
        message: err.message,
      });
    },
  })
);

// (Opcional) Rota de pendentes - não usada nos testes, mantida
app.get(
  "/clientes/pending",
  authenticateToken,
  requireRole("GERENTE"),
  proxy(process.env.CLIENT_SERVICE_URL || "http://localhost:8081", {
    proxyReqPathResolver: (req) => req.originalUrl,
    proxyErrorHandler: (err, res, next) => {
      res
        .status(503)
        .json({ error: "Client Service unavailable", message: err.message });
    },
  })
);

// ============================================
// MANAGER SERVICE ROUTES (/gerentes) - R15..R20
// ============================================
app.get(
  "/gerentes",
  authenticateToken,
  requireRole("ADMINISTRADOR"),
  proxy(process.env.MANAGER_SERVICE_URL || "http://localhost:8083", {
    proxyReqPathResolver: (req) => req.originalUrl,
    proxyErrorHandler: (err, res, next) => {
      res
        .status(503)
        .json({ error: "Manager Service unavailable", message: err.message });
    },
  })
);

app.get(
  "/gerentes/:cpf",
  authenticateToken,
  requireRole("ADMINISTRADOR"),
  proxy(process.env.MANAGER_SERVICE_URL || "http://localhost:8083", {
    proxyReqPathResolver: (req) => req.originalUrl,
  })
);

app.get(
  "/gerentes/:id",
  authenticateToken,
  requireRole("ADMINISTRADOR"),
  proxy(process.env.MANAGER_SERVICE_URL || "http://localhost:8083", {
    proxyReqPathResolver: (req) => req.originalUrl,
  })
);

app.post(
  "/gerentes",
  authenticateToken,
  requireRole("ADMINISTRADOR"),
  proxy(process.env.SAGA_ORCHESTRATOR_URL || "http://localhost:8085", {
    proxyReqPathResolver: (req) => req.originalUrl,
    proxyErrorHandler: (err, res, next) => {
      console.error("❌ Saga Orchestrator error:", err.message);
      res.status(503).json({ error: "Saga Orchestrator unavailable", message: err.message });
    },
  })
);

app.put(
  "/gerentes/:cpf",
  authenticateToken,
  requireRole("ADMINISTRADOR"),
  proxy(process.env.SAGA_ORCHESTRATOR_URL || "http://localhost:8085", {
    proxyReqPathResolver: (req) => req.originalUrl,
    proxyErrorHandler: (err, res, next) => {
      console.error("❌ Saga Orchestrator error:", err.message);
      res.status(503).json({ error: "Saga Orchestrator unavailable", message: err.message });
    },
  })
);

app.delete(
  "/gerentes/:cpf",
  authenticateToken,
  requireRole("ADMINISTRADOR"),
  proxy(process.env.SAGA_ORCHESTRATOR_URL || "http://localhost:8085", {
    proxyReqPathResolver: (req) => req.originalUrl,
  })
);

// ============================================
// ACCOUNT SERVICE ROUTES (/contas) - R03..R08
// ============================================
app.get(
  "/contas/:conta/saldo",
  authenticateToken,
  proxy(process.env.ACCOUNT_SERVICE_URL || "http://localhost:8082", {
    proxyReqPathResolver: (req) => req.originalUrl,
    proxyErrorHandler: (err, res, next) => {
      res
        .status(503)
        .json({ error: "Account Service unavailable", message: err.message });
    },
  })
);

app.post(
  "/contas/:conta/depositar",
  authenticateToken,
  proxy(process.env.ACCOUNT_SERVICE_URL || "http://localhost:8082", {
    proxyReqPathResolver: (req) => req.originalUrl,
  })
);

app.post(
  "/contas/:conta/sacar",
  authenticateToken,
  proxy(process.env.ACCOUNT_SERVICE_URL || "http://localhost:8082", {
    proxyReqPathResolver: (req) => req.originalUrl,
  })
);

app.post(
  "/contas/:conta/transferir",
  authenticateToken,
  proxy(process.env.ACCOUNT_SERVICE_URL || "http://localhost:8082", {
    proxyReqPathResolver: (req) => req.originalUrl,
  })
);

app.get(
  "/contas/:conta/extrato",
  authenticateToken,
  proxy(process.env.ACCOUNT_SERVICE_URL || "http://localhost:8082", {
    proxyReqPathResolver: (req) => req.originalUrl,
  })
);

app.post(
  "/login",
  express.json(),
  proxy(process.env.AUTH_SERVICE_URL || "http://localhost:8084", {
    proxyReqPathResolver: (req) => req.originalUrl,
    proxyReqOptDecorator: (proxyReqOpts, srcReq) => {
      proxyReqOpts.headers["Content-Type"] = "application/json";
      return proxyReqOpts;
    },
    proxyReqBodyDecorator: (bodyContent, srcReq) => {
      console.log("📤 [LOGIN] Body recebido:", bodyContent);
      return bodyContent;
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

app.post(
  "/logout",
  authenticateToken,
  proxy(process.env.AUTH_SERVICE_URL || "http://localhost:8084", {
    proxyReqPathResolver: (req) => req.originalUrl,
  })
);

// ============================================
// AUTH SERVICE ROUTES
// ============================================
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
    `   • Client Service:  ${
      process.env.CLIENT_SERVICE_URL || "http://localhost:8081"
    }`
  );
  console.log(
    `   • Account Service: ${
      process.env.ACCOUNT_SERVICE_URL || "http://localhost:8082"
    }`
  );
  console.log(
    `   • Manager Service: ${
      process.env.MANAGER_SERVICE_URL || "http://localhost:8083"
    }`
  );
  console.log(
    `   • Auth Service:    ${
      process.env.AUTH_SERVICE_URL || "http://localhost:8084"
    }`
  );
    console.log(
      `   • Saga Service:    ${process.env.SAGA_ORCHESTRATOR_URL || "http://localhost:8085"}`
    );
    console.log(
      `   • Auth Service:    ${process.env.AUTH_SERVICE_URL || "http://localhost:8084"}`
    );
  });
