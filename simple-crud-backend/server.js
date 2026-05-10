const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const rateLimit = require("express-rate-limit");

require("dotenv").config();

const app = express();
const logDir = path.join(__dirname, "logs");
const logFile = path.join(logDir, "app.log");
const verboseLogFile = path.join(logDir, "verbose.log");
const errorLogFile = path.join(logDir, "errors.log");

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

app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
    const start = process.hrtime.bigint();

    res.on("finish", () => {
        const durationMs = Number(process.hrtime.bigint() - start) / 1000000;
        const level = res.statusCode >= 500 ? "error" : res.statusCode >= 400 ? "warn" : "info";

        log(level, "HTTP request completed", {
            method: req.method,
            path: req.originalUrl,
            statusCode: res.statusCode,
            durationMs: Number(durationMs.toFixed(2)),
            ip: req.ip,
            userAgent: req.get("user-agent"),
        });
    });

    next();
});

const PORT = process.env.PORT || 5000;


// ⛔ Basic Rate Limiter (for all routes)
// const globalLimiter = rateLimit({
//     windowMs: 15 * 60 * 1000, // 15 minutes
//     max: 100, // limit each IP to 100 requests per window
//     message: {
//         message: "Too many requests from this IP, please try again later."
//     },
//     standardHeaders: true, // adds RateLimit headers
//     legacyHeaders: false,  // disables X-RateLimit headers
// });


// const globalLimiter = rateLimit({
//     windowMs: 1 * 60 * 1000, //   minute, seconds, milliseconds
//     max: 20, // limit each IP to this number of requests per window
//     message: {
//         message: "Too many requests from this IP, please try again later."
//     },
//     standardHeaders: true, // adds RateLimit headers
//     legacyHeaders: false,  // disables X-RateLimit headers
// });


// app.use(globalLimiter);



// 🔐 Stricter limiter for write operations
const writeLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, //   minute, seconds, milliseconds
    max: 5, // only 10 write requests per IP
    message: {
        message: "Too many create/delete requests. Slow down."
    },
    handler: (req, res) => {
        log("warn", "Rate limit exceeded", {
            method: req.method,
            path: req.originalUrl,
            ip: req.ip,
        });

        res.status(429).json({
            message: "Too many create/delete requests. Slow down."
        });
    },
});


// In-memory DB (for demo)
let items = [
    { id: 1, name: "Item One" },
    { id: 2, name: "Item Two" },
];

// 🔹 1. GET all items
app.get("/items", (req, res) => {
    res.json(items);
});

// 🔹 2. GET single item
app.get("/items/:id", (req, res) => {
    const item = items.find(i => i.id === parseInt(req.params.id));
    if (!item) {
        log("warn", "Item not found", {
            id: req.params.id,
            method: req.method,
            path: req.originalUrl,
        });

        return res.status(404).json({ message: "Item not found" });
    }

    res.json(item);
});

// 🔹 3. POST create item
app.post("/items", writeLimiter, (req, res) => {
    if (!req.body.name) {
        log("warn", "Create item failed validation", {
            body: req.body,
            method: req.method,
            path: req.originalUrl,
        });

        return res.status(400).json({ message: "Item name is required" });
    }

    const newItem = {
        id: Date.now(),
        name: req.body.name,
    };
    items.push(newItem);
    res.status(201).json(newItem);
});

// 🔹 4. DELETE item
app.delete("/items/:id", (req, res) => {
    const itemId = parseInt(req.params.id);
    const itemExists = items.some(i => i.id === itemId);

    if (!itemExists) {
        log("warn", "Delete item failed because item was not found", {
            id: req.params.id,
            method: req.method,
            path: req.originalUrl,
        });

        return res.status(404).json({ message: "Item not found" });
    }

    items = items.filter(i => i.id !== itemId);
    res.json({ message: "Item deleted" });
});

app.use((err, req, res, next) => {
    log("error", "Unhandled request error", {
        method: req.method,
        path: req.originalUrl,
        error: err.message,
        stack: err.stack,
    });

    res.status(500).json({ message: "Internal server error" });
});

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
