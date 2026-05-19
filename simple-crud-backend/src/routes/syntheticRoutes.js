const express = require("express");
const { burnCpu, sleep } = require("../utils/simulations");

const router = express.Router();

router.get("/slow", async (req, res) => {
    const delayMs = Math.min(Number.parseInt(req.query.ms, 10) || 1000, 30000);

    await sleep(delayMs);

    res.json({
        message: "Delayed response completed",
        delayMs,
    });
});

router.get("/unstable", (req, res) => {
    const failRate = Math.min(Math.max(Number(req.query.failRate) || 0.5, 0), 1);

    if (Math.random() < failRate) {
        throw new Error(`Synthetic unstable endpoint failure at failRate=${failRate}`);
    }

    res.json({
        message: "Synthetic request succeeded",
        failRate,
    });
});

router.get("/status/:code", (req, res) => {
    const code = Number.parseInt(req.params.code, 10);
    const safeCode = code >= 100 && code <= 599 ? code : 400;

    res.status(safeCode).json({
        message: `Synthetic status ${safeCode}`,
        statusCode: safeCode,
    });
});

router.get("/payload", (req, res) => {
    const kb = Math.min(Number.parseInt(req.query.kb, 10) || 10, 1024);
    const payload = "x".repeat(kb * 1024);

    res.json({
        sizeKb: kb,
        payload,
    });
});

router.get("/cpu", (req, res) => {
    const ms = Math.min(Number.parseInt(req.query.ms, 10) || 100, 3000);
    const iterations = burnCpu(ms);

    res.json({
        message: "CPU simulation completed",
        durationMs: ms,
        iterations,
    });
});

module.exports = router;
