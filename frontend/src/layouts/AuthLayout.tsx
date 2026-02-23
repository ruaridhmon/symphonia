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
      <div className="w-full max-w-md">
        {/* Branding — converging waves */}
        <div className="text-center mb-8">
          {/* Symphonia wordmark — starburst + logotype */}
          <div className="inline-flex items-center justify-center mb-3">
            <img
              src="/logo-wordmark.png"
              alt="Symphonia"
              className="h-20 w-auto"
              style={{ maxWidth: '360px' }}
            />
          </div>
          <p
            className="text-sm mt-1"
            style={{ color: 'var(--muted-foreground)' }}
          >
            Collaborative Consensus Platform
          </p>
        </div>
        <Outlet />
      </div>
    </div>
  );
}
