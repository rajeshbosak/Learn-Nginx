require("dotenv").config();
const express = require("express");
const cors = require("cors");
const Profile = require("./models/Profile");

const app = express();
app.use(cors());
app.use(express.json());

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

app.get("/users/:id", async (req, res) => {
    const profile = await Profile.findOne({ userId: req.params.id });
    res.json(profile);
});

app.put("/users/:id", async (req, res) => {
    const userId = req.headers["x-user-id"] || req.params.id;
    const profile = await Profile.findOneAndUpdate(
        { userId },
        req.body,
        { upsert: true, new: true }
    );
    res.json(profile);
});

app.listen(process.env.PORT);
