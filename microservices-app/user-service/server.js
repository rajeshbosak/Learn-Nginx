require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const Profile = require("./models/Profile");

mongoose.connect(process.env.MONGO_URI);

const app = express();
app.use(cors());
app.use(express.json());

app.get("/users/:id", async (req, res) => {
    const profile = await Profile.findOne({ userId: req.params.id });
    res.json(profile);
});

app.put("/users/:id", async (req, res) => {
    const userId = req.headers["x-user-id"];
    const profile = await Profile.findOneAndUpdate(
        { userId },
        req.body,
        { upsert: true, new: true }
    );
    res.json(profile);
});

app.listen(process.env.PORT);
