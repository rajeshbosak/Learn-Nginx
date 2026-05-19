const fs = require("fs");
const { errorLogFile, logDir, logFile, verboseLogFile } = require("./config");

fs.mkdirSync(logDir, { recursive: true });

function writeLog(file, line, sync) {
    if (sync) {
        fs.appendFileSync(file, `${line}\n`);
        return;
    }

    fs.appendFile(file, `${line}\n`, (err) => {
        if (err) {
            console.error(JSON.stringify({
                timestamp: new Date().toISOString(),
                level: "error",
                message: "Failed to write log file",
                file,
                error: err.message,
            }));
        }
    });
}

function log(level, message, meta = {}, options = {}) {
    const entry = {
        timestamp: new Date().toISOString(),
        level,
        message,
        ...meta,
    };
    const line = JSON.stringify(entry);

    if (level === "error") {
        console.error(line);
    } else if (level === "warn") {
        console.warn(line);
    } else {
        console.log(line);
    }

    writeLog(logFile, line, options.sync);
    writeLog(verboseLogFile, line, options.sync);

    if (level === "error") {
        writeLog(errorLogFile, line, options.sync);
    }
}

module.exports = { log };
