const jwt = require("jsonwebtoken");
const axios = require("axios");

// URL do Auth Service (ajuste se necessário)
const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || "http://localhost:8084";

async function authenticateToken(req, res, next) {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1]; // Bearer TOKEN

    if (!token) {
        console.log("❌ Auth failed: No token provided");
        return res.status(401).json({
            error: "O usuário não está logado",
        });
    }

    try {
        // 1. Chama o Auth Service para validar (checa assinatura e blacklist)
        await axios.get(`${AUTH_SERVICE_URL}/validate`, {
            headers: { Authorization: `Bearer ${token}` }
        });

        // 2. Se o axios não der erro, o token é válido.
        // Decodificamos apenas para ler os dados (tipo, cpf) para o Gateway usar.
        const decoded = jwt.decode(token);

        req.user = {
            cpf: decoded.cpf,
            email: decoded.sub,
            tipo: decoded.tipo,
        };

        console.log(`✅ Auth success: ${req.user.tipo} (CPF: ${req.user.cpf})`);
        next();

    } catch (err) {
        // Se o Auth Service retornar 401 ou erro de conexão
        const status = err.response ? err.response.status : 500;
        const msg = err.response ? "Token inválido ou expirado" : "Erro de conexão com Auth Service";
        
        console.error(`❌ Token validation error: ${msg}`);
        
        return res.status(401).json({
            error: "O usuário não está logado (Token inválido)",
        });
    }
}

function requireRole(...allowedRoles) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                error: "O usuário não está logado",
            });
        }

        if (!allowedRoles.includes(req.user.tipo)) {
            console.log(
                `❌ Authorization failed: User is ${req.user.tipo}, needs ${allowedRoles.join(
                    " or "
                )}`
            );
            return res.status(403).json({
                error: "O usuário não tem permissão para efetuar esta operação",
            });
        }

        console.log(`✅ Authorization success: User ${req.user.tipo} has access`);
        next();
    };
}

function requireOwnerOrAdmin(cpfParamName = "cpf") {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                error: "O usuário não está logado",
            });
        }

        const requestedCpf = req.params[cpfParamName];
        const isOwner = req.user.cpf === requestedCpf;
        const isAdmin = req.user.tipo === "ADMINISTRADOR";

        if (!isOwner && !isAdmin) {
            console.log(
                `❌ Authorization failed: User ${req.user.cpf} tried to access ${requestedCpf}`
            );
            return res.status(403).json({
                error: "O usuário não tem permissão para efetuar esta operação",
            });
        }

        console.log(
            `✅ Authorization success: ${isAdmin ? "Admin" : "Owner"} accessing ${requestedCpf}`
        );
        next();
    };
}

module.exports = {
    authenticateToken,
    requireRole,
    requireOwnerOrAdmin,
};
