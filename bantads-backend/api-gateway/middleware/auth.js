const jwt = require("jsonwebtoken");

const { JWT_SECRET } = process.env;

function authenticateToken(req, res, next) {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1]; // Bearer TOKEN

    if (!token) {
        console.log("❌ Auth failed: No token provided");
        return res.status(401).json({
            error: "O usuário não está logado",
        });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);

        // Attach user info to request object
        req.user = {
            cpf: decoded.cpf,
            email: decoded.sub,
            tipo: decoded.tipo, // CLIENTE, GERENTE, ADMINISTRADOR
        };

        console.log(`✅ Auth success: ${req.user.tipo} (CPF: ${req.user.cpf})`);
        next();
    } catch (err) {
        console.error("❌ Token validation error:", err.message);
        return res.status(401).json({
            error: "O usuário não está logado",
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
