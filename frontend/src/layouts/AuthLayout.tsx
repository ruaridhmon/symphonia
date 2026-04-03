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
      className="auth-shell min-h-screen flex items-center justify-center px-4 sm:px-6"
      style={{
        background: 'var(--background-gradient, var(--background))',
        color: 'var(--foreground)',
        fontFamily: 'var(--font-family)',
      }}
    >
      <main className="w-full max-w-md">
        <div className="auth-brand text-center mb-8">
          <div
            className="inline-flex items-center justify-center gap-3"
            aria-label="Symphonia"
          >
            <img
              src="/logo-mark.png"
              alt=""
              className="h-12 w-12 sm:h-14 sm:w-14"
              decoding="async"
            />
            <div className="text-left auth-brand-copy">
              <div
                className="text-3xl sm:text-[2.2rem] font-semibold tracking-tight"
                style={{ color: 'var(--foreground)' }}
              >
                Symphonia
              </div>
            </div>
          </div>
        </div>
        <Outlet />
      </main>
    </div>
  );
}
