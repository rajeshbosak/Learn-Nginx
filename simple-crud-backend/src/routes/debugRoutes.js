const express = require("express");

const router = express.Router();

router.get("/debug/headers", (req, res) => {
    res.json({
        ip: req.ip,
        ips: req.ips,
        protocol: req.protocol,
        host: req.get("host"),
        forwardedFor: req.get("x-forwarded-for"),
        forwardedProto: req.get("x-forwarded-proto"),
        realIp: req.get("x-real-ip"),
        headers: req.headers,
    });
});

router.get("/debug/request-id", (req, res) => {
    res.json({
        requestId: req.requestId,
        receivedRequestId: req.get("x-request-id") || null,
        responseHeader: "X-Request-ID",
    });
});

module.exports = router;
