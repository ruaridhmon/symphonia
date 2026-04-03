import { Outlet } from 'react-router-dom';

/**
 * Centred layout shell for unauthenticated pages (Login, Register).
 *
 * Vertically and horizontally centres the child route content
 * with consistent responsive padding.
 */
export default function AuthLayout() {
  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 sm:px-6"
      style={{
        background: 'var(--background-gradient, var(--background))',
        color: 'var(--foreground)',
        fontFamily: 'var(--font-family)',
      }}
    >
      <main className="w-full max-w-md">
        {/* Branding — converging waves */}
        <div className="text-center mb-8">
          <div
            className="inline-flex items-center justify-center gap-4 mb-3"
            aria-label="Symphonia"
          >
            <img
              src="/logo-mark.png"
              alt=""
              className="h-14 w-14 sm:h-16 sm:w-16"
              decoding="async"
            />
            <div className="text-left">
              <div
                className="text-3xl sm:text-4xl font-semibold tracking-tight"
                style={{ color: 'var(--foreground)' }}
              >
                Symphonia
              </div>
              <div
                className="text-xs uppercase tracking-[0.24em]"
                style={{ color: 'var(--accent)' }}
              >
                Consensus Platform
              </div>
            </div>
          </div>
          <p
            className="text-sm mt-1"
            aria-hidden="true"
            style={{ color: 'var(--muted-foreground)' }}
          >
            Collaborative Consensus Platform
          </p>
        </div>
        <Outlet />
      </main>
    </div>
  );
}
