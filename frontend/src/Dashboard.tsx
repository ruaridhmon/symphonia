import AdminDashboard from './AdminDashboard';
import { useAuth } from './AuthContext';
import UserDashboard from './UserDashboard';

/**
 * Root dashboard — delegates to Admin or User dashboard
 * based on the authenticated user's role.
 *
 * Rendered inside PageLayout (which provides Header + Footer).
 */
export default function Dashboard() {
  const { isAdmin } = useAuth();
  return isAdmin ? <AdminDashboard /> : <UserDashboard />;
}
