const express = require("express");
const { log } = require("../logger");
const { writeLimiter } = require("../middleware/rateLimiters");
const {
    addItem,
    deleteItem,
    findItem,
    listItems,
    searchItems,
    seedItems,
} = require("../state/demoStore");

const router = express.Router();

router.get("/items", (req, res) => {
    res.json(listItems());
});

router.get("/items/:id", (req, res) => {
    const item = findItem(req.params.id);

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

router.post("/items", writeLimiter, (req, res) => {
    if (!req.body.name) {
        log("warn", "Create item failed validation", {
            body: req.body,
            method: req.method,
            path: req.originalUrl,
        });

        return res.status(400).json({ message: "Item name is required" });
    }

    res.status(201).json(addItem(req.body.name, req.body.category));
});

router.delete("/items/:id", (req, res) => {
    if (!deleteItem(req.params.id)) {
        log("warn", "Delete item failed because item was not found", {
            id: req.params.id,
            method: req.method,
            path: req.originalUrl,
        });

        return res.status(404).json({ message: "Item not found" });
    }

    res.json({ message: "Item deleted" });
});

router.get("/api/v1/items", (req, res) => {
    res.json(searchItems(req.query));
});

router.get("/api/v1/items/:id", (req, res) => {
    const item = findItem(req.params.id);

    if (!item) {
        return res.status(404).json({ message: "Item not found" });
    }

    res.json(item);
});

router.post("/api/v1/items", writeLimiter, (req, res) => {
    if (!req.body.name) {
        return res.status(400).json({ message: "Item name is required" });
    }

    res.status(201).json(addItem(req.body.name, req.body.category));
});

router.post("/api/v1/items/bulk", writeLimiter, (req, res) => {
    const seeded = seedItems(req.body.count);

    res.status(201).json({
        message: "Items seeded",
        count: seeded.length,
        totalItems: listItems().length,
    });
});

router.delete("/api/v1/items/:id", (req, res) => {
    if (!deleteItem(req.params.id)) {
        return res.status(404).json({ message: "Item not found" });
    }

    res.json({ message: "Item deleted" });
});

module.exports = router;
