const adminRoutes = require("./adminRoutes");
const cacheRoutes = require("./cacheRoutes");
const debugRoutes = require("./debugRoutes");
const healthRoutes = require("./healthRoutes");
const itemRoutes = require("./itemRoutes");
const orderRoutes = require("./orderRoutes");
const rootRoutes = require("./rootRoutes");
const streamRoutes = require("./streamRoutes");
const syntheticRoutes = require("./syntheticRoutes");

function registerRoutes(app) {
    app.use(rootRoutes);
    app.use(healthRoutes);
    app.use(debugRoutes);
    app.use(syntheticRoutes);
    app.use(cacheRoutes);
    app.use(itemRoutes);
    app.use(orderRoutes);
    app.use(adminRoutes);
    app.use(streamRoutes);
}

module.exports = { registerRoutes };
