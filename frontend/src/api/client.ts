// Default to Firebase Hosting proxy path in production.
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api';

/**
 * Read a cookie value by name.
 * Used to read the csrf_token cookie for double-submit CSRF protection.
 */
function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

async function apiClient<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  // Read CSRF token from cookie (set by backend on login)
  const csrfToken = getCookie('csrf_token');
  // Fallback: Bearer token from localStorage (backward compat with non-cookie sessions)
  const bearerToken = localStorage.getItem('access_token');

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    credentials: 'include', // Send httpOnly cookies automatically
    headers: {
      'Content-Type': 'application/json',
      ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
      ...(bearerToken ? { Authorization: `Bearer ${bearerToken}` } : {}),
      ...options.headers,
    },
  });

  if (!response.ok) {
    if (response.status === 401) {
      // Auth endpoints (/login, /register) return 401 for bad credentials — that is
      // NOT a session expiry. Skip the redirect so the caller (AuthContext) can catch
      // the ApiError and display "Invalid email or password." instead of bouncing the
      // user to the session-expired screen before they ever log in.
      // startsWith() handles query params, e.g. /login?next=/dashboard.
      const isAuthEndpoint =
        endpoint.startsWith('/login') || endpoint.startsWith('/register');
      if (!isAuthEndpoint) {
        // Session expired on an authenticated route — clear ALL local auth state and redirect
        localStorage.removeItem('access_token');
        localStorage.removeItem('email');
        localStorage.removeItem('is_admin');
        window.location.href = '/login?expired=1';
        throw new ApiError(401, 'Session expired. Please log in again.');
      }
      // Auth endpoint 401 falls through to the general error handler below,
      // which reads the backend error body and surfaces it to the caller.
    }
    throw new ApiError(response.status, await response.text(), response.headers);
  }

  return response.json();
}

export class ApiError extends Error {
  public headers: Headers;
  constructor(public status: number, message: string, headers?: Headers) {
    super(message);
    this.name = 'ApiError';
    this.headers = headers ?? new Headers();
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
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' } as Record<string, string>,
      body: new URLSearchParams(params).toString(),
    }),

  patch: <T>(endpoint: string, data: unknown) =>
    apiClient<T>(endpoint, { method: 'PATCH', body: JSON.stringify(data) }),
  put: <T>(endpoint: string, data: unknown) =>
    apiClient<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: <T>(endpoint: string) =>
    apiClient<T>(endpoint, { method: 'DELETE' }),
};
