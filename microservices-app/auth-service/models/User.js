const crypto = require("crypto");

let usersCollectionPromise;

function toSelector(query) {
    return Object.fromEntries(
        Object.entries(query).map(([key, value]) => [key, { $eq: value }])
    );
}

function toPlain(doc) {
    if (!doc) return null;

    const data = doc.toJSON();
    delete data._rev;
    delete data._meta;
    delete data._deleted;
    return data;
}

async function getUsersCollection() {
    if (!usersCollectionPromise) {
        usersCollectionPromise = (async () => {
            const { createRxDatabase } = await import("rxdb");
            const { getRxStorageMemory } = await import("rxdb/plugins/storage-memory");

            const db = await createRxDatabase({
                name: "authservicememory",
                storage: getRxStorageMemory(),
                multiInstance: false,
            });

            await db.addCollections({
                users: {
                    schema: {
                        version: 0,
                        primaryKey: "_id",
                        type: "object",
                        properties: {
                            _id: { type: "string", maxLength: 100 },
                            email: { type: "string" },
                            password: { type: "string" },
                            createdAt: { type: "string" },
                        },
                        required: ["_id", "email", "password", "createdAt"],
                    },
                },
            });

            return db.users;
        })();
    }

    return usersCollectionPromise;
}

module.exports = {
    async create(data) {
        const users = await getUsersCollection();
        const user = {
            _id: crypto.randomUUID(),
            email: data.email,
            password: data.password,
            createdAt: new Date().toISOString(),
        };

        const doc = await users.insert(user);
        return toPlain(doc);
    },

    async findOne(query) {
        const users = await getUsersCollection();
        const doc = await users.findOne({ selector: toSelector(query) }).exec();
        return toPlain(doc);
    },
};
