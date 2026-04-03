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
        <div className="auth-brand mb-7" aria-label="Symphonia">
          <img
            src="/logo-mark.png"
            alt=""
            className="auth-logo-mark"
            decoding="async"
          />
        </div>
        <Outlet />
      </main>
    </div>
  );
}
