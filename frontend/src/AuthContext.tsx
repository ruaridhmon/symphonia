import { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { ApiError, isCfAccessRedirect, clearAuthAndRedirect } from './api/client';
import { login as apiLogin, logout as apiLogout, getMe } from './api/auth';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type UserRoleType = 'expert' | 'facilitator' | 'platform_admin';

export interface User {
  email: string;
}

interface AuthContextType {
  token: string | null;
  user: User | null;
  isAdmin: boolean;
  isFacilitator: boolean;
  role: UserRoleType;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

/** Keys that belong to the auth system — only these are cleared on logout. */
const AUTH_STORAGE_KEYS = ['access_token', 'is_admin', 'email', 'role'] as const;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Check if a named cookie exists (doesn't need to read httpOnly ones). */
function hasCookie(name: string): boolean {
  return document.cookie.split('; ').some((c) => c.startsWith(`${name}=`));
}

/** Derive role from stored data, handling backward compat with old tokens. */
function deriveRole(): UserRoleType {
  const stored = localStorage.getItem('role');
  if (stored === 'platform_admin' || stored === 'facilitator' || stored === 'expert') {
    return stored;
  }
  // Backward compat: old tokens without role claim
  return localStorage.getItem('is_admin') === 'true' ? 'platform_admin' : 'expert';
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  // Derive initial "logged in" from either legacy localStorage token OR csrf cookie presence
  const [token, setToken] = useState<string | null>(() =>
    localStorage.getItem('access_token') || (hasCookie('csrf_token') ? '__cookie__' : null),
  );
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(() => localStorage.getItem('is_admin') === 'true');
  const [role, setRole] = useState<UserRoleType>(deriveRole);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const isFacilitator = role === 'facilitator' || role === 'platform_admin';

  // On mount, try to restore session from cookie by calling /me
  useEffect(() => {
    const restore = async () => {
      // If we have a cookie-based session, validate it by calling /me
      if (hasCookie('csrf_token') && !localStorage.getItem('access_token')) {
        try {
          const me = await getMe();
          setUser({ email: me.email });
          setIsAdmin(me.is_admin ?? false);
          const meRole: UserRoleType = (me as any).role || (me.is_admin ? 'platform_admin' : 'expert');
          setRole(meRole);
          setToken('__cookie__');
          // Sync localStorage for components that read it directly
          localStorage.setItem('email', me.email);
          localStorage.setItem('is_admin', me.is_admin ? 'true' : 'false');
          localStorage.setItem('role', meRole);
        } catch (err) {
          // Cookie expired or invalid — clear and redirect if we had a session
          const hadSession = hasCookie('csrf_token');
          setToken(null);
          setUser(null);
          setIsAdmin(false);
          setRole('expert');
          if (hadSession) {
            clearAuthAndRedirect();
          }
        }
      } else if (token && token !== '__cookie__') {
        // Legacy localStorage token path — validate with a manual redirect-detecting fetch
        try {
          const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '';
          const res = await fetch(`${API_BASE_URL}/me`, {
            credentials: 'include',
            redirect: 'manual',
            headers: {
              ...(localStorage.getItem('access_token')
                ? { Authorization: `Bearer ${localStorage.getItem('access_token')}` }
                : {}),
            },
          });
          // Opaque redirect or CF Access redirect = session expired
          if (isCfAccessRedirect(res) || res.status === 401) {
            clearAuthAndRedirect();
            return;
          }
          // If ok, update state from response
          if (res.ok) {
            try {
              const me = await res.json();
              setUser({ email: me.email });
              setIsAdmin(me.is_admin ?? false);
              const meRole: UserRoleType = me.role || (me.is_admin ? 'platform_admin' : 'expert');
              setRole(meRole);
              localStorage.setItem('email', me.email);
              localStorage.setItem('is_admin', me.is_admin ? 'true' : 'false');
              localStorage.setItem('role', meRole);
            } catch {
              // Non-JSON response (possible CF page) — treat as expiry
              clearAuthAndRedirect();
              return;
            }
          }
        } catch {
          // Network error during restore — keep existing localStorage state
          setIsAdmin(localStorage.getItem('is_admin') === 'true');
          setRole(deriveRole());
          const storedEmail = localStorage.getItem('email');
          if (storedEmail) setUser({ email: storedEmail });
        }
      }
      setIsLoading(false);
    };
    restore();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Proactive session validation — detect expiry while idle
  useEffect(() => {
    if (!token) return;

    const CHECK_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

    const intervalId = setInterval(async () => {
      try {
        const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '';
        const bearerToken = localStorage.getItem('access_token');
        const res = await fetch(`${API_BASE_URL}/me`, {
          credentials: 'include',
          redirect: 'manual',
          headers: {
            ...(bearerToken ? { Authorization: `Bearer ${bearerToken}` } : {}),
          },
        });

        if (isCfAccessRedirect(res)) {
          clearAuthAndRedirect();
          return;
        }

        if (res.status === 401 || res.status === 403) {
          clearAuthAndRedirect();
          return;
        }

        if (res.status >= 300 && res.status < 400) {
          const location = res.headers.get('location') || '';
          if (
            location.includes('cloudflareaccess.com') ||
            location.includes('cdn-cgi/access') ||
            location.includes('/login')
          ) {
            clearAuthAndRedirect();
            return;
          }
        }

        if (res.ok) {
          try {
            await res.json();
          } catch {
            clearAuthAndRedirect();
          }
        }
      } catch {
        // Network error during poll — transient, don't logout
      }
    }, CHECK_INTERVAL_MS);

    return () => clearInterval(intervalId);
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  const login = async (email: string, password: string) => {
    let data;
    try {
      data = await apiLogin(email, password);
    } catch (e) {
      if (e instanceof ApiError) {
        if (e.status === 401 || e.status === 403) throw new Error('Invalid email or password.');
        if (e.status >= 500) throw new Error('Server error — please try again later.');
        throw new Error('Login failed. Please try again.');
      }
      throw new Error('Unable to reach the server. Please check your connection.');
    }

    // Store non-sensitive metadata in localStorage (for UI state)
    localStorage.setItem('is_admin', data.is_admin ? 'true' : 'false');
    localStorage.setItem('email', data.email || email);
    const loginRole: UserRoleType = (data as any).role || (data.is_admin ? 'platform_admin' : 'expert');
    localStorage.setItem('role', loginRole);

    // JWT is now in httpOnly cookie — use sentinel value
    // Keep backward compat: also store token for any code that reads it
    localStorage.setItem('access_token', data.access_token);

    setToken(data.access_token);
    setIsAdmin(data.is_admin);
    setRole(loginRole);
    setUser({ email: data.email || email });

    // Handle pending magic-link join code (stored by JoinPage before redirect to register/login)
    const pendingCode = sessionStorage.getItem('pending_join_code');
    if (pendingCode) {
      sessionStorage.removeItem('pending_join_code');
      // Fire-and-forget join — the dashboard will show the form
      import('./api/forms').then(({ joinForm }) => joinForm(pendingCode)).catch(() => {});
    }
  };

  const logout = () => {
    apiLogout().catch(() => { /* best effort */ });

    for (const key of AUTH_STORAGE_KEYS) {
      localStorage.removeItem(key);
    }
    setToken(null);
    setUser(null);
    setIsAdmin(false);
    setRole('expert');
  };

  return (
    <AuthContext.Provider value={{ token, user, isAdmin, isFacilitator, role, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
