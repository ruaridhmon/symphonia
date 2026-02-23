import { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { ApiError } from './api/client';
import { login as apiLogin, logout as apiLogout, getMe } from './api/auth';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface User {
  email: string;
}

interface AuthContextType {
  token: string | null;
  user: User | null;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

/** Keys that belong to the auth system — only these are cleared on logout. */
const AUTH_STORAGE_KEYS = ['access_token', 'is_admin', 'email'] as const;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Check if a named cookie exists (doesn't need to read httpOnly ones). */
function hasCookie(name: string): boolean {
  return document.cookie.split('; ').some((c) => c.startsWith(`${name}=`));
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
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // On mount, try to restore session from cookie by calling /me
  useEffect(() => {
    const restore = async () => {
      // If we have a cookie-based session, validate it by calling /me
      if (hasCookie('csrf_token') && !localStorage.getItem('access_token')) {
        try {
          const me = await getMe();
          setUser({ email: me.email });
          setIsAdmin(me.is_admin ?? false);
          setToken('__cookie__');
          // Sync localStorage for components that read it directly
          localStorage.setItem('email', me.email);
          localStorage.setItem('is_admin', me.is_admin ? 'true' : 'false');
        } catch {
          // Cookie expired or invalid — clear and redirect if we had a session
          const hadSession = hasCookie('csrf_token');
          setToken(null);
          setUser(null);
          setIsAdmin(false);
          if (hadSession) {
            window.location.href = '/login?expired=1';
          }
        }
      } else if (token && token !== '__cookie__') {
        // Legacy localStorage token path
        setIsAdmin(localStorage.getItem('is_admin') === 'true');
        const storedEmail = localStorage.getItem('email');
        if (storedEmail) setUser({ email: storedEmail });
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
        await getMe();
      } catch {
        // client.ts 401 handler will redirect to /login?expired=1
        // Call logout() as safety net to clear local state
        logout();
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

    // JWT is now in httpOnly cookie — use sentinel value
    // Keep backward compat: also store token for any code that reads it
    localStorage.setItem('access_token', data.access_token);

    setToken(data.access_token);
    setIsAdmin(data.is_admin);
    setUser({ email: data.email || email });
  };

  const logout = () => {
    // Call backend to clear httpOnly cookies
    apiLogout().catch(() => { /* best effort */ });

    // Clear local state
    for (const key of AUTH_STORAGE_KEYS) {
      localStorage.removeItem(key);
    }
    setToken(null);
    setUser(null);
    setIsAdmin(false);
  };

  return (
    <AuthContext.Provider value={{ token, user, isAdmin, login, logout, isLoading }}>
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
