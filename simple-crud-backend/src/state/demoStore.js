const crypto = require("crypto");

const idempotencyStore = new Map();

function createItem(name, category = "general") {
    return {
        id: Date.now() + Math.floor(Math.random() * 100000),
        name,
        category,
        createdAt: new Date().toISOString(),
    };
}

function getInitialItems() {
    return [
        { id: 1, name: "Item One", category: "general", createdAt: new Date().toISOString() },
        { id: 2, name: "Item Two", category: "general", createdAt: new Date().toISOString() },
    ];
}

let items = getInitialItems();
let orders = [];

function listItems() {
    return items;
}

function findItem(id) {
    return items.find(item => item.id === Number(id));
}

function addItem(name, category) {
    const item = createItem(name, category);
    items.push(item);
    return item;
}

function deleteItem(id) {
    const itemId = Number(id);
    const exists = items.some(item => item.id === itemId);

    if (exists) {
        items = items.filter(item => item.id !== itemId);
    }

    return exists;
}

function searchItems({ page, limit, q, category }) {
    const safePage = Math.max(Number.parseInt(page, 10) || 1, 1);
    const safeLimit = Math.min(Math.max(Number.parseInt(limit, 10) || 10, 1), 100);
    const textFilter = (q || "").toString().toLowerCase();
    const categoryFilter = (category || "").toString().toLowerCase();
    const filteredItems = items.filter(item => {
        const matchesText = !textFilter || item.name.toLowerCase().includes(textFilter);
        const matchesCategory = !categoryFilter || item.category.toLowerCase() === categoryFilter;

        return matchesText && matchesCategory;
    });
    const start = (safePage - 1) * safeLimit;

    return {
        data: filteredItems.slice(start, start + safeLimit),
        pagination: {
            page: safePage,
            limit: safeLimit,
            total: filteredItems.length,
            totalPages: Math.ceil(filteredItems.length / safeLimit),
        },
        filters: {
            q: textFilter,
            category: categoryFilter,
        },
    };
}

function seedItems(count) {
    const categories = ["proxy", "cache", "rate-limit", "observability", "load-test"];
    const safeCount = Math.min(Math.max(Number.parseInt(count, 10) || 10, 1), 1000);
    const seeded = [];

    for (let index = 0; index < safeCount; index += 1) {
        seeded.push(createItem(
            `Learning item ${items.length + index + 1}`,
            categories[index % categories.length]
        ));
    }

    items.push(...seeded);
    return seeded;
}

function resetDemoData() {
    items = getInitialItems();
    orders = [];
    idempotencyStore.clear();

    return {
        items: items.length,
        orders: orders.length,
    };
}

function createOrder({ idempotencyKey, itemName, quantity }) {
    if (idempotencyStore.has(idempotencyKey)) {
        return {
            replayed: true,
            order: idempotencyStore.get(idempotencyKey),
        };
    }

    const order = {
        id: crypto.randomUUID(),
        itemName: itemName || "Nginx practice order",
        quantity: Math.max(Number.parseInt(quantity, 10) || 1, 1),
        createdAt: new Date().toISOString(),
    };

    orders.push(order);
    idempotencyStore.set(idempotencyKey, order);

    return {
        replayed: false,
        order,
    };
}

function listOrders() {
    return {
        data: orders,
        total: orders.length,
    };
}

module.exports = {
    addItem,
    createOrder,
    deleteItem,
    findItem,
    listItems,
    listOrders,
    resetDemoData,
    searchItems,
    seedItems,
};
