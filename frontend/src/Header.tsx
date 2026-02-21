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
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex justify-between items-center">
        {/* Left: branding */}
        <div className="flex items-center gap-3">
          <div
            className="flex items-center justify-center w-8 h-8 rounded-lg"
            style={{
              background: 'linear-gradient(135deg, var(--accent), var(--accent-hover))',
            }}
          >
            <span className="text-sm" role="img" aria-label="Symphonia">🎵</span>
          </div>
          <div>
            <h1
              className="text-lg font-bold tracking-tight leading-tight"
              style={{ color: 'var(--foreground)' }}
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
              // Trigger Cmd+K
              document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }));
            }}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs transition-colors"
            style={{
              backgroundColor: 'var(--muted)',
              color: 'var(--muted-foreground)',
              border: '1px solid var(--border)',
              cursor: 'pointer',
              fontFamily: 'var(--font-family)',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = 'var(--accent)';
              e.currentTarget.style.color = 'var(--foreground)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = 'var(--border)';
              e.currentTarget.style.color = 'var(--muted-foreground)';
            }}
            aria-label="Open command palette"
          >
            <span style={{ opacity: 0.7 }}>⌘K</span>
          </button>
          <ThemeToggle />
          {user && (
            <button
              onClick={logout}
              className="text-sm px-3 py-1.5 rounded-lg transition-colors"
              style={{
                color: 'var(--muted-foreground)',
                backgroundColor: 'transparent',
                border: 'none',
                cursor: 'pointer',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.backgroundColor = 'var(--muted)';
                e.currentTarget.style.color = 'var(--destructive)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = 'var(--muted-foreground)';
              }}
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
              className="text-sm text-left px-3 py-2 rounded-lg transition-colors"
              style={{
                color: 'var(--destructive)',
                backgroundColor: 'transparent',
                border: 'none',
                cursor: 'pointer',
              }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--muted)'}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              Log out
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
