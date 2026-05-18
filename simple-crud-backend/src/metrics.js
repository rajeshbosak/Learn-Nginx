const metrics = {
    requests: 0,
    responsesByStatus: {},
    responsesByRoute: {},
    totalDurationMs: 0,
    errors: 0,
};

function recordRequest() {
    metrics.requests += 1;
}

function recordResponse(path, statusCode, durationMs) {
    const statusGroup = `${Math.floor(statusCode / 100)}xx`;

    metrics.responsesByStatus[statusGroup] = (metrics.responsesByStatus[statusGroup] || 0) + 1;
    metrics.responsesByRoute[path] = (metrics.responsesByRoute[path] || 0) + 1;
    metrics.totalDurationMs += durationMs;

    if (statusCode >= 500) {
        metrics.errors += 1;
    }
}

function getAverageLatencyMs() {
    if (!metrics.requests) {
        return 0;
    }

    return Number((metrics.totalDurationMs / metrics.requests).toFixed(2));
}

function getMetricsSnapshot() {
    const memory = process.memoryUsage();

    return {
        uptimeSeconds: Math.floor(process.uptime()),
        requests: metrics.requests,
        errors: metrics.errors,
        averageLatencyMs: getAverageLatencyMs(),
        responsesByStatus: metrics.responsesByStatus,
        topRoutes: Object.entries(metrics.responsesByRoute)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([route, count]) => ({ route, count })),
        memory: {
            rssMb: Number((memory.rss / 1024 / 1024).toFixed(2)),
            heapUsedMb: Number((memory.heapUsed / 1024 / 1024).toFixed(2)),
            heapTotalMb: Number((memory.heapTotal / 1024 / 1024).toFixed(2)),
        },
    };
}

module.exports = {
    getAverageLatencyMs,
    getMetricsSnapshot,
    recordRequest,
    recordResponse,
};
