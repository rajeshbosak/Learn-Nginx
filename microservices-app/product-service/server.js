require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const Product = require("./models/Product");

mongoose.connect(process.env.MONGO_URI);

const app = express();
app.use(cors());
app.use(express.json());

app.post("/products", async (req, res) => {
    const userId = req.headers["x-user-id"];
    const product = await Product.create({ userId, ...req.body });
    res.json(product);
});

app.get("/products", async (req, res) => {
    const userId = req.headers["x-user-id"];
    const products = await Product.find({ userId });
    res.json(products);
});

app.delete("/products/:id", async (req, res) => {
    await Product.deleteOne({ _id: req.params.id });
    res.json({ message: "Deleted" });
});

app.listen(process.env.PORT);
