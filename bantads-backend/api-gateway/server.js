require("dotenv").config();
const express = require("express");
const proxy = require("express-http-proxy");
const cors = require("cors");
const morgan = require("morgan");
const { authenticateToken, requireRole, requireOwnerOrAdmin } = require("./middleware/auth");
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
        if (tipo !== "ADMINISTRADOR") return res.status(403).json({ error: "Forbidden" });
        return next();
    }

    // Demais listagens: GERENTE/MANAGER ou ADMINISTRADOR
    if (tipo === "GERENTE" || tipo === "MANAGER" || tipo === "ADMINISTRADOR") return next();
    return res.status(403).json({ error: "Forbidden" });
};

// GET /clientes/:cpf: ADMIN, GERENTE/MANAGER, ou o próprio CLIENTE
const authorizeClienteByCpf =
    (paramName = "cpf") =>
    (req, res, next) => {
        const tipo = req.user?.tipo;
        const userCpf = req.user?.cpf;
        const targetCpf = req.params?.[paramName];

        if (tipo === "ADMINISTRADOR" || tipo === "GERENTE" || tipo === "MANAGER") return next();
        if (tipo === "CLIENTE" && userCpf && targetCpf && userCpf === targetCpf) return next();
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
 * Em uma tela em branco, o gerente deve informar em um campo
  de texto o CPF, o sistema deve mostrar todos os dados do cliente, incluindo os dados de sua
  conta (saldo e limite);
 * Combina dados do Client-Service e do Account-Query-Service
 */

app.get(
    "/relatorio/cliente-detalhado/:cpf",
    authenticateToken,
    authorizeClienteByCpf("cpf"),
    async (req, res) => {
        const { cpf } = req.params;
        const authHeader = req.headers.authorization;

        const clientServiceUrl = process.env.CLIENT_SERVICE_URL || "http://localhost:8081";
        const accountQueryServiceUrl =
            process.env.ACCOUNT_QUERY_SERVICE_URL || "http://localhost:8086";

        try {
            const config = {
                headers: {
                    Authorization: authHeader,
                    "X-User-CPF": cpf,
                },
            };

            // Chamada 1: Client Service
            let clientData;
            try {
                const clientResponse = await axiosInstance.get(
                    `${clientServiceUrl}/clientes/${cpf}`,
                    config
                );
                clientData = clientResponse.data;
            } catch (clientError) {
                console.error(`Client Service error for CPF ${cpf}:`, clientError.message);

                if (clientError.response) {
                    return res.status(clientError.response.status).json({
                        erro:
                            clientError.response.data.message ||
                            clientError.response.data.erro ||
                            "Cliente não encontrado",
                        status: clientError.response.status,
                    });
                }

                return res.status(503).json({
                    erro: "Serviço de clientes indisponível",
                    status: 503,
                });
            }

            // Chamada 2: Account Query Service
            let accountData = null;
            try {
                const accountResponse = await axiosInstance.get(
                    `${accountQueryServiceUrl}/query/my-account`,
                    config
                );
                accountData = accountResponse.data;
            } catch (accountError) {
                console.warn(`Account Query Service error for CPF ${cpf}:`, accountError.message);

                if (accountError.response?.status === 404) {
                    console.warn(`Conta não encontrada para CPF ${cpf}`);
                    accountData = null;
                } else if (accountError.response) {
                    return res.status(accountError.response.status).json({
                        erro:
                            accountError.response.data.message ||
                            accountError.response.data.erro ||
                            "Erro ao buscar conta",
                        status: accountError.response.status,
                    });
                } else {
                    return res.status(503).json({
                        erro: "Serviço de contas indisponível",
                        status: 503,
                    });
                }
            }

            // Composição da resposta agregada
            const composedResponse = {
                cpf: clientData.cpf,
                nome: clientData.nome,
                email: clientData.email,
                endereco: clientData.endereco,
                salario: clientData.salario,
                status: clientData.status,

                conta: accountData
                    ? {
                          id: accountData.id,
                          numero: accountData.numero,
                          saldo: accountData.saldo,
                          limite: accountData.limite,
                          dataCriacao: accountData.dataCriacao,
                          gerente: accountData.gerente,
                      }
                    : null,
            };

            res.status(200).json(composedResponse);
        } catch (error) {
            console.error(`[API COMPOSITION ERROR] R13 para CPF ${cpf}:`, error.message);

            res.status(500).json({
                erro: "Erro interno ao processar requisição",
                message: error.message,
                status: 500,
            });
        }
    }
);

/**
 * R14: Consultar Melhores Clientes (Agregação)
 * Consultar 3 melhores clientes - Deve ser apresentada uma tela contendo somente
  os seus clientes que possuem os 3 maiores saldos em conta, mostrando CPF, Nome, Cidade,
  Estado, Saldo da conta, ordenado de forma decrescente por saldo;
 * Combina dados do Client-Service e do Account-Query-Service
 */
// R14: Consultar Melhores Clientes (Top 3 do Gerente)
app.get(
  "/relatorio/melhores-clientes",
  authenticateToken,
  requireRole("GERENTE", "MANAGER"),
  async (req, res) => {
    const managerCpf = req.user?.cpf;
    const authHeader = req.headers.authorization;
    const limit = Number(req.query.limit ?? 3);

    const clientServiceUrl =
      process.env.CLIENT_SERVICE_URL || "http://localhost:8081";
    const accountQueryServiceUrl =
      process.env.ACCOUNT_QUERY_SERVICE_URL || "http://localhost:8086";

    const config = { headers: { Authorization: authHeader } };

    try {
      console.log(
        `[R14] requesting top ${limit} accounts for manager ${managerCpf}`
      );

      let accounts = [];
      try {
        const resp = await axiosInstance.get(
          `${accountQueryServiceUrl}/query/top-accounts?managerCpf=${encodeURIComponent(
            managerCpf
          )}&limit=${limit}`,
          config
        );
        accounts = Array.isArray(resp.data) ? resp.data : [];
      } catch (acctErr) {
        console.warn(`[R14] account-query error:`, acctErr.message);
        if (acctErr.response?.status === 404) {
          accounts = [];
        } else if (acctErr.response) {
          return res.status(acctErr.response.status).json({
            erro:
              acctErr.response.data?.message ||
              acctErr.response.data ||
              "Erro no account-query",
            status: acctErr.response.status,
          });
        } else {
          return res.status(503).json({
            erro: "Serviço de contas indisponível",
            status: 503,
          });
        }
      }

      const clientPromises = accounts.map((acc) =>
        axiosInstance
          .get(
            `${clientServiceUrl}/clientes/${encodeURIComponent(
              acc.clientId || acc.clientCpf || acc.client_id
            )}`,
            config
          )
          .then((r) => ({ client: r.data, account: acc }))
          .catch((err) => {
            console.warn(
              `[R14] client-service missing for ${
                acc.clientId || acc.clientCpf || acc.client_id
              }: ${err.message}`
            );
            return { client: null, account: acc };
          })
      );

      const results = await Promise.all(clientPromises);

      const composed = results
        .map(({ client, account }) => {
          const cpf =
            account.clientId ?? account.clientCpf ?? account.client_id ?? null;
          const saldoRaw =
            account.balance ?? account.saldo ?? account.Balance ?? 0;
          const saldo = Number(saldoRaw ?? 0);
          return {
            cpf,
            nome: client?.nome ?? "(Desconhecido)",
            cidade: client?.cidade ?? client?.addressCity ?? null,
            estado: client?.estado ?? client?.state ?? null,
            saldo: Number(saldo).toFixed(2),
          };
        })

        .sort((a, b) => Number(b.saldo) - Number(a.saldo));

      return res.status(200).json(composed);
    } catch (error) {
      console.error("[API COMPOSITION ERROR] R14:", {
        message: error.message,
        status: error.response?.status,
        downstream: error.response?.data,
      });
      if (error.response) {
        return res.status(error.response.status).json(error.response.data);
      }
      return res.status(503).json({
        error: "Serviço indisponível",
        message: "Falha ao compor dados para R14",
      });
    }
  }
);

/**
 * R15: Admin Manager Dashboard (Agregação)
 * Apresenta uma tela (pode ser em estilo dashboard)
  mostrando todos os gerentes do banco, para cada gerente apresenta: quantos clientes
  possui, a totalização (soma) de saldos positivo (0.0 conta como positivo) e a totalização
  (soma) de saldos negativos. Deve ser mostrado os gerentes com maiores saldos positivos
  primeiro;
 */

app.get(
    "/admin/dashboard/managers",
    authenticateToken,
    requireRole("ADMINISTRADOR"),
    async (req, res) => {
        const authHeader = req.headers.authorization;
        const config = authHeader ? { headers: { Authorization: authHeader } } : {};

        const managerServiceUrl = process.env.MANAGER_SERVICE_URL || "http://localhost:8083";
        const clientServiceUrl = process.env.CLIENT_SERVICE_URL || "http://localhost:8081";
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

            const managers = Array.isArray(managersResp.data) ? managersResp.data : [];
            const clients = Array.isArray(clientsResp.data) ? clientsResp.data : [];

            let accountsSummary = null;
            try {
                const summaryResp = await axiosInstance.get(
                    `${accountQueryServiceUrl}/query/summary-by-manager`,
                    config
                );
                accountsSummary = Array.isArray(summaryResp.data) ? summaryResp.data : [];
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
            console.error("[API COMPOSITION ERROR] R15 Admin Dashboard:", error.message || error);
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
app.get("/health/auth", proxy(process.env.AUTH_SERVICE_URL || "http://localhost:8084"));
app.get("/health/client", proxy(process.env.CLIENT_SERVICE_URL || "http://localhost:8081"));
app.get("/health/account", proxy(process.env.ACCOUNT_SERVICE_URL || "http://localhost:8082"));
app.get("/health/manager", proxy(process.env.MANAGER_SERVICE_URL || "http://localhost:8083"));

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


// GET /clientes (R09, R12, R14, R16)
// Esse cara ta puxando os dados agregados para relatorio de clientes, dai depende se é admin ou gerente
app.get(
    "/clientes",
    authenticateToken,
    authorizeClientesList, 
    async (req, res, next) => {
        
        const userRole = req.user?.tipo;
        const userCpf = req.user?.cpf;
        const filtro = req.query.filtro;
        const busca = req.query.busca || ""; 
        
        if (filtro === "adm_relatorio_clientes" || userRole === "GERENTE") {
            
            const authHeader = req.headers.authorization;
            const config = { headers: { Authorization: authHeader } };

            const clientUrl = process.env.CLIENT_SERVICE_URL || "http://localhost:8081";
            const managerUrl = process.env.MANAGER_SERVICE_URL || "http://localhost:8083";
            const accountQueryUrl = process.env.ACCOUNT_QUERY_SERVICE_URL || "http://localhost:8086";

            try {
                console.log(`[Gateway] Agregando dados para ${userRole}...`);

                let urlClientes = `${clientUrl}/clientes`;
                if (userRole === "GERENTE") {
                    urlClientes += `?gerente=${userCpf}`;
                    if (busca) urlClientes += `&busca=${encodeURIComponent(busca)}`;
                }

                const [clientsResp, managersResp, accountsResp] = await Promise.all([
                    axiosInstance.get(urlClientes, config),
                    axiosInstance.get(`${managerUrl}/gerentes`, config),
                    axiosInstance.get(`${accountQueryUrl}/query/all`, config)
                ]);

                const clients = Array.isArray(clientsResp.data) ? clientsResp.data : [];
                const managers = Array.isArray(managersResp.data) ? managersResp.data : [];
                const accounts = Array.isArray(accountsResp.data) ? accountsResp.data : [];

                const accountMap = new Map();
                accounts.forEach(acc => {
                    const cpf = acc.clientId || acc.clientCpf; 
                    if (cpf) accountMap.set(cpf, acc);
                });

                const managerMap = new Map();
                managers.forEach(mgr => {
                    if (mgr.cpf) managerMap.set(mgr.cpf, mgr);
                    if (mgr.id) managerMap.set(String(mgr.id), mgr);
                });
                const relatorio = clients.map(client => {
                    const conta = accountMap.get(client.cpf);
                    
                    let gerente = null;
                    if (conta && conta.managerId) {
                        gerente = managerMap.get(String(conta.managerId));
                    } else if (client.gerente) {
                        gerente = managerMap.get(client.gerente);
                    }

                    return {
                        cpf: client.cpf,
                        nome: client.nome,
                        email: client.email,
                        salario: client.salario,
                        cidade: client.cidade,
                        estado: client.estado,
                        
                        numeroConta: conta ? conta.accountNumber : null,
                        saldo: conta ? conta.balance : 0,
                        limite: conta ? conta.limit : 0,
                        
                        cpfGerente: gerente ? gerente.cpf : null,
                        nomeGerente: gerente ? gerente.nome : "Não Atribuído"
                    };
                });

                relatorio.sort((a, b) => a.nome.localeCompare(b.nome));

                return res.json(relatorio);

            } catch (error) {
                console.error("[Gateway Agregação Error]", error.message);
                return res.status(503).json({ error: "Erro ao agregar dados de clientes." });
            }
        }

        next();
    },
    proxy(process.env.CLIENT_SERVICE_URL || "http://localhost:8081", {
        proxyReqPathResolver: (req) => req.originalUrl
    })
);

// GET /clientes (R09, R12, R14, R16) com autorização por filtro
//app.get(
//    "/clientes",
//    authenticateToken,
//    authorizeClientesList,
//    proxy(process.env.CLIENT_SERVICE_URL || "http://localhost:8081", {
//        proxyReqPathResolver: (req) => req.originalUrl,
//        proxyErrorHandler: (err, res, next) => {
//           res.status(503).json({
//                error: "Client Service unavailable",
//                message: err.message,
//            });
//        },
//    })
//);

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
            if (sanitized.cpf) sanitized.cpf = String(sanitized.cpf).replace(/[^\d]/g, "");
            // aceita CEP (maiúsculo) e cep (minúsculo)
            const cepRaw = sanitized.cep ?? sanitized.CEP;
            if (cepRaw !== undefined) {
                sanitized.cep = String(cepRaw).replace(/[^\d]/g, "");
                delete sanitized.CEP;
            }
            // normaliza email e UF
            if (sanitized.email) sanitized.email = String(sanitized.email).trim().toLowerCase();
            if (sanitized.estado) sanitized.estado = String(sanitized.estado).toUpperCase();
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
    requireRole("GERENTE", "MANAGER"),
    proxy(process.env.SAGA_ORCHESTRATOR_URL || "http://localhost:8085", {
        proxyReqPathResolver: (req) => req.originalUrl,
        proxyErrorHandler: (err, res, next) => {
            res.status(503).json({ error: "Saga Orchestrator unavailable", message: err.message });
        },
    })
);

// POST /clientes/:cpf/rejeitar (R11) - GERENTE
app.post(
    "/clientes/:cpf/rejeitar",
    authenticateToken,
    requireRole("GERENTE", "MANAGER"),
    proxy(process.env.CLIENT_SERVICE_URL || "http://localhost:8081", {
        proxyReqPathResolver: (req) => req.originalUrl,
        proxyErrorHandler: (err, res, next) => {
            res.status(503).json({ error: "Client Service unavailable", message: err.message });
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
    requireRole("GERENTE", "MANAGER"),
    proxy(process.env.CLIENT_SERVICE_URL || "http://localhost:8081", {
        proxyReqPathResolver: (req) => req.originalUrl,
        proxyErrorHandler: (err, res, next) => {
            res.status(503).json({ error: "Client Service unavailable", message: err.message });
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
            res.status(503).json({ error: "Manager Service unavailable", message: err.message });
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
            res.status(503).json({ error: "Account Service unavailable", message: err.message });
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

// R8: Extrato 
app.get(
    "/contas/:numero/extrato", 
    authenticateToken,
    proxy(process.env.ACCOUNT_QUERY_SERVICE_URL || "http://localhost:8086", {
        proxyReqPathResolver: (req) => req.originalUrl,
        proxyErrorHandler: (err, res, next) => {
            console.error("[Gateway] Erro ao buscar extrato:", err.message);
            res.status(503).json({ error: "Serviço de consulta de conta indisponível." });
        }
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
    express.json(),
    proxy(process.env.AUTH_SERVICE_URL || "http://localhost:8084", {
        proxyReqPathResolver: (req) => {
            console.log(`📤 [LOGOUT] ${req.method} ${req.originalUrl} - User: ${req.user?.cpf}`);
            return req.originalUrl;
        },
        proxyReqOptDecorator: (proxyReqOpts, srcReq) => {
            // Repassa o token de autenticação
            if (srcReq.headers.authorization) {
                proxyReqOpts.headers["Authorization"] = srcReq.headers.authorization;
            }
            return proxyReqOpts;
        },
        proxyErrorHandler: (err, res, next) => {
            console.error("❌ Logout error:", err.message);
            res.status(503).json({
                error: "Auth Service unavailable",
                message: err.message,
            });
        },
    })
);

// ============================================
// AUTH SERVICE ROUTES
// ============================================
app.use(
    ["/validate"],
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
    console.log(
        `   • Saga Service:    ${process.env.SAGA_ORCHESTRATOR_URL || "http://localhost:8085"}`
    );
    console.log(`   • Auth Service:    ${process.env.AUTH_SERVICE_URL || "http://localhost:8084"}`);
});
