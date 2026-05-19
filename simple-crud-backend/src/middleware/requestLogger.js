const { log } = require("../logger");
const { recordRequest, recordResponse } = require("../metrics");

function requestLogger(req, res, next) {
    const start = process.hrtime.bigint();
    recordRequest();

    res.on("finish", () => {
        const durationMs = Number(process.hrtime.bigint() - start) / 1000000;
        const level = res.statusCode >= 500 ? "error" : res.statusCode >= 400 ? "warn" : "info";

        recordResponse(req.path, res.statusCode, durationMs);

        log(level, "HTTP request completed", {
            method: req.method,
            path: req.originalUrl,
            statusCode: res.statusCode,
            durationMs: Number(durationMs.toFixed(2)),
            ip: req.ip,
            requestId: req.requestId,
            userAgent: req.get("user-agent"),
        });
    });

    next();
}

module.exports = { requestLogger };
