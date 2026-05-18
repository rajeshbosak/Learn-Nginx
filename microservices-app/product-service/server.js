require("dotenv").config();
const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const Product = require("./models/Product");

const app = express();
app.use(cors());
app.use(express.json());

function verifyToken(req, res, next) {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
        return res.status(401).json({ message: "No token" });
    }

    try {
        req.user = jwt.verify(token, process.env.JWT_SECRET || "supersecretkey");
        next();
    } catch {
        res.status(403).json({ message: "Invalid token" });
    }
}

app.get("/", (req, res) => {
    res.json({
        service: "product-service",
        role: "Handles product catalog requests",
        privateRoutes: ["GET /products", "POST /products", "DELETE /products/:id"],
        gatewayRoute: "/api/products/*",
    });
});

app.get("/health", (req, res) => {
    res.json({
        service: "product-service",
        status: "ok",
        timestamp: new Date().toISOString(),
    });
});

app.post("/products", verifyToken, async (req, res) => {
    const product = await Product.create({ userId: req.user.id, ...req.body });
    res.json(product);
});

app.get("/products", verifyToken, async (req, res) => {
    const products = await Product.find({ userId: req.user.id });
    res.json(products);
});

app.delete("/products/:id", verifyToken, async (req, res) => {
    await Product.deleteOne({ _id: req.params.id, userId: req.user.id });
    res.json({ message: "Deleted" });
});

app.listen(process.env.PORT);
