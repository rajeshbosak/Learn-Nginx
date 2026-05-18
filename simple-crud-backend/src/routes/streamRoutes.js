const express = require("express");
const { getAverageLatencyMs } = require("../metrics");

const router = express.Router();

router.get("/stream/events", (req, res) => {
    const count = Math.min(Number.parseInt(req.query.count, 10) || 10, 100);
    const intervalMs = Math.min(Number.parseInt(req.query.intervalMs, 10) || 1000, 10000);
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
        res.write("event: metric\n");
        res.write(`data: ${JSON.stringify({
            sequence: sent,
            requestId: req.requestId,
            timestamp: new Date().toISOString(),
            averageLatencyMs: getAverageLatencyMs(),
        })}\n\n`);

        if (sent >= count) {
            clearInterval(timer);
            res.end();
        }
    }, intervalMs);

    req.on("close", () => clearInterval(timer));
});

module.exports = router;
