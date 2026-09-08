import RouteLoadingFallback from './components/RouteLoadingFallback';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './AuthContext';

interface PrivateRouteProps {
  children?: JSX.Element;
  isAdminRoute?: boolean;
  requiredRoles?: string[];
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
export default function PrivateRoute({ children, isAdminRoute = false, requiredRoles }: PrivateRouteProps) {
  const { token, isAdmin, isFacilitator, role, isLoading } = useAuth();

  if (isLoading) {
    return <RouteLoadingFallback />;
  }

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  // Admin routes: allow platform_admin and facilitator (for form management pages)
  if (isAdminRoute && !isFacilitator) {
    return <Navigate to="/" replace />;
  }

  // Role-specific routes
  if (requiredRoles && !requiredRoles.includes(role)) {
    return <Navigate to="/" replace />;
  }

  return children ?? <Outlet />;
}
