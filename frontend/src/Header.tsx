import { useState, useEffect, useRef, useCallback } from 'react';
import { Menu, X } from 'lucide-react';
import { useAuth } from './AuthContext';
import { ThemeToggle } from './theme';

export default function Header() {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  // Close mobile menu on Escape, manage focus
  const handleMenuKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!menuOpen) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        setMenuOpen(false);
        menuButtonRef.current?.focus();
      }
    },
    [menuOpen],
  );

  useEffect(() => {
    if (menuOpen) {
      document.addEventListener('keydown', handleMenuKeyDown);
      // Focus first focusable item in menu
      const timer = setTimeout(() => {
        const focusable = menuRef.current?.querySelector<HTMLElement>(
          'button, a, [tabindex]:not([tabindex="-1"])',
        );
        focusable?.focus();
      }, 50);
      return () => {
        clearTimeout(timer);
        document.removeEventListener('keydown', handleMenuKeyDown);
      };
    }
    return () => {
      document.removeEventListener('keydown', handleMenuKeyDown);
    };
  }, [menuOpen, handleMenuKeyDown]);

  return (
    <header
      className="border-b sticky top-0 z-40"
      style={{
        backgroundColor: 'var(--card)',
        borderColor: 'var(--border)',
        boxShadow: '0 1px 3px 0 rgba(0,0,0,0.04), 0 1px 2px -1px rgba(0,0,0,0.04)',
        backdropFilter: 'blur(8px)',
      }}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-2 flex justify-between items-center">
        {/* Left: branding — converging waves */}
        <div className="flex items-center gap-2.5">
          <img src="/logo.png" alt="" className="h-7 w-auto flex-shrink-0" aria-hidden="true" />
          <div>
            <h1
              className="text-lg font-semibold leading-tight"
              style={{ color: 'var(--foreground)', letterSpacing: '-0.02em' }}
            >
              Symphonia
            </h1>
            {/* Show email inline on desktop only */}
            {user && (
              <p
                className="text-xs leading-tight hidden sm:block"
                style={{ color: 'var(--muted-foreground)' }}
              >
                {user.email}
              </p>
            )}
          </div>
        </div>

        {/* Right: desktop layout */}
        <div className="hidden sm:flex items-center gap-2">
          {/* Cmd+K shortcut hint */}
          <button
            type="button"
            onClick={() => {
              document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }));
            }}
            className="header-cmd-k-btn flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs"
            aria-label="Open command palette"
          >
            <span style={{ opacity: 0.7 }}>⌘K</span>
          </button>
          <ThemeToggle />
          {user && (
            <button
              onClick={logout}
              className="header-logout-btn text-sm px-3 py-1.5 rounded-lg"
            >
              Log out
            </button>
          )}
        </div>

        {/* Right: mobile hamburger button */}
        <button
          ref={menuButtonRef}
          className="sm:hidden flex items-center justify-center w-10 h-10 rounded-lg transition-colors"
          style={{
            color: 'var(--foreground)',
            backgroundColor: 'transparent',
            border: 'none',
            cursor: 'pointer',
          }}
          onClick={() => setMenuOpen(prev => !prev)}
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
          aria-controls="mobile-nav-menu"
        >
          {menuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Mobile dropdown menu */}
      <div
        ref={menuRef}
        id="mobile-nav-menu"
        className="sm:hidden overflow-hidden transition-all duration-200 ease-in-out"
        role="menu"
        aria-label="Mobile navigation"
        style={{
          maxHeight: menuOpen ? '200px' : '0',
          opacity: menuOpen ? 1 : 0,
          borderTop: menuOpen ? '1px solid var(--border)' : 'none',
        }}
      >
        <div className="max-w-6xl mx-auto px-4 py-3 flex flex-col gap-3">
          {user && (
            <p
              className="text-xs"
              style={{ color: 'var(--muted-foreground)' }}
            >
              {user.email}
            </p>
          )}
          <div className="flex items-center justify-between">
            <span className="text-sm" style={{ color: 'var(--muted-foreground)' }}>Theme</span>
            <ThemeToggle />
          </div>
          {user && (
            <button
              onClick={() => { setMenuOpen(false); logout(); }}
              className="header-logout-btn text-sm text-left px-3 py-2 rounded-lg"
            >
              Log out
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
