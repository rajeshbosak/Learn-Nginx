const fs = require("fs");
const { APP_VERSION, INSTANCE_ID, logDir, PORT } = require("../config");

const startedAt = new Date();

function getBaseHealth() {
    return {
        service: "simple-crud-backend",
        instanceId: INSTANCE_ID,
        port: Number(PORT),
        version: APP_VERSION,
        status: "ok",
        uptimeSeconds: Math.floor(process.uptime()),
        startedAt: startedAt.toISOString(),
        timestamp: new Date().toISOString(),
    };
}

function getReadiness() {
    return {
        ...getBaseHealth(),
        dependencies: {
            database: "in-memory",
            logDirectory: fs.existsSync(logDir) ? "ready" : "missing",
        },
    };
}

module.exports = {
    getBaseHealth,
    getReadiness,
};
