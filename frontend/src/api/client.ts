// Backend routes are at root (no /api prefix)
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '';

async function apiClient<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = localStorage.getItem('access_token');

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (!response.ok) {
    if (response.status === 401) {
      // Token expired - clear auth and redirect to login with message
      localStorage.removeItem('access_token');
      localStorage.removeItem('email');
      window.location.href = '/login?expired=1';
      // Throw to stop further processing
      throw new ApiError(401, 'Session expired. Please log in again.');
    }
    throw new ApiError(response.status, await response.text());
  }

  return response.json();
}

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

export const api = {
  get: <T>(endpoint: string) =>
    apiClient<T>(endpoint),

  post: <T>(endpoint: string, data?: unknown) =>
    apiClient<T>(endpoint, {
      method: 'POST',
      body: data !== undefined ? JSON.stringify(data) : undefined,
    }),

  /** POST with URL-encoded form body (for endpoints that expect form data) */
  postForm: <T>(endpoint: string, params: Record<string, string>) =>
    apiClient<T>(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(params).toString(),
    }),

  put: <T>(endpoint: string, data: unknown) =>
    apiClient<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: <T>(endpoint: string) =>
    apiClient<T>(endpoint, { method: 'DELETE' }),
};
