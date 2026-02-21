import { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { API_BASE_URL } from './config';

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
// Context
// ---------------------------------------------------------------------------

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('access_token'));
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(() => localStorage.getItem('is_admin') === 'true');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    if (token) {
      setIsAdmin(localStorage.getItem('is_admin') === 'true');
      const storedEmail = localStorage.getItem('email');
      if (storedEmail) setUser({ email: storedEmail });
    }
    setIsLoading(false);
  }, [token]);

  const login = async (email: string, password: string) => {
    let res: Response;
    try {
      res = await fetch(`${API_BASE_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ username: email, password }),
      });
    } catch {
      throw new Error('Unable to reach the server. Please check your connection.');
    }

    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        throw new Error('Invalid email or password.');
      }
      if (res.status >= 500) {
        throw new Error('Server error — please try again later.');
      }
      throw new Error('Login failed. Please try again.');
    }

    const data = await res.json();
    localStorage.setItem('access_token', data.access_token);
    localStorage.setItem('is_admin', data.is_admin ? 'true' : 'false');
    localStorage.setItem('email', data.email || email);

    setToken(data.access_token);
    setIsAdmin(data.is_admin);
    setUser({ email: data.email || email });
  };

  const logout = () => {
    // Only clear auth-related keys — preserve theme, drafts, etc.
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
