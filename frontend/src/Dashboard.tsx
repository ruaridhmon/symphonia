import AdminDashboard from './AdminDashboard';
import FacilitatorDashboard from './FacilitatorDashboard';
import ExpertDashboard from './ExpertDashboard';
import { useAuth } from './AuthContext';

/**
 * Root dashboard — delegates to Admin, Facilitator, or Expert dashboard
 * based on the authenticated user's role.
 *
 * Rendered inside PageLayout (which provides Header + Footer).
 */
export default function Dashboard() {
  const { role } = useAuth();

  switch (role) {
    case 'platform_admin':
      return <AdminDashboard />;
    case 'facilitator':
      return <FacilitatorDashboard />;
    default:
      return <ExpertDashboard />;
  }
}
