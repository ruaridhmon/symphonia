import { useAuth } from './AuthContext';
import { ThemeToggle } from './theme';

export default function Header() {
  const { user, logout } = useAuth();

  return (
    <header
      className="border-b sticky top-0 z-40"
      style={{
        backgroundColor: 'var(--card)',
        borderColor: 'var(--border)',
        boxShadow: '0 1px 3px 0 rgba(0,0,0,0.04), 0 1px 2px -1px rgba(0,0,0,0.04)',
        backdropFilter: 'blur(8px)',
      }}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex justify-between items-center">
        {/* Left: branding + user info */}
        <div className="flex items-center gap-3">
          <div
            className="flex items-center justify-center w-8 h-8 rounded-lg"
            style={{
              background: 'linear-gradient(135deg, var(--accent), var(--accent-hover))',
            }}
          >
            <span className="text-sm" role="img" aria-label="Symphonia">🎵</span>
          </div>
          <div>
            <h1
              className="text-lg font-bold tracking-tight leading-tight"
              style={{ color: 'var(--foreground)' }}
            >
              Symphonia
            </h1>
            {user && (
              <p
                className="text-xs leading-tight"
                style={{ color: 'var(--muted-foreground)' }}
              >
                {user.email}
              </p>
            )}
          </div>
        </div>

        {/* Right: theme toggle + logout */}
        <div className="flex items-center gap-2">
          <ThemeToggle />
          {user && (
            <button
              onClick={logout}
              className="text-sm px-3 py-1.5 rounded-lg transition-colors"
              style={{
                color: 'var(--muted-foreground)',
                backgroundColor: 'transparent',
                border: 'none',
                cursor: 'pointer',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.backgroundColor = 'var(--muted)';
                e.currentTarget.style.color = 'var(--destructive)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = 'var(--muted-foreground)';
              }}
            >
              Log out
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
