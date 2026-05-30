const mongoose = require("mongoose");

const ProfileSchema = new mongoose.Schema({
    userId: { type: String, required: true, index: true },
    name: { type: String },
    age: { type: Number },
    bio: { type: String },
    updatedAt: { type: Date, default: Date.now },
});

const ProfileModel = mongoose.models.Profile || mongoose.model("Profile", ProfileSchema);

module.exports = {
    async findOne(query) {
        const q = {};
        if (query.userId) q.userId = query.userId;
        if (query._id) q._id = query._id;

        const doc = await ProfileModel.findOne(q).lean();
        if (!doc) return null;
        return { _id: doc._id.toString(), userId: doc.userId, name: doc.name, age: doc.age, bio: doc.bio, updatedAt: doc.updatedAt };
    },

    async findOneAndUpdate(query, update, options = {}) {
        const q = { userId: query.userId };
        const opts = { new: !!options.new, upsert: !!options.upsert };
        const updated = await ProfileModel.findOneAndUpdate(q, { ...update, updatedAt: new Date() }, opts).lean();
        if (!updated) return null;
        return { _id: updated._id.toString(), userId: updated.userId, name: updated.name, age: updated.age, bio: updated.bio, updatedAt: updated.updatedAt };
    },
};
