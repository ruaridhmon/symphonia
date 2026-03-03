import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { getAdminUsers, updateUserRole, UserListItem } from './api/forms';
import { ApiError } from './api/client';
import Container from './layouts/Container';
import { LoadingButton } from './components';
import { useDocumentTitle } from './hooks/useDocumentTitle';

const ROLES = ['expert', 'facilitator', 'platform_admin'] as const;
const ROLE_LABELS: Record<string, string> = {
  expert: 'Expert',
  facilitator: 'Facilitator',
  platform_admin: 'Platform Admin',
};

export default function AdminUsers() {
  useDocumentTitle('User Management');
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState<Record<number, boolean>>({});

  useEffect(() => {
    setLoading(true);
    getAdminUsers()
      .then(setUsers)
      .catch((err) => {
        setError(err instanceof ApiError ? `Error: HTTP ${err.status}` : 'Failed to load users');
      })
      .finally(() => setLoading(false));
  }, []);

  const handleRoleChange = async (userId: number, newRole: string) => {
    setUpdating((prev) => ({ ...prev, [userId]: true }));
    try {
      const result = await updateUserRole(userId, newRole);
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role: result.role } : u)));
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Failed to update role');
    } finally {
      setUpdating((prev) => ({ ...prev, [userId]: false }));
    }
  };

  if (loading) {
    return (
      <section className="flex-1 py-6 sm:py-8">
        <Container size="lg">
          <div className="text-center py-12" style={{ color: 'var(--muted-foreground)' }}>Loading users...</div>
        </Container>
      </section>
    );
  }

  return (
    <section className="flex-1 py-6 sm:py-8">
      <Container size="lg">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="inline-flex items-center gap-1.5 text-sm mb-6"
          style={{
            color: 'var(--muted-foreground)',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 0,
          }}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--foreground)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--muted-foreground)')}
        >
          ← Back to Dashboard
        </button>

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-lg sm:text-xl font-bold" style={{ color: 'var(--foreground)' }}>User Management</h1>
            <p className="text-xs mt-0.5" style={{ color: 'var(--muted-foreground)' }}>
              {users.length} registered user{users.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        {error && (
          <div
            className="rounded-lg p-4 mb-6"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--destructive) 10%, transparent)',
              border: '1px solid var(--destructive)',
              color: 'var(--destructive)',
            }}
          >
            <span className="text-sm font-medium">{error}</span>
          </div>
        )}

        <div
          className="rounded-lg overflow-hidden"
          style={{
            backgroundColor: 'var(--card)',
            border: '1px solid var(--border)',
          }}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left" style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--muted)' }}>
                  {['Email', 'Role', 'Joined', 'Actions'].map((label) => (
                    <th
                      key={label}
                      className="px-4 py-2.5"
                      style={{
                        color: 'var(--muted-foreground)',
                        fontSize: '0.6875rem',
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        borderBottom: '1px solid var(--border)',
                      }}
                    >
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map((u, idx) => {
                  const isSelf = currentUser?.email === u.email;
                  return (
                    <tr
                      key={u.id}
                      style={{
                        borderBottom: idx < users.length - 1 ? '1px solid var(--border)' : 'none',
                      }}
                    >
                      <td className="px-4 py-2.5 font-medium" style={{ color: 'var(--foreground)' }}>
                        {u.email}
                        {isSelf && (
                          <span
                            className="ml-2 text-xs px-1.5 py-0.5 rounded"
                            style={{ backgroundColor: 'var(--muted)', color: 'var(--muted-foreground)' }}
                          >
                            you
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2.5">
                        <span
                          className="inline-block px-2 py-0.5 rounded-full text-xs font-medium"
                          style={{
                            backgroundColor:
                              u.role === 'platform_admin'
                                ? 'color-mix(in srgb, var(--destructive) 12%, transparent)'
                                : u.role === 'facilitator'
                                  ? 'color-mix(in srgb, var(--accent) 12%, transparent)'
                                  : 'var(--muted)',
                            color:
                              u.role === 'platform_admin'
                                ? 'var(--destructive)'
                                : u.role === 'facilitator'
                                  ? 'var(--accent)'
                                  : 'var(--muted-foreground)',
                          }}
                        >
                          {ROLE_LABELS[u.role] || u.role}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-xs" style={{ color: 'var(--muted-foreground)' }}>
                        {u.created_at ? new Date(u.created_at).toLocaleDateString() : '-'}
                      </td>
                      <td className="px-4 py-2.5">
                        {isSelf ? (
                          <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>-</span>
                        ) : (
                          <select
                            value={u.role}
                            onChange={(e) => handleRoleChange(u.id, e.target.value)}
                            disabled={updating[u.id]}
                            className="text-xs px-2 py-1 rounded"
                            style={{
                              border: '1px solid var(--input)',
                              backgroundColor: 'var(--background)',
                              color: 'var(--foreground)',
                            }}
                          >
                            {ROLES.map((r) => (
                              <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                            ))}
                          </select>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </Container>
    </section>
  );
}
