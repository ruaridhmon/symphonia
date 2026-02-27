// In Docker production, nginx proxies /api/* to the backend.
// In local Vite dev, VITE_API_BASE_URL should point to the backend host.
export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '/api').trim()
