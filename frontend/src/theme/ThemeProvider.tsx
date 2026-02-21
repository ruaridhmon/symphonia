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
  'card-shadow-lg': string;
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
  highlight: string;
  'highlight-foreground': string;
  'highlight-border': string;
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
  'axiotic-light': {
    id: 'axiotic-light',
    name: 'Light',
    description: 'Clean and professional',
    type: 'light',
    colors: {
      background: '#f8fafc',
      foreground: '#0f172a',
      card: '#ffffff',
      'card-foreground': '#0f172a',
      'card-shadow': '0 1px 3px 0 rgba(0,0,0,0.06), 0 1px 2px -1px rgba(0,0,0,0.06)',
      'card-shadow-lg': '0 4px 6px -1px rgba(0,0,0,0.07), 0 2px 4px -2px rgba(0,0,0,0.05)',
      secondary: '#f1f5f9',
      'secondary-foreground': '#0f172a',
      muted: '#f1f5f9',
      'muted-foreground': '#64748b',
      accent: '#2563eb',
      'accent-foreground': '#ffffff',
      'accent-hover': '#1d4ed8',
      destructive: '#dc2626',
      'destructive-foreground': '#ffffff',
      success: '#16a34a',
      highlight: '#eff6ff',
      'highlight-foreground': '#1e40af',
      'highlight-border': '#bfdbfe',
      border: '#e2e8f0',
      input: '#e2e8f0',
      ring: '#2563eb',
      radius: '0.5rem',
      'font-family': "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    },
  },
  'axiotic-dark': {
    id: 'axiotic-dark',
    name: 'Dark',
    description: 'Easy on the eyes',
    type: 'dark',
    colors: {
      background: '#0c1222',
      foreground: '#e2e8f0',
      card: '#151f32',
      'card-foreground': '#e2e8f0',
      'card-shadow': '0 1px 3px 0 rgba(0,0,0,0.3), 0 1px 2px -1px rgba(0,0,0,0.3)',
      'card-shadow-lg': '0 4px 6px -1px rgba(0,0,0,0.4), 0 2px 4px -2px rgba(0,0,0,0.3)',
      secondary: '#1c2b44',
      'secondary-foreground': '#e2e8f0',
      muted: '#162032',
      'muted-foreground': '#94a3b8',
      accent: '#3b82f6',
      'accent-foreground': '#ffffff',
      'accent-hover': '#60a5fa',
      destructive: '#ef4444',
      'destructive-foreground': '#ffffff',
      success: '#22c55e',
      highlight: '#172554',
      'highlight-foreground': '#93c5fd',
      'highlight-border': '#1e3a5f',
      border: '#1e2d47',
      input: '#1c2b44',
      ring: '#3b82f6',
      radius: '0.5rem',
      'font-family': "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    },
  },
  apple: {
    id: 'apple',
    name: 'System',
    description: 'Native look and feel',
    type: 'light',
    colors: {
      background: '#f5f5f7',
      foreground: '#1d1d1f',
      card: '#ffffff',
      'card-foreground': '#1d1d1f',
      'card-shadow': '0 1px 3px rgba(0,0,0,0.06)',
      'card-shadow-lg': '0 4px 6px -1px rgba(0,0,0,0.08)',
      secondary: '#f5f5f7',
      'secondary-foreground': '#1d1d1f',
      muted: '#f5f5f7',
      'muted-foreground': '#86868b',
      accent: '#007aff',
      'accent-foreground': '#ffffff',
      'accent-hover': '#0056b3',
      destructive: '#ff3b30',
      'destructive-foreground': '#ffffff',
      success: '#34c759',
      highlight: '#e8f0fe',
      'highlight-foreground': '#0055d4',
      'highlight-border': '#a8c8f0',
      border: '#d2d2d7',
      input: '#d2d2d7',
      ring: '#007aff',
      radius: '0.625rem',
      'font-family': "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'SF Pro Display', sans-serif",
    },
  },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const STORAGE_KEY = 'symphonia-theme';
const DEFAULT_THEME: ThemeId = 'axiotic-light';

/** All valid theme IDs for runtime validation */
const VALID_THEME_IDS = new Set<string>(Object.keys(themes));

function isValidThemeId(id: string): id is ThemeId {
  return VALID_THEME_IDS.has(id);
}

function getSystemTheme(): ThemeId {
  try {
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'axiotic-dark';
    }
  } catch {
    // matchMedia may be unavailable
  }
  return DEFAULT_THEME;
}

function getStoredTheme(): ThemeId {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && isValidThemeId(stored)) return stored;
  } catch {
    // localStorage may be unavailable (SSR, private browsing, etc.)
  }
  // No stored preference — respect OS dark/light mode
  return getSystemTheme();
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
