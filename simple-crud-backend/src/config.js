const path = require("path");

const PORT = process.env.PORT || 5000;
const APP_VERSION = process.env.APP_VERSION || "1.0.0";
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || "local-dev-token";
const INSTANCE_ID = process.env.INSTANCE_ID || `backend-${PORT}`;
const logDir = path.join(__dirname, "..", "logs");

module.exports = {
    PORT,
    APP_VERSION,
    ADMIN_TOKEN,
    INSTANCE_ID,
    logDir,
    logFile: path.join(logDir, "app.log"),
    verboseLogFile: path.join(logDir, "verbose.log"),
    errorLogFile: path.join(logDir, "errors.log"),
};
