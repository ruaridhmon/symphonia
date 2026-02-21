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
        background: 'linear-gradient(135deg, #f1f5f9 0%, #eef2ff 50%, #f1f5f9 100%)',
        color: 'var(--foreground)',
        fontFamily: 'var(--font-family)',
      }}
    >
      <div className="w-full max-w-md">
        {/* Branding */}
        <div className="text-center mb-8">
          <div
            className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4"
            style={{
              background: 'linear-gradient(135deg, var(--accent), var(--accent-hover))',
              boxShadow: '0 4px 14px rgba(37, 99, 235, 0.3)',
            }}
          >
            <span className="text-2xl" role="img" aria-label="Symphonia">🎵</span>
          </div>
          <h1
            className="text-2xl font-bold tracking-tight"
            style={{ color: 'var(--foreground)' }}
          >
            Symphonia
          </h1>
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
