import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './AuthContext';

interface PrivateRouteProps {
  children?: JSX.Element;
  isAdminRoute?: boolean;
}

/**
 * Auth guard that works both as a wrapper and as a layout route.
 *
 * - As a wrapper:  <PrivateRoute><Page /></PrivateRoute>
 * - As a layout:   <Route element={<PrivateRoute />}> … child routes …
 *
 * When no children are provided it renders <Outlet /> so nested
 * routes can flow through.
 */
export default function PrivateRoute({ children, isAdminRoute = false }: PrivateRouteProps) {
  const { token, isAdmin, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{
          backgroundColor: 'var(--background)',
          color: 'var(--foreground)',
        }}
      >
        <div className="flex flex-col items-center gap-3">
          <div
            className="w-8 h-8 rounded-full border-2 border-t-transparent"
            style={{ borderColor: 'var(--border)', borderTopColor: 'transparent' }}
          />
          <span
            className="text-sm"
            style={{ color: 'var(--muted-foreground)' }}
          >
            Loading…
          </span>
        </div>
      </div>
    );
  }

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (isAdminRoute && !isAdmin) {
    return <Navigate to="/" replace />;
  }

  return children ?? <Outlet />;
}
