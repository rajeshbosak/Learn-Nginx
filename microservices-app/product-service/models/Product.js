const mongoose = require("mongoose");

const productSchema = new mongoose.Schema({
    userId: String,
    name: String,
    description: String
});

module.exports = mongoose.model("Product", productSchema);
