import { Outlet } from 'react-router-dom';
import Header from '../Header';

/**
 * Shared layout shell for all authenticated pages.
 *
 * Provides:  Header  →  scrollable <main>  →  Footer
 * Child routes render via <Outlet />.
 */
export default function PageLayout() {
  return (
    <div
      className="min-h-screen flex flex-col"
      style={{
        backgroundColor: 'var(--background)',
        color: 'var(--foreground)',
        fontFamily: 'var(--font-family)',
      }}
    >
      <Header />

      <main className="flex-1 flex flex-col">
        <Outlet />
      </main>

      <footer
        className="border-t text-center py-6 text-xs"
        style={{
          backgroundColor: 'transparent',
          borderColor: 'var(--border)',
          color: 'var(--muted-foreground)',
          opacity: 0.7,
        }}
      >
        © {new Date().getFullYear()} Symphonia · Collaborative Consensus Platform
      </footer>
    </div>
  );
}
