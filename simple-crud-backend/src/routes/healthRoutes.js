const express = require("express");
const { getMetricsSnapshot } = require("../metrics");
const { getBaseHealth, getReadiness } = require("../services/healthService");

const router = express.Router();

router.get("/health", (req, res) => {
    res.json(getBaseHealth());
});

router.get("/ready", (req, res) => {
    res.json(getReadiness());
});

router.get("/metrics", (req, res) => {
    res.json(getMetricsSnapshot());
});

module.exports = router;
