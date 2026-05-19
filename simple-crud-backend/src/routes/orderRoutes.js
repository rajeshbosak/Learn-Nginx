const express = require("express");
const { writeLimiter } = require("../middleware/rateLimiters");
const { createOrder, listOrders } = require("../state/demoStore");

const router = express.Router();

router.post("/api/v1/orders", writeLimiter, (req, res) => {
    const idempotencyKey = req.get("idempotency-key");

    if (!idempotencyKey) {
        return res.status(400).json({
            message: "idempotency-key header is required",
        });
    }

    const result = createOrder({
        idempotencyKey,
        itemName: req.body.itemName,
        quantity: req.body.quantity,
    });

    if (result.replayed) {
        return res
            .status(200)
            .set("X-Idempotency-Replayed", "true")
            .json(result.order);
    }

    res.status(201).json(result.order);
});

router.get("/api/v1/orders", (req, res) => {
    res.json(listOrders());
});

module.exports = router;
