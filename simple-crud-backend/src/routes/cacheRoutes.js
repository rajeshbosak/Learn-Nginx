const express = require("express");

const router = express.Router();

router.get("/cache/products", (req, res) => {
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

module.exports = router;
