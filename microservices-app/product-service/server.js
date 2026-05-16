require("dotenv").config();
const express = require("express");
const cors = require("cors");
const Product = require("./models/Product");

const app = express();
app.use(cors());
app.use(express.json());

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

app.post("/products", async (req, res) => {
    const userId = req.headers["x-user-id"] || "anonymous";
    const product = await Product.create({ userId, ...req.body });
    res.json(product);
});

app.get("/products", async (req, res) => {
    const userId = req.headers["x-user-id"] || "anonymous";
    const products = await Product.find({ userId });
    res.json(products);
});

app.delete("/products/:id", async (req, res) => {
    await Product.deleteOne({ _id: req.params.id });
    res.json({ message: "Deleted" });
});

app.listen(process.env.PORT);
