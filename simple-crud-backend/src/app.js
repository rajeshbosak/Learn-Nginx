const cors = require("cors");
const express = require("express");
const { errorHandler } = require("./middleware/errorHandler");
const { requestContext } = require("./middleware/requestContext");
const { requestLogger } = require("./middleware/requestLogger");
const { registerRoutes } = require("./routes");

function createApp() {
    const app = express();

    app.use(cors());
    app.use(express.json());
    app.set("trust proxy", 1);

    app.use(requestContext);
    app.use(requestLogger);

    registerRoutes(app);

    app.use(errorHandler);

    return app;
}

module.exports = { createApp };
