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
        backgroundColor: 'var(--background)',
        color: 'var(--foreground)',
        fontFamily: 'var(--font-family)',
      }}
    >
      <div className="w-full max-w-md">
        <Outlet />
      </div>
    </div>
  );
}
