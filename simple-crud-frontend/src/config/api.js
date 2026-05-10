// const HOST = import.meta.env.VITE_API_HOST;

const HOST = window.RUNTIME_CONFIG?.VITE_API_HOST || "";
const TIMEOUT = window.RUNTIME_CONFIG?.VITE_API_TIMEOUT || 30000;
const RETRY_COUNT = window.RUNTIME_CONFIG?.VITE_API_RETRY_COUNT || 3;

export const API_ENDPOINTS = {
    // Use endpoints from config if available, otherwise fallback to defaults
    GET_ALL_ITEMS: `${HOST}${window.RUNTIME_CONFIG?.ENDPOINTS?.ITEMS?.GET_ALL || '/items'}`,
    GET_ITEM_BY_ID: (id) => `${HOST}${window.RUNTIME_CONFIG?.ENDPOINTS?.ITEMS?.GET_BY_ID?.(id) || `/items/${id}`}`,
    CREATE_ITEM: `${HOST}${window.RUNTIME_CONFIG?.ENDPOINTS?.ITEMS?.CREATE || '/items'}`,
    DELETE_ITEM: (id) => `${HOST}${window.RUNTIME_CONFIG?.ENDPOINTS?.ITEMS?.DELETE?.(id) || `/items/${id}`}`,
};

export const API_CONFIG = {
    TIMEOUT,
    RETRY_COUNT,
    HOST
};
