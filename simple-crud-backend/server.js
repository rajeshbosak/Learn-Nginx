require("dotenv").config();

const { createApp } = require("./src/app");
const { errorLogFile, logFile, PORT, verboseLogFile } = require("./src/config");
const { log } = require("./src/logger");

const app = createApp();

process.on("uncaughtException", (err) => {
    log("error", "Uncaught exception", {
        error: err.message,
        stack: err.stack,
    }, { sync: true });

    process.exit(1);
});

process.on("unhandledRejection", (reason) => {
    log("error", "Unhandled promise rejection", {
        reason: reason instanceof Error ? reason.message : reason,
        stack: reason instanceof Error ? reason.stack : undefined,
    }, { sync: true });
});

app.listen(PORT, () => {
    log("info", "Server started", {
        port: PORT,
        url: `http://localhost:${PORT}`,
        logFile,
        verboseLogFile,
        errorLogFile,
    });
});
