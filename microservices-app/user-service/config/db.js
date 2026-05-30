const mongoose = require("mongoose");

const connectDB = async () => {
    const uri = process.env.MONGO_URI;
    if (!uri) {
        console.warn("MONGO_URI not set, skipping mongoose connect for user-service");
        return;
    }

    try {
        await mongoose.connect(uri, { autoIndex: true });
        console.log("User service connected to MongoDB");
    } catch (err) {
        console.error("User service failed to connect to MongoDB", err);
        process.exit(1);
    }
};

module.exports = connectDB;
