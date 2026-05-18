const express = require("express");

const router = express.Router();

router.get("/", (req, res) => {
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

module.exports = router;
