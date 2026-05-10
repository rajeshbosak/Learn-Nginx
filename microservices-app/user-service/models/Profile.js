const mongoose = require("mongoose");

const profileSchema = new mongoose.Schema({
    userId: String,
    name: String,
    age: Number,
    bio: String
});

module.exports = mongoose.model("Profile", profileSchema);
