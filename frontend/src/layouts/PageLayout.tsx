import { Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Header from '../Header';
import CommandPalette from '../components/CommandPalette';

/**
 * Shared layout shell for all authenticated pages.
 *
 * Provides:  Skip link  →  Header  →  scrollable <main>  →  Footer  →  CommandPalette (⌘K)
 * Child routes render via <Outlet />.
 */
export default function PageLayout() {
  const { t } = useTranslation();
  return (
    <div
      className="min-h-screen flex flex-col"
      style={{
        backgroundColor: 'var(--background)',
        color: 'var(--foreground)',
        fontFamily: 'var(--font-family)',
      }}
    >
      <a href="#main-content" className="skip-to-main">
        {t('common.skipToMainContent', 'Skip to main content')}
      </a>

      <Header />

      <main id="main-content" className="flex-1 flex flex-col" tabIndex={-1}>
        <Outlet />
      </main>

      <footer
        className="border-t text-center py-6 text-xs"
        role="contentinfo"
        style={{
          backgroundColor: 'transparent',
          borderColor: 'var(--border)',
          color: 'var(--muted-foreground)',
          opacity: 0.7,
        }}
      >
        <span aria-label={`Copyright ${new Date().getFullYear()} Symphonia`}>
          © {new Date().getFullYear()} Symphonia · Collaborative Consensus Platform
        </span>
      </footer>

      <CommandPalette />
    </div>
  );
}
