const { log } = require("../logger");

function errorHandler(err, req, res, next) {
    log("error", "Unhandled request error", {
        method: req.method,
        path: req.originalUrl,
        error: err.message,
        stack: err.stack,
    });

    res.status(500).json({ message: "Internal server error" });
}

module.exports = { errorHandler };
