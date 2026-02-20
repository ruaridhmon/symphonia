import { useAuth } from './AuthContext';
import { ThemeToggle } from './theme';

export default function Header() {
  const { user, logout } = useAuth();

  return (
    <header
      className="border-b shadow-sm transition-colors duration-200"
      style={{
        backgroundColor: 'var(--card)',
        borderColor: 'var(--border)',
        boxShadow: 'var(--card-shadow, none)',
      }}
    >
      <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
        {/* Left: branding + user info */}
        <div>
          <h1
            className="text-xl font-bold tracking-tight"
            style={{ color: 'var(--foreground)' }}
          >
            Symphonia
          </h1>
          {user && (
            <p
              className="text-sm"
              style={{ color: 'var(--muted-foreground)' }}
            >
              Logged in as{' '}
              <strong style={{ color: 'var(--foreground)' }}>{user.email}</strong>
            </p>
          )}
        </div>

        {/* Right: theme toggle + logout */}
        <div className="flex items-center gap-3">
          <ThemeToggle />
          {user && (
            <button
              onClick={logout}
              className="text-sm underline transition-colors duration-200"
              style={{ color: 'var(--destructive)' }}
            >
              Log out
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
