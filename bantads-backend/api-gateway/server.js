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

const services = {
    client: process.env.CLIENT_SERVICE_URL || "http://localhost:8081",
    account: process.env.ACCOUNT_SERVICE_URL || "http://localhost:8082",
    manager: process.env.MANAGER_SERVICE_URL || "http://localhost:8083",
    auth: process.env.AUTH_SERVICE_URL || "http://localhost:8084",
    saga: process.env.SAGA_ORCHESTRATOR_URL || "http://localhost:8085",
    query: process.env.ACCOUNT_QUERY_SERVICE_URL || "http://localhost:8086",
};

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

const authorizeClientesList = (req, res, next) => {
    const filtro = req.query?.filtro;
    const tipo = req.user?.tipo;

    if (filtro === "adm_relatorio_clientes") {
        if (tipo !== "ADMINISTRADOR") return res.status(403).json({ error: "Forbidden" });
        return next();
    }

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

app.get("/clientes/:cpf", authenticateToken, authorizeClienteByCpf("cpf"), async (req, res) => {
    const { cpf } = req.params;
    const authHeader = req.headers.authorization;

    const clientServiceUrl = process.env.CLIENT_SERVICE_URL || "http://localhost:8081";
    const accountQueryServiceUrl = process.env.ACCOUNT_QUERY_SERVICE_URL || "http://localhost:8086";
    const managerServiceUrl = process.env.MANAGER_SERVICE_URL || "http://localhost:8083";

    try {
        const config = {
            headers: {
                Authorization: authHeader,
                "X-User-CPF": cpf,
            },
        };
        let clientData;
        try {
            const clientResponse = await axiosInstance.get(
                `${clientServiceUrl}/clientes/${cpf}`,
                config
            );
            clientData = clientResponse.data;
        } catch (clientError) {
            console.error(`Client Service error for CPF ${cpf}:`, clientError.message);
            if (clientError.response && clientError.response.status === 404) {
                return res.status(404).json({ erro: "Cliente não encontrado" });
            }
            return res.status(503).json({ erro: "Serviço de clientes indisponível" });
        }

        let accountData = null;
        try {
            const accountResponse = await axiosInstance.get(
                `${accountQueryServiceUrl}/query/account-by-cpf/${cpf}`,
                config
            );
            accountData = accountResponse.data;
        } catch (accountError) {
            if (accountError.response?.status !== 404) {
                console.warn(`Erro ao buscar conta para CPF ${cpf}:`, accountError.message);
            }
        }

        let gerenteCpf = accountData?.managerId || null;

        if (gerenteCpf && gerenteCpf.length > 11) {
            try {
                const managerResp = await axiosInstance.get(
                    `${managerServiceUrl}/gerentes`,
                    config
                );
                if (Array.isArray(managerResp.data)) {
                    const foundManager = managerResp.data.find((m) => m.id === gerenteCpf);
                    if (foundManager) {
                        gerenteCpf = foundManager.cpf;
                    }
                }
            } catch (mgrError) {
                console.warn(
                    `[Gateway] Falha ao resolver CPF do gerente ${gerenteCpf}: ${mgrError.message}`
                );
            }
        }

        const composedResponse = {
            id: clientData.id,
            cpf: clientData.cpf,
            nome: clientData.nome,
            email: clientData.email,
            telefone: clientData.telefone,
            endereco: clientData.endereco,
            cidade: clientData.cidade,
            estado: clientData.estado,
            cep: clientData.cep,
            salario: clientData.salario,
            status: clientData.status,
            conta: accountData?.accountNumber || clientData.conta || null,
            saldo: accountData ? accountData.balance : 0,
            limite: accountData?.limit ?? clientData.limite ?? 0,
            idGerente: accountData ? accountData.managerId : null,
            gerente: gerenteCpf,
        };

        return res.status(200).json(composedResponse);
    } catch (error) {
        console.error(`[API COMPOSITION ERROR] R13 para CPF ${cpf}:`, error.message);
        res.status(500).json({
            erro: "Erro interno ao processar requisição",
            message: error.message,
        });
    }
});

// ============================================================
// ROTA 2: Lista de Melhores Clientes / Ranking (R14)
// ============================================================
app.get("/clientes/resumo/top-saldos", authenticateToken, async (req, res) => {
    const authHeader = req.headers.authorization;
    const clientServiceUrl = process.env.CLIENT_SERVICE_URL || "http://localhost:8081";
    const accountQueryServiceUrl = process.env.ACCOUNT_QUERY_SERVICE_URL || "http://localhost:8086";

    const config = {
        headers: { Authorization: authHeader },
    };
    try {
        const accountsResponse = await axiosInstance.get(
            `${accountQueryServiceUrl}/query/all-accounts`,
            config
        );
        const accounts = accountsResponse.data;

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
                const cpf = account.clientId ?? account.clientCpf ?? account.client_id ?? null;
                const saldoRaw = account.balance ?? account.saldo ?? account.Balance ?? 0;
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
        });

        if (error.response) {
            return res.status(error.response.status).json(error.response.data);
        }
        return res.status(503).json({
            error: "Serviço indisponível",
            message: "Falha ao compor dados para R14",
        });
    }
});

app.get(
  "/gerentes",
  authenticateToken,
  requireRole("ADMINISTRADOR"),
  async (req, res, next) => {
    if (req.query.filtro === "dashboard") {
      try {
        console.log("📊 [DASHBOARD] Gerando dashboard de gerentes (R15)...");

        const MANAGER_URL =
          process.env.MANAGER_SERVICE_URL || "http://localhost:8083";
        const ACCOUNT_QUERY_URL =
          process.env.ACCOUNT_QUERY_SERVICE_URL || "http://localhost:8086";
        const CLIENT_URL =
          process.env.CLIENT_SERVICE_URL || "http://localhost:8081";

        const config = {
          headers: { Authorization: req.headers.authorization },
        };

        // 🔹 1. Buscar todas as contas primeiro
        const accountsResp = await axiosInstance.get(
          `${ACCOUNT_QUERY_URL}/query/all`,
          config
        );
        const accounts = accountsResp.data || [];

        // 🔹 2. Extrair CPFs de gerentes e clientes das contas
        const managerCpfs = [...new Set(accounts.map(acc => String(acc.managerId)))];
        const clientCpfs = [...new Set(accounts.map(acc => String(acc.clientCpf ?? acc.clientId)))];

        // 🔹 3. Buscar apenas gerentes e clientes que aparecem nas contas
        const managersResp = await axiosInstance.get(
          `${MANAGER_URL}/gerentes`,
          config
        );
        const allManagers = managersResp.data || [];
        const managers = allManagers.filter(mgr => managerCpfs.includes(String(mgr.cpf)));

        const clientsResp = await axiosInstance.get(
          `${CLIENT_URL}/clientes/listar`,
          config
        );
        const allClients = clientsResp.data || [];
        const clientsList = allClients.filter(c => clientCpfs.includes(String(c.cpf)));

        // 🔹 4. Map de clientes por CPF
        const clientsMap = new Map();
        clientsList.forEach((c) => clientsMap.set(String(c.cpf), c));

        // 🔹 5. Montar dashboard
        const dashboard = managers.map((mgr) => {
          const mgrAccounts = accounts.filter(
            (acc) => String(acc.managerId) === String(mgr.cpf)
          );

          let totalPos = 0;
          let totalNeg = 0;
          const clientesDoGerente = [];
          const seenCpfs = new Set();

          mgrAccounts.forEach((acc) => {
            const saldo = Number(acc.balance ?? acc.saldo ?? 0);
            const clientCpf = String(acc.clientCpf ?? acc.clientId ?? "");

            if (!clientCpf) return;

            if (saldo >= 0) totalPos += saldo;
            else totalNeg += saldo;

            if (!seenCpfs.has(clientCpf)) {
              seenCpfs.add(clientCpf);
              const clientInfo = clientsMap.get(clientCpf);
              clientesDoGerente.push({
                cpf: clientCpf,
                nome: clientInfo?.nome ?? "Cliente não encontrado",
                saldo: saldo,
              });
            }
          });

          return {
            gerente: {
              cpf: mgr.cpf,
              nome: mgr.nome,
              email: mgr.email,
            },
            clientes: clientesDoGerente,
            saldo_positivo: Number(totalPos.toFixed(2)),
            saldo_negativo: Number(totalNeg.toFixed(2)),
          };
        });

        dashboard.sort((a, b) => b.saldo_positivo - a.saldo_positivo);

        return res.status(200).json(dashboard);
      } catch (error) {
        console.error(
          "❌ [DASHBOARD ERROR] Falha ao agregar dados:",
          error.message
        );
        return res
          .status(500)
          .json({ error: "Erro ao gerar dashboard de gerentes" });
      }
    }

    next();
  },
  proxy(process.env.MANAGER_SERVICE_URL || "http://localhost:8083")
);

// ============================================
// HEALTH CHECK & PROXIES
// ============================================
app.get("/health", (req, res) => {
    res.json({ status: "✅ API Gateway is running!" });
});

app.get("/health/auth", proxy(process.env.AUTH_SERVICE_URL || "http://localhost:8084"));
app.get("/health/client", proxy(process.env.CLIENT_SERVICE_URL || "http://localhost:8081"));
app.get("/health/account", proxy(process.env.ACCOUNT_SERVICE_URL || "http://localhost:8082"));
app.get("/health/manager", proxy(process.env.MANAGER_SERVICE_URL || "http://localhost:8083"));

app.get(
    "/clientes",
    authenticateToken,
    authorizeClientesList,
    async (req, res, next) => {
        const userRole = req.user?.tipo;
        const userCpf = req.user?.cpf;
        const filtro = req.query.filtro;
        const busca = req.query.busca || "";

        if (filtro === "para_aprovar") {
            return next();
        }

        if (
            filtro === "adm_relatorio_clientes" ||
            userRole === "GERENTE" ||
            userRole === "MANAGER" ||
            filtro === "melhores_clientes"
        ) {
            const authHeader = req.headers.authorization;
            const config = { headers: { Authorization: authHeader } };

            const clientUrl = process.env.CLIENT_SERVICE_URL || "http://localhost:8081";
            const managerUrl = process.env.MANAGER_SERVICE_URL || "http://localhost:8083";
            const accountQueryUrl =
                process.env.ACCOUNT_QUERY_SERVICE_URL || "http://localhost:8086";

            try {
                console.log(`[Gateway] Agregando dados para ${userRole}, filtro: ${filtro}`);

                let urlClientes = `${clientUrl}/clientes/listar`;
                if (busca) {
                    urlClientes += `?busca=${encodeURIComponent(busca)}`;
                }

                const [clientsResp, managersResp, accountsResp] = await Promise.all([
                    axiosInstance.get(urlClientes, config),
                    axiosInstance.get(`${managerUrl}/gerentes`, config),
                    axiosInstance.get(`${accountQueryUrl}/query/all`, config),
                ]);

                let clients = Array.isArray(clientsResp.data) ? clientsResp.data : [];
                const managers = Array.isArray(managersResp.data) ? managersResp.data : [];
                const accounts = Array.isArray(accountsResp.data) ? accountsResp.data : [];

                const accountMap = new Map();
                accounts.forEach((acc) => {
                    const cpf = acc.clientId || acc.clientCpf;
                    if (cpf) accountMap.set(cpf, acc);
                });

                const managerMap = new Map();
                managers.forEach((mgr) => {
                    if (mgr.cpf) managerMap.set(mgr.cpf, mgr);
                    if (mgr.id) managerMap.set(String(mgr.id), mgr);
                });

                let relatorio = clients.map((client) => {
                    const conta = accountMap.get(client.cpf);

                    let gerente = null;
                    if (conta && conta.managerId) {
                        gerente = managerMap.get(String(conta.managerId));
                    }
                    if (!gerente && conta && conta.managerCpf) {
                        gerente = managerMap.get(conta.managerCpf);
                    }

                    return {
                        cpf: client.cpf,
                        nome: client.nome,
                        email: client.email,
                        salario: client.salario,
                        cidade: client.cidade,
                        estado: client.estado,
                        numeroConta: conta ? conta.accountNumber : client.conta || null,
                        saldo: conta ? conta.balance || conta.saldo || 0 : 0,
                        limite: conta && conta.limit != null ? conta.limit : client.limite || 0,

                        cpfGerente: gerente ? gerente.cpf : null,
                        nomeGerente: gerente ? gerente.nome : "Não Atribuído",
                    };
                });

                if (filtro === "melhores_clientes") {
                    relatorio.sort((a, b) => Number(b.saldo) - Number(a.saldo));
                    relatorio = relatorio.slice(0, 3);
                } else {
                    relatorio.sort((a, b) => a.nome.localeCompare(b.nome));
                }

                return res.json(relatorio);
            } catch (error) {
                console.error("[Gateway Agregação Error]", error.message);
                return res.status(503).json({ error: "Erro ao agregar dados de clientes." });
            }
        }

        next();
    },
    proxy(process.env.CLIENT_SERVICE_URL || "http://localhost:8081", {
        proxyReqPathResolver: (req) => req.originalUrl,
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

// POST /clientes/validateEmail
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

// POST /clientes (R01) autocadastro
app.post(
    "/clientes",
    express.json(),
    proxy(process.env.CLIENT_SERVICE_URL || "http://localhost:8081", {
        proxyReqPathResolver: () => "/clientes/cadastro",
        proxyReqBodyDecorator: (bodyContent) => {
            const sanitized = { ...bodyContent };

            if (sanitized.cpf) sanitized.cpf = String(sanitized.cpf).replace(/[^\d]/g, "");

            const cepRaw = sanitized.cep ?? sanitized.CEP;
            if (cepRaw !== undefined) {
                sanitized.cep = String(cepRaw).replace(/[^\d]/g, "");
                delete sanitized.CEP;
            }
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
    proxy(services.saga, {
        proxyReqPathResolver: (req) => req.originalUrl,
        proxyReqBodyDecorator: (bodyContent) => {
            const sanitized = { ...bodyContent };

            const cepRaw = sanitized.cep ?? sanitized.CEP;
            if (cepRaw !== undefined) {
                sanitized.cep = String(cepRaw).replace(/[^\d]/g, "");
                delete sanitized.CEP;
            }

            if (sanitized.cpf) sanitized.cpf = String(sanitized.cpf).replace(/[^\d]/g, "");
            if (sanitized.email) sanitized.email = String(sanitized.email).trim().toLowerCase();
            if (sanitized.estado) sanitized.estado = String(sanitized.estado).toUpperCase();

            return sanitized;
        },
        proxyErrorHandler: (err, res, next) => {
            res.status(503).json({ error: "Saga Orchestrator indisponível para atualização." });
        },
    })
);

// POST /clientes/:cpf/aprovar (R10) - GERENTE
app.post(
    "/clientes/:cpf/aprovar",
    authenticateToken,
    requireRole("GERENTE"),
    proxy(services.saga, {
        proxyReqPathResolver: (req) => req.originalUrl,
        proxyErrorHandler: (err, res, next) => {
            res.status(503).json({ error: "Saga Orchestrator indisponível para aprovação." });
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
const accountProxyOptions = {
    proxyReqPathResolver: (req) => req.originalUrl,
    proxyReqOptDecorator: (proxyReqOpts, srcReq) => {
        if (srcReq.user && srcReq.user.cpf) {
            proxyReqOpts.headers["X-User-CPF"] = srcReq.user.cpf;
        }
        return proxyReqOpts;
    },
    proxyErrorHandler: (err, res, next) => {
        res.status(503).json({ error: "Account Service unavailable", message: err.message });
    },
};

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
    proxy(process.env.ACCOUNT_SERVICE_URL || "http://localhost:8082", accountProxyOptions)
);

app.post(
    "/contas/:conta/sacar",
    authenticateToken,
    proxy(process.env.ACCOUNT_SERVICE_URL || "http://localhost:8082", accountProxyOptions)
);

app.post(
    "/contas/:conta/transferir",
    authenticateToken,
    proxy(process.env.ACCOUNT_SERVICE_URL || "http://localhost:8082", accountProxyOptions)
);

// R8: Extrato
app.get("/contas/:numero/extrato", authenticateToken, async (req, res) => {
    const { numero } = req.params;
    const config = { headers: { Authorization: req.headers.authorization } };

    try {
        const extratoResp = await axiosInstance.get(
            `${services.query}/query/contas/${numero}/extrato`,
            config
        );
        const listaDiaria = extratoResp.data || [];

        const saldoResp = await axiosInstance.get(
            `${services.account}/contas/${numero}/saldo`,
            config
        );

        let todasMovimentacoes = [];
        listaDiaria.forEach((dia) => {
            if (dia.movimentacoes && Array.isArray(dia.movimentacoes)) {
                const movs = dia.movimentacoes.map((m) => {
                    let tipo = m.tipo ? m.tipo.toLowerCase() : "";

                    if (tipo.includes("deposit") || tipo.includes("deposito")) tipo = "depósito";
                    else if (tipo.includes("withdraw") || tipo.includes("saque")) tipo = "saque";
                    else if (tipo.includes("transfer")) tipo = "transferência";

                    return {
                        ...m,
                        tipo,
                        data: m.data || dia.data,
                    };
                });
                todasMovimentacoes = todasMovimentacoes.concat(movs);
            }
        });

        res.json({
            conta: numero,
            saldo: saldoResp.data.balance || saldoResp.data.saldo || 0,
            movimentacoes: todasMovimentacoes,
        });
    } catch (error) {
        console.error("Erro extrato:", error.message);
        res.status(503).json({ error: "Erro ao buscar extrato" });
    }
});

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
// REBOOT SYSTEM (API Composition)
// ============================================
app.get("/reboot", async (req, res) => {
    console.log("[Gateway] Iniciando reboot do sistema (API Composition)...");

    const authHeader = req.headers.authorization;
    const config = { headers: { Authorization: authHeader } };

    // Lista de serviços para resetar
    const services = [
        { name: "Auth Service", url: process.env.AUTH_SERVICE_URL },
        {
            name: "Manager Service",
            url: process.env.MANAGER_SERVICE_URL + "/gerentes",
        },
        {
            name: "Client Service",
            url: process.env.CLIENT_SERVICE_URL + "/clientes",
        },
        {
            name: "Account Service",
            url: process.env.ACCOUNT_SERVICE_URL + "/contas",
        },
        {
            name: "Account query Service",
            url: process.env.ACCOUNT_QUERY_SERVICE_URL + "/query",
        }
    ];

    // Dispara as requisições em paralelo usando Promise.all
    // Nota: Certifique-se que seus microsserviços aceitam POST /reboot
    const promises = services.map(async (service) => {
        try {
            // Tenta chamar o endpoint /reboot do serviço
            const response = await axiosInstance.post(`${service.url}/reboot`, {}, config);
            return {
                service: service.name,
                status: "SUCCESS",
                details: response.data,
            };
        } catch (error) {
            return {
                service: service.name,
                status: "ERROR",
                error: error.message,
                details: error.response?.data || "Sem detalhes",
            };
        }
    });

    // Aguarda todas as respostas
    const results = await Promise.all(promises);

    // Verifica se houve algum erro
    const hasError = results.some((r) => r.status === "ERROR");
    const statusCode = hasError ? 207 : 200; // 207 Multi-Status se houver falhas parciais

    res.status(statusCode).json({
        action: "System Reboot",
        timestamp: new Date(),
        summary: hasError ? "Alguns serviços falharam" : "Todos os serviços resetados com sucesso",
        results: results,
    });
});

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
    console.log(`   BANTADS API GATEWAY`);
    console.log("   =============================================");
    console.log(`   📍 Running on: http://localhost:${PORT}`);
    console.log(`   🕐 Started at: ${new Date().toLocaleString("pt-BR")}`);
    console.log("   =============================================");
    console.log("\n📡 Microservices Configuration:");
    console.log(
        `   • Client Service:  ${process.env.CLIENT_SERVICE_URL || "http://localhost:8081"}`
    );
    console.log(
        `   • Account Service: ${process.env.ACCOUNT_SERVICE_URL || "http://localhost:8082"}`
    );
    console.log(
        `   • Manager Service: ${process.env.MANAGER_SERVICE_URL || "http://localhost:8083"}`
    );
    console.log(`   • Auth Service:    ${process.env.AUTH_SERVICE_URL || "http://localhost:8084"}`);
    console.log(
        `   • Saga Service:    ${process.env.SAGA_ORCHESTRATOR_URL || "http://localhost:8085"}`
    );
    console.log(`   • Auth Service:    ${process.env.AUTH_SERVICE_URL || "http://localhost:8084"}`);
});
