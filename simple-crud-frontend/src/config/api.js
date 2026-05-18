const HOST = window.RUNTIME_CONFIG?.VITE_API_HOST || import.meta.env.VITE_API_HOST || "";
const TIMEOUT = window.RUNTIME_CONFIG?.VITE_API_TIMEOUT || 30000;
const RETRY_COUNT = window.RUNTIME_CONFIG?.VITE_API_RETRY_COUNT || 3;

export const API_ENDPOINTS = {
    // Use endpoints from config if available, otherwise fallback to defaults
    GET_ALL_ITEMS: `${HOST}${window.RUNTIME_CONFIG?.ENDPOINTS?.ITEMS?.GET_ALL || '/items'}`,
    GET_ITEM_BY_ID: (id) => `${HOST}${window.RUNTIME_CONFIG?.ENDPOINTS?.ITEMS?.GET_BY_ID?.(id) || `/items/${id}`}`,
    CREATE_ITEM: `${HOST}${window.RUNTIME_CONFIG?.ENDPOINTS?.ITEMS?.CREATE || '/items'}`,
    DELETE_ITEM: (id) => `${HOST}${window.RUNTIME_CONFIG?.ENDPOINTS?.ITEMS?.DELETE?.(id) || `/items/${id}`}`,
    HEALTH: `${HOST}/health`,
    READY: `${HOST}/ready`,
    METRICS: `${HOST}/metrics`,
    HEADERS: `${HOST}/debug/headers`,
    SLOW: (ms) => `${HOST}/slow?ms=${ms}`,
    UNSTABLE: (failRate) => `${HOST}/unstable?failRate=${failRate}`,
    STATUS: (code) => `${HOST}/status/${code}`,
    PAYLOAD: (kb) => `${HOST}/payload?kb=${kb}`,
    CPU: (ms) => `${HOST}/cpu?ms=${ms}`,
    CACHE_PRODUCTS: `${HOST}/cache/products`,
    PAGINATED_ITEMS: (page, limit, q, category) => {
        const params = new URLSearchParams({
            page,
            limit,
        });

        if (q) params.set("q", q);
        if (category) params.set("category", category);

        return `${HOST}/api/v1/items?${params.toString()}`;
    },
    BULK_ITEMS: `${HOST}/api/v1/items/bulk`,
    ORDERS: `${HOST}/api/v1/orders`,
    REQUEST_ID: `${HOST}/debug/request-id`,
    ADMIN_RESET: `${HOST}/admin/reset`,
    EVENTS: (count = 10, intervalMs = 1000) => `${HOST}/stream/events?count=${count}&intervalMs=${intervalMs}`,
    GATEWAY_HEALTH: `${HOST}/gateway/health`,
    GATEWAY_AUTH_REGISTER: `${HOST}/api/auth/register`,
    GATEWAY_AUTH_LOGIN: `${HOST}/api/auth/login`,
    GATEWAY_USER_PROFILE: (id) => `${HOST}/api/users/${id}`,
    GATEWAY_PRODUCTS: `${HOST}/api/products`,
    GATEWAY_PRODUCT_BY_ID: (id) => `${HOST}/api/products/${id}`,
};

export const API_CONFIG = {
    TIMEOUT,
    RETRY_COUNT,
    HOST
};
