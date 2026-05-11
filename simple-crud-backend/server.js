const express = require("express");
const cors = require("cors");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const rateLimit = require("express-rate-limit");

require("dotenv").config();

const app = express();
const logDir = path.join(__dirname, "logs");
const logFile = path.join(logDir, "app.log");
const verboseLogFile = path.join(logDir, "verbose.log");
const errorLogFile = path.join(logDir, "errors.log");
const startedAt = new Date();
const idempotencyStore = new Map();
const metrics = {
    requests: 0,
    responsesByStatus: {},
    responsesByRoute: {},
    totalDurationMs: 0,
    errors: 0,
};

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
app.set("trust proxy", 1);

app.use((req, res, next) => {
    req.requestId = getRequestId(req);
    res.set("X-Request-ID", req.requestId);
    next();
});

app.use((req, res, next) => {
    const start = process.hrtime.bigint();
    metrics.requests += 1;

    res.on("finish", () => {
        const durationMs = Number(process.hrtime.bigint() - start) / 1000000;
        const level = res.statusCode >= 500 ? "error" : res.statusCode >= 400 ? "warn" : "info";
        const statusGroup = `${Math.floor(res.statusCode / 100)}xx`;

        metrics.responsesByStatus[statusGroup] = (metrics.responsesByStatus[statusGroup] || 0) + 1;
        metrics.responsesByRoute[req.path] = (metrics.responsesByRoute[req.path] || 0) + 1;
        metrics.totalDurationMs += durationMs;

        if (res.statusCode >= 500) {
            metrics.errors += 1;
        }

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
});

const PORT = process.env.PORT || 5000;
const APP_VERSION = process.env.APP_VERSION || "1.0.0";
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || "local-dev-token";

function getRequestId(req) {
    return req.get("x-request-id") || crypto.randomUUID();
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function getAverageLatencyMs() {
    if (!metrics.requests) {
        return 0;
    }

    return Number((metrics.totalDurationMs / metrics.requests).toFixed(2));
}

function getBaseHealth() {
    return {
        service: "simple-crud-backend",
        version: APP_VERSION,
        status: "ok",
        uptimeSeconds: Math.floor(process.uptime()),
        startedAt: startedAt.toISOString(),
        timestamp: new Date().toISOString(),
    };
}

function burnCpu(ms) {
    const end = Date.now() + ms;
    let iterations = 0;

    while (Date.now() < end) {
        iterations += Math.sqrt(iterations + Math.random());
    }

    return Math.round(iterations);
}

function createItem(name, category = "general") {
    return {
        id: Date.now() + Math.floor(Math.random() * 100000),
        name,
        category,
        createdAt: new Date().toISOString(),
    };
}

function seedItems(count) {
    const categories = ["proxy", "cache", "rate-limit", "observability", "load-test"];
    const seeded = [];

    for (let index = 0; index < count; index += 1) {
        seeded.push(createItem(
            `Learning item ${items.length + index + 1}`,
            categories[index % categories.length]
        ));
    }

    items.push(...seeded);
    return seeded;
}

function requireAdmin(req, res, next) {
    if (req.get("x-admin-token") !== ADMIN_TOKEN) {
        return res.status(401).json({
            message: "Missing or invalid x-admin-token",
        });
    }

    next();
}


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
const writeLimiter1 = rateLimit({
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

// Rate limiting is intentionally disabled for this learning setup.
const writeLimiter = (req, res, next) => {
    next();
};

// In-memory DB (for demo)
let items = [
    { id: 1, name: "Item One", category: "general", createdAt: new Date().toISOString() },
    { id: 2, name: "Item Two", category: "general", createdAt: new Date().toISOString() },
];

let orders = [];

app.get("/", (req, res) => {
    res.json({
        message: "Simple CRUD backend is running",
        docs: {
            health: "/health",
            readiness: "/ready",
            metrics: "/metrics",
            headers: "/debug/headers",
            requestId: "/debug/request-id",
            items: "/items",
            paginatedItems: "/api/v1/items?page=1&limit=10&q=proxy",
            stream: "/stream/events",
        },
    });
});

app.get("/health", (req, res) => {
    res.json(getBaseHealth());
});

app.get("/ready", (req, res) => {
    res.json({
        ...getBaseHealth(),
        dependencies: {
            database: "in-memory",
            logDirectory: fs.existsSync(logDir) ? "ready" : "missing",
        },
    });
});

app.get("/metrics", (req, res) => {
    const memory = process.memoryUsage();

    res.json({
        uptimeSeconds: Math.floor(process.uptime()),
        requests: metrics.requests,
        errors: metrics.errors,
        averageLatencyMs: getAverageLatencyMs(),
        responsesByStatus: metrics.responsesByStatus,
        topRoutes: Object.entries(metrics.responsesByRoute)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([route, count]) => ({ route, count })),
        memory: {
            rssMb: Number((memory.rss / 1024 / 1024).toFixed(2)),
            heapUsedMb: Number((memory.heapUsed / 1024 / 1024).toFixed(2)),
            heapTotalMb: Number((memory.heapTotal / 1024 / 1024).toFixed(2)),
        },
    });
});

app.get("/debug/headers", (req, res) => {
    res.json({
        ip: req.ip,
        ips: req.ips,
        protocol: req.protocol,
        host: req.get("host"),
        forwardedFor: req.get("x-forwarded-for"),
        forwardedProto: req.get("x-forwarded-proto"),
        realIp: req.get("x-real-ip"),
        headers: req.headers,
    });
});

app.get("/debug/request-id", (req, res) => {
    res.json({
        requestId: req.requestId,
        receivedRequestId: req.get("x-request-id") || null,
        responseHeader: "X-Request-ID",
    });
});

app.get("/slow", async (req, res) => {
    const delayMs = Math.min(parseInt(req.query.ms, 10) || 1000, 30000);

    await sleep(delayMs);

    res.json({
        message: "Delayed response completed",
        delayMs,
    });
});

app.get("/unstable", (req, res) => {
    const failRate = Math.min(Math.max(Number(req.query.failRate) || 0.5, 0), 1);

    if (Math.random() < failRate) {
        throw new Error(`Synthetic unstable endpoint failure at failRate=${failRate}`);
    }

    res.json({
        message: "Synthetic request succeeded",
        failRate,
    });
});

app.get("/status/:code", (req, res) => {
    const code = parseInt(req.params.code, 10);
    const safeCode = code >= 100 && code <= 599 ? code : 400;

    res.status(safeCode).json({
        message: `Synthetic status ${safeCode}`,
        statusCode: safeCode,
    });
});

app.get("/payload", (req, res) => {
    const kb = Math.min(parseInt(req.query.kb, 10) || 10, 1024);
    const payload = "x".repeat(kb * 1024);

    res.json({
        sizeKb: kb,
        payload,
    });
});

app.get("/cpu", (req, res) => {
    const ms = Math.min(parseInt(req.query.ms, 10) || 100, 3000);
    const iterations = burnCpu(ms);

    res.json({
        message: "CPU simulation completed",
        durationMs: ms,
        iterations,
    });
});

app.get("/cache/products", (req, res) => {
    res.set("Cache-Control", "public, max-age=30");
    res.json({
        cacheHint: "This response is safe to cache at Nginx for learning proxy_cache.",
        generatedAt: new Date().toISOString(),
        products: [
            { id: "p-100", name: "Nginx Reverse Proxy Notes", price: 199 },
            { id: "p-101", name: "Load Testing Checklist", price: 149 },
            { id: "p-102", name: "Observability Starter Kit", price: 249 },
        ],
    });
});

app.get("/api/v1/items", (req, res) => {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 100);
    const q = (req.query.q || "").toString().toLowerCase();
    const category = (req.query.category || "").toString().toLowerCase();
    const filteredItems = items.filter(item => {
        const matchesText = !q || item.name.toLowerCase().includes(q);
        const matchesCategory = !category || item.category.toLowerCase() === category;

        return matchesText && matchesCategory;
    });
    const start = (page - 1) * limit;
    const data = filteredItems.slice(start, start + limit);

    res.json({
        data,
        pagination: {
            page,
            limit,
            total: filteredItems.length,
            totalPages: Math.ceil(filteredItems.length / limit),
        },
        filters: {
            q,
            category,
        },
    });
});

app.get("/api/v1/items/:id", (req, res) => {
    const item = items.find(i => i.id === parseInt(req.params.id));

    if (!item) {
        return res.status(404).json({ message: "Item not found" });
    }

    res.json(item);
});

app.post("/api/v1/items", writeLimiter, (req, res) => {
    if (!req.body.name) {
        return res.status(400).json({ message: "Item name is required" });
    }

    const newItem = createItem(req.body.name, req.body.category);

    items.push(newItem);
    res.status(201).json(newItem);
});

app.post("/api/v1/items/bulk", writeLimiter, (req, res) => {
    const count = Math.min(Math.max(parseInt(req.body.count, 10) || 10, 1), 1000);
    const seeded = seedItems(count);

    res.status(201).json({
        message: "Items seeded",
        count: seeded.length,
        totalItems: items.length,
    });
});

app.delete("/api/v1/items/:id", (req, res) => {
    const itemId = parseInt(req.params.id);
    const itemExists = items.some(i => i.id === itemId);

    if (!itemExists) {
        return res.status(404).json({ message: "Item not found" });
    }

    items = items.filter(i => i.id !== itemId);
    res.json({ message: "Item deleted" });
});

app.post("/api/v1/orders", writeLimiter, (req, res) => {
    const idempotencyKey = req.get("idempotency-key");

    if (!idempotencyKey) {
        return res.status(400).json({
            message: "idempotency-key header is required",
        });
    }

    if (idempotencyStore.has(idempotencyKey)) {
        return res
            .status(200)
            .set("X-Idempotency-Replayed", "true")
            .json(idempotencyStore.get(idempotencyKey));
    }

    const order = {
        id: crypto.randomUUID(),
        itemName: req.body.itemName || "Nginx practice order",
        quantity: Math.max(parseInt(req.body.quantity, 10) || 1, 1),
        createdAt: new Date().toISOString(),
    };

    orders.push(order);
    idempotencyStore.set(idempotencyKey, order);

    res.status(201).json(order);
});

app.get("/api/v1/orders", (req, res) => {
    res.json({
        data: orders,
        total: orders.length,
    });
});

app.post("/admin/reset", requireAdmin, (req, res) => {
    items = [
        { id: 1, name: "Item One", category: "general", createdAt: new Date().toISOString() },
        { id: 2, name: "Item Two", category: "general", createdAt: new Date().toISOString() },
    ];
    orders = [];
    idempotencyStore.clear();

    res.json({
        message: "Demo data reset",
        items: items.length,
        orders: orders.length,
    });
});

app.get("/stream/events", (req, res) => {
    const count = Math.min(parseInt(req.query.count, 10) || 10, 100);
    const intervalMs = Math.min(parseInt(req.query.intervalMs, 10) || 1000, 10000);
    let sent = 0;

    res.set({
        "Cache-Control": "no-cache",
        "Content-Type": "text/event-stream",
        "Connection": "keep-alive",
        "X-Accel-Buffering": "no",
    });
    res.flushHeaders?.();

    const timer = setInterval(() => {
        sent += 1;
        res.write(`event: metric\n`);
        res.write(`data: ${JSON.stringify({
            sequence: sent,
            requestId: req.requestId,
            timestamp: new Date().toISOString(),
            requests: metrics.requests,
            averageLatencyMs: getAverageLatencyMs(),
        })}\n\n`);

        if (sent >= count) {
            clearInterval(timer);
            res.end();
        }
    }, intervalMs);

    req.on("close", () => clearInterval(timer));
});

// 1. GET all items
app.get("/items", (req, res) => {
    res.json(items);
});

// 2. GET single item
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

// 3. POST create item
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
        category: req.body.category || "general",
        createdAt: new Date().toISOString(),
    };
    items.push(newItem);
    res.status(201).json(newItem);
});

// 4. DELETE item
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
