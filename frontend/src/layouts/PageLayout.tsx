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
        className="border-t text-center py-4 text-sm"
        style={{
          backgroundColor: 'var(--card)',
          borderColor: 'var(--border)',
          color: 'var(--muted-foreground)',
        }}
      >
        © {new Date().getFullYear()} Symphonia
      </footer>
    </div>
  );
}
