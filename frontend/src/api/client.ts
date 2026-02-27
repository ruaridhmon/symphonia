// Backend routes are at root (no /api prefix)
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '';

/**
 * Read a cookie value by name.
 * Used to read the csrf_token cookie for double-submit CSRF protection.
 */
function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

/**
 * Detect whether a fetch response indicates a Cloudflare Access redirect.
 * CF Access intercepts expired sessions with a 302 to its auth page.
 * With redirect: 'follow' (default), the browser follows silently and we see:
 *   - response.redirected === true
 *   - response.url contains cloudflareaccess.com or cdn-cgi/access
 * With redirect: 'manual', we get an opaque redirect (type === 'opaqueredirect').
 */
function isCfAccessRedirect(response: Response): boolean {
  // Opaque redirect (when redirect: 'manual' is used)
  if (response.type === 'opaqueredirect') return true;

  // Followed redirect to CF Access login page
  if (response.redirected) {
    const url = response.url.toLowerCase();
    if (url.includes('cloudflareaccess.com') || url.includes('cdn-cgi/access')) {
      return true;
    }
  }

  return false;
}

/**
 * Clear all local auth state and redirect to the login page with an expiry flag.
 * Guards against multiple concurrent redirects.
 */
let _redirecting = false;
function clearAuthAndRedirect(): void {
  localStorage.removeItem('access_token');
  localStorage.removeItem('email');
  localStorage.removeItem('is_admin');
  // Also expire the JS-readable csrf_token cookie so the Login page
  // doesn't see it and bounce straight back to "/" before auth is confirmed.
  // (The httpOnly session_token cookie is cleared server-side via /logout or expiry.)
  document.cookie = 'csrf_token=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax';
  if (!_redirecting) {
    _redirecting = true;
    window.location.href = '/login?expired=1';
  }
}

async function apiClient<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  // Read CSRF token from cookie (set by backend on login)
  const csrfToken = getCookie('csrf_token');
  // Fallback: Bearer token from localStorage (backward compat with non-cookie sessions)
  const bearerToken = localStorage.getItem('access_token');

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      credentials: 'include', // Send httpOnly cookies automatically
      headers: {
        'Content-Type': 'application/json',
        ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
        ...(bearerToken ? { Authorization: `Bearer ${bearerToken}` } : {}),
        ...options.headers,
      },
    });
  } catch (err) {
    // Network error (offline, DNS failure, CORS block on opaque redirect, etc.)
    // If we had auth state, this might be a CF Access redirect manifesting as a TypeError
    if (err instanceof TypeError && (bearerToken || getCookie('csrf_token'))) {
      clearAuthAndRedirect();
      throw new ApiError(0, 'Network error — possible session expiry. Redirecting to login.');
    }
    throw new ApiError(0, err instanceof Error ? err.message : 'Network request failed');
  }

  // Detect Cloudflare Access redirect (session expired at the edge)
  if (isCfAccessRedirect(response)) {
    clearAuthAndRedirect();
    throw new ApiError(401, 'Session expired (CF Access). Please log in again.');
  }

  if (!response.ok) {
    if (response.status === 401) {
      // Session expired — clear ALL local auth state and redirect
      clearAuthAndRedirect();
      throw new ApiError(401, 'Session expired. Please log in again.');
    }

    // Safely read the error body — it might not be text
    let errorBody: string;
    try {
      errorBody = await response.text();
    } catch {
      errorBody = `HTTP ${response.status}`;
    }
    throw new ApiError(response.status, errorBody, response.headers);
  }

  // Safely parse JSON — response might be HTML (e.g., CF Access page that returned 200)
  try {
    return await response.json();
  } catch {
    // If the response is not JSON despite being "ok", it's likely a CF/proxy interception
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('text/html')) {
      // HTML response on an API endpoint = likely CF Access or proxy page
      clearAuthAndRedirect();
      throw new ApiError(401, 'Unexpected HTML response — possible session expiry.');
    }
    throw new ApiError(response.status, 'Invalid JSON response from server');
  }
}

export class ApiError extends Error {
  public headers: Headers;
  constructor(public status: number, message: string, headers?: Headers) {
    super(message);
    this.name = 'ApiError';
    this.headers = headers ?? new Headers();
  }
}

export { isCfAccessRedirect, clearAuthAndRedirect };

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
