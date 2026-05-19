const { ADMIN_TOKEN } = require("../config");

function requireAdmin(req, res, next) {
    if (req.get("x-admin-token") !== ADMIN_TOKEN) {
        return res.status(401).json({
            message: "Missing or invalid x-admin-token",
        });
    }

    next();
}

module.exports = { requireAdmin };
