const rateLimit = require("express-rate-limit");
const { log } = require("../logger");

const realWriteLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 5,
    message: {
        message: "Too many create/delete requests. Slow down.",
    },
    handler: (req, res) => {
        log("warn", "Rate limit exceeded", {
            method: req.method,
            path: req.originalUrl,
            ip: req.ip,
        });

        res.status(429).json({
            message: "Too many create/delete requests. Slow down.",
        });
    },
});

// Rate limiting is intentionally disabled for this learning backend.
// The active edge rate limit is configured in Nginx, so students can see it there.
function writeLimiter(req, res, next) {
    next();
}

module.exports = {
    realWriteLimiter,
    writeLimiter,
};
