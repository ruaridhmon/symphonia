import { useState, useRef, useEffect } from 'react';
import { Moon, Sun, Monitor } from 'lucide-react';
import { useTheme, type ThemeId } from './ThemeProvider';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

interface ThemeOption {
  id: ThemeId;
  label: string;
  icon: typeof Moon;
}

const THEME_OPTIONS: ThemeOption[] = [
  { id: 'axiotic-dark', label: 'Dark', icon: Moon },
  { id: 'axiotic-light', label: 'Light', icon: Sun },
  { id: 'apple', label: 'Apple', icon: Monitor },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ThemeToggle() {
  const { themeId, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close on Escape
  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  const current = THEME_OPTIONS.find((o) => o.id === themeId) ?? THEME_OPTIONS[0];
  const CurrentIcon = current.icon;

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-label="Change theme"
        aria-expanded={open}
        aria-haspopup="menu"
        className="
          flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium
          transition-colors duration-200
          hover:opacity-80
        "
        style={{
          color: 'var(--muted-foreground)',
          backgroundColor: 'var(--secondary)',
          border: '1px solid var(--border)',
        }}
      >
        <CurrentIcon size={16} />
        <span className="hidden sm:inline">{current.label}</span>
      </button>

      {/* Dropdown */}
      {open && (
        <div
          className="
            absolute right-0 mt-2 z-50
            min-w-[160px] rounded-lg overflow-hidden
            shadow-lg
            animate-in fade-in slide-in-from-top-1
          "
          role="menu"
          aria-label="Theme options"
          style={{
            backgroundColor: 'var(--card)',
            border: '1px solid var(--border)',
          }}
        >
          {THEME_OPTIONS.map((option) => {
            const Icon = option.icon;
            const isActive = option.id === themeId;
            return (
              <button
                key={option.id}
                type="button"
                role="menuitem"
                aria-current={isActive ? 'true' : undefined}
                onClick={() => {
                  setTheme(option.id);
                  setOpen(false);
                }}
                className="
                  flex items-center gap-3 w-full px-4 py-2.5 text-sm
                  transition-colors duration-150
                  text-left
                "
                style={{
                  color: isActive ? 'var(--accent)' : 'var(--foreground)',
                  backgroundColor: isActive ? 'var(--muted)' : 'transparent',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    (e.currentTarget as HTMLButtonElement).style.backgroundColor =
                      'var(--muted)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    (e.currentTarget as HTMLButtonElement).style.backgroundColor =
                      'transparent';
                  }
                }}
              >
                <Icon size={16} />
                <span className="flex-1">{option.label}</span>
                {isActive && (
                  <span
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ backgroundColor: 'var(--accent)' }}
                  />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
