const mongoose = require("mongoose");
const crypto = require("crypto");

const ProductSchema = new mongoose.Schema({
    userId: { type: String, default: "anonymous", index: true },
    name: { type: String, required: true },
    description: { type: String, default: "" },
    createdAt: { type: Date, default: Date.now },
});

const ProductModel = mongoose.models.Product || mongoose.model("Product", ProductSchema);

module.exports = {
    async create(data) {
        const product = await ProductModel.create({
            userId: data.userId || "anonymous",
            name: data.name || "Untitled product",
            description: data.description || "",
        });

        return { _id: product._id.toString(), userId: product.userId, name: product.name, description: product.description, createdAt: product.createdAt };
    },

    async find(query) {
        const q = {};
        if (query.userId) q.userId = query.userId;

        const docs = await ProductModel.find(q).lean();
        return docs.map(d => ({ _id: d._id.toString(), userId: d.userId, name: d.name, description: d.description, createdAt: d.createdAt }));
    },

    async deleteOne(query) {
        const q = {};
        if (query._id) q._id = query._id;
        if (query.userId) q.userId = query.userId;

        const res = await ProductModel.deleteOne(q);
        return { deletedCount: res.deletedCount || 0 };
    },
};
