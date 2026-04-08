// In local Docker production, nginx proxies /api/* to the backend.
// In split-domain production, set VITE_API_BASE_URL to the API host.
// In local Vite dev, VITE_API_BASE_URL should point to the backend host.
export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '/api').trim()
