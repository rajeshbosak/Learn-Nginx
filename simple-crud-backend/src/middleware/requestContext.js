const crypto = require("crypto");

function requestContext(req, res, next) {
    req.requestId = req.get("x-request-id") || crypto.randomUUID();
    res.set("X-Request-ID", req.requestId);
    next();
}

module.exports = { requestContext };
