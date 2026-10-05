import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { useAuth } from './AuthContext';
import { ThemeToggle } from './theme';
import LanguageSwitcher from './components/LanguageSwitcher';
import AccountMenu from './components/AccountMenu';

export default function Header() {
  const { t } = useTranslation();
  const { user, logout, role } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  const handleMenuKeyDown = useCallback((e: KeyboardEvent) => {
    if (!menuOpen) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      setMenuOpen(false);
      menuButtonRef.current?.focus();
    }
  }, [menuOpen]);

  useEffect(() => {
    if (!menuOpen) return;
    document.addEventListener('keydown', handleMenuKeyDown);
    const timer = setTimeout(() => {
      menuRef.current?.querySelector<HTMLElement>('button, a, [tabindex]:not([tabindex="-1"])')?.focus();
    }, 50);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('keydown', handleMenuKeyDown);
    };
  }, [menuOpen, handleMenuKeyDown]);

  return (
    <header className="sticky top-0 z-40" style={{ backgroundColor: 'color-mix(in srgb, var(--background) 92%, transparent)', backdropFilter: 'blur(12px)' }}>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 h-11 flex items-center justify-between">
        <button
          onClick={() => navigate('/')}
          className="flex items-center justify-center"
          style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
          aria-label="Go to home"
        >
          <img src="/logo-mark.png" alt="Symphonia" className="h-6 w-auto" />
        </button>

        <nav aria-label={t('header.primaryNavigation', 'Primary navigation')} className="hidden sm:flex items-center">
          {user && (
            <AccountMenu
              email={user.email}
              onLogout={logout}
              showAdminLinks={role === 'platform_admin'}
            />
          )}
        </nav>

        <button
          ref={menuButtonRef}
          className="sm:hidden flex items-center justify-center w-8 h-8 rounded-md"
          style={{ color: 'var(--foreground)', backgroundColor: 'transparent', border: 'none', cursor: 'pointer' }}
          onClick={() => setMenuOpen(prev => !prev)}
          aria-label={menuOpen ? t('header.closeMenu') : t('header.openMenu')}
          aria-expanded={menuOpen}
          aria-controls="mobile-nav-menu"
        >
          {menuOpen ? <X size={19} /> : <Menu size={19} />}
        </button>
      </div>

      <nav
        ref={menuRef}
        id="mobile-nav-menu"
        className="sm:hidden overflow-hidden transition-all duration-200 ease-in-out"
        role="menu"
        aria-label={t('header.mobileNavigation', 'Mobile navigation')}
        style={{
          maxHeight: menuOpen ? '190px' : '0',
          opacity: menuOpen ? 1 : 0,
          borderTop: menuOpen ? '1px solid color-mix(in srgb, var(--border) 55%, transparent)' : 'none',
        }}
      >
        <div className="max-w-5xl mx-auto px-4 py-3 flex flex-col gap-3">
          {user && (
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs truncate" style={{ color: 'var(--muted-foreground)' }} title={user.email}>{user.email}</p>
              <button onClick={() => { setMenuOpen(false); logout(); }} className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
                {t('common.logOut')}
              </button>
            </div>
          )}
          <div className="flex items-center justify-between">
            <span className="text-sm" style={{ color: 'var(--muted-foreground)' }}>{t('language.label')}</span>
            <LanguageSwitcher />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm" style={{ color: 'var(--muted-foreground)' }}>{t('common.theme')}</span>
            <ThemeToggle />
          </div>
        </div>
      </nav>
    </header>
  );
}
