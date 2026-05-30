const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
});

const UserModel = mongoose.models.User || mongoose.model("User", UserSchema);

module.exports = {
    async create(data) {
        const user = await UserModel.create({
            email: data.email,
            password: data.password,
        });
        return { _id: user._id.toString(), email: user.email, createdAt: user.createdAt };
    },

    async findOne(query) {
        const q = {};
        if (query.email) q.email = query.email;
        if (query._id) q._id = query._id;

        const user = await UserModel.findOne(q).lean();
        if (!user) return null;
        return { _id: user._id.toString(), email: user.email, createdAt: user.createdAt };
    },
};
