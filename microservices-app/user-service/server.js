require("dotenv").config();
const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const Profile = require("./models/Profile");

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
        service: "user-service",
        role: "Handles user profile requests",
        privateRoutes: ["GET /users/:id", "PUT /users/:id"],
        gatewayRoute: "/api/users/*",
    });
});

app.get("/health", (req, res) => {
    res.json({
        service: "user-service",
        status: "ok",
        timestamp: new Date().toISOString(),
    });
});

app.get("/users/:id", verifyToken, async (req, res) => {
    if (req.params.id !== req.user.id) {
        return res.status(403).json({ message: "Cannot access another user's profile" });
    }

    const profile = await Profile.findOne({ userId: req.params.id });
    res.json(profile);
});

app.put("/users/:id", verifyToken, async (req, res) => {
    if (req.params.id !== req.user.id) {
        return res.status(403).json({ message: "Cannot update another user's profile" });
    }

    const userId = req.user.id;
    const profile = await Profile.findOneAndUpdate(
        { userId },
        req.body,
        { upsert: true, new: true }
    );
    res.json(profile);
});

app.listen(process.env.PORT);
