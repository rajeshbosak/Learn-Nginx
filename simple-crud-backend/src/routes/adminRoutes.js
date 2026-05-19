const express = require("express");
const { requireAdmin } = require("../middleware/admin");
const { resetDemoData } = require("../state/demoStore");

const router = express.Router();

router.post("/admin/reset", requireAdmin, (req, res) => {
    const reset = resetDemoData();

    res.json({
        message: "Demo data reset",
        ...reset,
    });
});

module.exports = router;
