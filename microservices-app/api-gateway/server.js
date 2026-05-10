require("dotenv").config();
const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const axios = require("axios");

const app = express();
app.use(cors());
app.use(express.json());

const AUTH_SERVICE = "http://localhost:4001";
const USER_SERVICE = "http://localhost:4002";
const PRODUCT_SERVICE = "http://localhost:4003";

function verifyToken(req, res, next) {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ message: "No token" });

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch {
        res.status(403).json({ message: "Invalid token" });
    }
}


app.use("/api/auth", async (req, res) => {
    try {
        const response = await axios({
            method: req.method,
            url: `${AUTH_SERVICE}${req.originalUrl.replace("/api/auth", "/auth")}`,
            data: req.body,
        });
        res.json(response.data);
    } catch (err) {
        res.status(err.response?.status || 500).json(err.response?.data);
    }
});


app.use("/api/users", verifyToken, async (req, res) => {
    try {
        const response = await axios({
            method: req.method,
            url: `${USER_SERVICE}${req.originalUrl.replace("/api/users", "/users")}`,
            data: req.body,
            headers: { "x-user-id": req.user.id },
        });
        res.json(response.data);
    } catch (err) {
        res.status(err.response?.status || 500).json(err.response?.data);
    }
});


app.use("/api/products", verifyToken, async (req, res) => {
    try {
        const response = await axios({
            method: req.method,
            url: `${PRODUCT_SERVICE}${req.originalUrl.replace("/api/products", "/products")}`,
            data: req.body,
            headers: { "x-user-id": req.user.id },
        });
        res.json(response.data);
    } catch (err) {
        res.status(err.response?.status || 500).json(err.response?.data);
    }
});

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => console.log(`API Gateway running on ${PORT}`));
