const crypto = require("crypto");

let profilesCollectionPromise;

function toSelector(query) {
    return Object.fromEntries(
        Object.entries(query).map(([key, value]) => [key, { $eq: value }])
    );
}

function cleanProfile(data) {
    return Object.fromEntries(
        Object.entries(data).filter(([, value]) => value !== undefined)
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

async function getProfilesCollection() {
    if (!profilesCollectionPromise) {
        profilesCollectionPromise = (async () => {
            const { createRxDatabase } = await import("rxdb");
            const { getRxStorageMemory } = await import("rxdb/plugins/storage-memory");

            const db = await createRxDatabase({
                name: "userservicememory",
                storage: getRxStorageMemory(),
                multiInstance: false,
            });

            await db.addCollections({
                profiles: {
                    schema: {
                        version: 0,
                        primaryKey: "_id",
                        type: "object",
                        properties: {
                            _id: { type: "string", maxLength: 100 },
                            userId: { type: "string" },
                            name: { type: "string" },
                            age: { type: "number" },
                            bio: { type: "string" },
                            updatedAt: { type: "string" },
                        },
                        required: ["_id", "userId", "updatedAt"],
                    },
                },
            });

            return db.profiles;
        })();
    }

    return profilesCollectionPromise;
}

module.exports = {
    async findOne(query) {
        const profiles = await getProfilesCollection();
        const doc = await profiles.findOne({ selector: toSelector(query) }).exec();
        return toPlain(doc);
    },

    async findOneAndUpdate(query, update, options = {}) {
        const profiles = await getProfilesCollection();
        const existing = await profiles.findOne({ selector: toSelector(query) }).exec();

        if (!existing && !options.upsert) {
            return null;
        }

        if (existing) {
            const beforeUpdate = toPlain(existing);
            const patch = cleanProfile({
                ...update,
                updatedAt: new Date().toISOString(),
            });

            await existing.patch(patch);
            return options.new ? { ...beforeUpdate, ...patch } : beforeUpdate;
        }

        const profile = cleanProfile({
            _id: crypto.randomUUID(),
            ...query,
            ...update,
            updatedAt: new Date().toISOString(),
        });

        const inserted = await profiles.insert(profile);
        return options.new ? toPlain(inserted) : null;
    },
};
