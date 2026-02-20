import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ThemeId = 'axiotic-dark' | 'axiotic-light' | 'apple';

export type ThemeType = 'dark' | 'light';

export interface ThemeColors {
  background: string;
  foreground: string;
  card: string;
  'card-foreground': string;
  'card-shadow': string;
  secondary: string;
  'secondary-foreground': string;
  muted: string;
  'muted-foreground': string;
  accent: string;
  'accent-foreground': string;
  'accent-hover': string;
  destructive: string;
  'destructive-foreground': string;
  success: string;
  border: string;
  input: string;
  ring: string;
  radius: string;
  'font-family': string;
}

export interface Theme {
  id: ThemeId;
  name: string;
  description: string;
  type: ThemeType;
  colors: ThemeColors;
}

// ---------------------------------------------------------------------------
// Theme Definitions
// ---------------------------------------------------------------------------

export const themes: Record<ThemeId, Theme> = {
  'axiotic-dark': {
    id: 'axiotic-dark',
    name: 'Axiotic Dark',
    description: 'The signature Slate-950 and Amber-400 brand identity.',
    type: 'dark',
    colors: {
      background: '#020617',
      foreground: '#f8fafc',
      card: '#0f172a',
      'card-foreground': '#f8fafc',
      'card-shadow': 'none',
      secondary: '#1e293b',
      'secondary-foreground': '#f8fafc',
      muted: '#1e293b',
      'muted-foreground': '#94a3b8',
      accent: '#fbbf24',
      'accent-foreground': '#0f172a',
      'accent-hover': '#f59e0b',
      destructive: '#ef4444',
      'destructive-foreground': '#ffffff',
      success: '#22c55e',
      border: 'rgba(148,163,184,0.1)',
      input: 'rgba(148,163,184,0.1)',
      ring: '#fbbf24',
      radius: '0.75rem',
      'font-family': "'Inter', sans-serif",
    },
  },
  'axiotic-light': {
    id: 'axiotic-light',
    name: 'Axiotic Light',
    description: 'Clean Slate-50 background with refined Deep Gold accents.',
    type: 'light',
    colors: {
      background: '#f8fafc',
      foreground: '#0f172a',
      card: '#ffffff',
      'card-foreground': '#0f172a',
      'card-shadow': 'none',
      secondary: '#e2e8f0',
      'secondary-foreground': '#0f172a',
      muted: '#f1f5f9',
      'muted-foreground': '#64748b',
      accent: '#d97706',
      'accent-foreground': '#ffffff',
      'accent-hover': '#b45309',
      destructive: '#d4183d',
      'destructive-foreground': '#ffffff',
      success: '#16a34a',
      border: 'rgba(30,41,59,0.1)',
      input: 'rgba(30,41,59,0.1)',
      ring: '#d97706',
      radius: '0.75rem',
      'font-family': "'Inter', sans-serif",
    },
  },
  apple: {
    id: 'apple',
    name: 'Apple / Government',
    description: 'Clean, trustworthy design inspired by Apple HIG — ideal for government deployments.',
    type: 'light',
    colors: {
      background: '#ffffff',
      foreground: '#1d1d1f',
      card: '#ffffff',
      'card-foreground': '#1d1d1f',
      'card-shadow': '0 1px 3px rgba(0,0,0,0.08)',
      secondary: '#f5f5f7',
      'secondary-foreground': '#1d1d1f',
      muted: '#f5f5f7',
      'muted-foreground': '#86868b',
      accent: '#0071e3',
      'accent-foreground': '#ffffff',
      'accent-hover': '#0077ED',
      destructive: '#ff3b30',
      'destructive-foreground': '#ffffff',
      success: '#34c759',
      border: 'rgba(0,0,0,0.04)',
      input: 'rgba(0,0,0,0.06)',
      ring: '#0071e3',
      radius: '12px',
      'font-family':
        "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', system-ui, sans-serif",
    },
  },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const STORAGE_KEY = 'symphonia-theme';
const DEFAULT_THEME: ThemeId = 'axiotic-dark';

/** All valid theme IDs for runtime validation */
const VALID_THEME_IDS = new Set<string>(Object.keys(themes));

function isValidThemeId(id: string): id is ThemeId {
  return VALID_THEME_IDS.has(id);
}

function getStoredTheme(): ThemeId {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && isValidThemeId(stored)) return stored;
  } catch {
    // localStorage may be unavailable (SSR, private browsing, etc.)
  }
  return DEFAULT_THEME;
}

function applyTheme(themeId: ThemeId) {
  const theme = themes[themeId];
  if (!theme) return;

  const root = document.documentElement;

  // Set data-theme attribute
  root.setAttribute('data-theme', themeId);

  // Apply CSS custom properties
  for (const [key, value] of Object.entries(theme.colors)) {
    root.style.setProperty(`--${key}`, value);
  }

  // Handle dark/light class for Tailwind compatibility
  if (theme.type === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

interface ThemeContextValue {
  /** Current active theme ID */
  themeId: ThemeId;
  /** Full theme object */
  theme: Theme;
  /** Switch to a different theme */
  setTheme: (id: ThemeId) => void;
  /** List of all available themes */
  availableThemes: Theme[];
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeId, setThemeIdState] = useState<ThemeId>(getStoredTheme);

  const setTheme = useCallback((id: ThemeId) => {
    setThemeIdState(id);
    try {
      localStorage.setItem(STORAGE_KEY, id);
    } catch {
      // Silently fail if localStorage is unavailable
    }
    applyTheme(id);
  }, []);

  // Apply theme on mount and when themeId changes
  useEffect(() => {
    applyTheme(themeId);
  }, [themeId]);

  const value: ThemeContextValue = {
    themeId,
    theme: themes[themeId],
    setTheme,
    availableThemes: Object.values(themes),
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a <ThemeProvider>');
  }
  return context;
}
