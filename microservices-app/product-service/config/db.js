const mongoose = require("mongoose");

const connectDB = async () => {
    const uri = process.env.MONGO_URI;
    if (!uri) {
        console.warn("MONGO_URI not set, skipping mongoose connect for product-service");
        return;
    }

    try {
        await mongoose.connect(uri, { autoIndex: true });
        console.log("Product service connected to MongoDB");
    } catch (err) {
        console.error("Product service failed to connect to MongoDB", err);
        process.exit(1);
    }
};

module.exports = connectDB;
