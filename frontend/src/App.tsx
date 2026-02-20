import AdminDashboard from './AdminDashboard';
import { useAuth } from './AuthContext';
import Header from './Header';
import UserDashboard from './UserDashboard';

export default function App() {
  const { isAdmin } = useAuth();

  return (
    <div
      className="min-h-screen flex flex-col transition-colors duration-200"
      style={{
        backgroundColor: 'var(--background)',
        color: 'var(--foreground)',
        fontFamily: 'var(--font-family)',
      }}
    >
      <Header />
      <main className="flex-1">
        {isAdmin ? <AdminDashboard /> : <UserDashboard />}
      </main>
      <footer
        className="border-t text-center py-4 text-sm transition-colors duration-200"
        style={{
          backgroundColor: 'var(--card)',
          borderColor: 'var(--border)',
          color: 'var(--muted-foreground)',
        }}
      >
        © {new Date().getFullYear()} Symphonia
      </footer>
    </div>
  );
}
