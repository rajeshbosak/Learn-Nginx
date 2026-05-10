require("dotenv").config();
const express = require("express");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const connectDB = require("./config/db");
const User = require("./models/User");

connectDB();

const app = express();
app.use(cors());
app.use(express.json());

app.post("/auth/register", async (req, res) => {
    const user = await User.create(req.body);
    res.json(user);
});

app.post("/auth/login", async (req, res) => {
    const user = await User.findOne(req.body);
    if (!user) return res.status(401).json({ message: "Invalid credentials" });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);
    res.json({ token });
});

app.listen(process.env.PORT);
