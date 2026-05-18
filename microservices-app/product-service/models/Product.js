const crypto = require("crypto");

let productsCollectionPromise;

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

async function getProductsCollection() {
    if (!productsCollectionPromise) {
        productsCollectionPromise = (async () => {
            const { createRxDatabase } = await import("rxdb");
            const { getRxStorageMemory } = await import("rxdb/plugins/storage-memory");

            const db = await createRxDatabase({
                name: "productservicememory",
                storage: getRxStorageMemory(),
                multiInstance: false,
            });

            await db.addCollections({
                products: {
                    schema: {
                        version: 0,
                        primaryKey: "_id",
                        type: "object",
                        properties: {
                            _id: { type: "string", maxLength: 100 },
                            userId: { type: "string" },
                            name: { type: "string" },
                            description: { type: "string" },
                            createdAt: { type: "string" },
                        },
                        required: ["_id", "userId", "name", "description", "createdAt"],
                    },
                },
            });

            return db.products;
        })();
    }

    return productsCollectionPromise;
}

module.exports = {
    async create(data) {
        const products = await getProductsCollection();
        const product = {
            _id: crypto.randomUUID(),
            userId: data.userId || "anonymous",
            name: data.name || "Untitled product",
            description: data.description || "",
            createdAt: new Date().toISOString(),
        };

        const doc = await products.insert(product);
        return toPlain(doc);
    },

    async find(query) {
        const products = await getProductsCollection();
        const docs = await products.find({ selector: toSelector(query) }).exec();
        return docs.map(toPlain);
    },

    async deleteOne(query) {
        const products = await getProductsCollection();
        const product = await products.findOne({ selector: toSelector(query) }).exec();

        if (product) {
            await product.remove();
            return { deletedCount: 1 };
        }

        return { deletedCount: 0 };
    },
};
