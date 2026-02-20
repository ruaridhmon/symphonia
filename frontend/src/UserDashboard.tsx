import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from './config';
import { useAuth } from './AuthContext';
import Container from './layouts/Container';

/**
 * User dashboard — join forms via code, view/enter joined forms.
 *
 * Rendered inside PageLayout via Dashboard component.
 * Uses <section> instead of <main> to avoid nesting <main> inside PageLayout's <main>.
 */
export default function UserDashboard() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [myForms, setMyForms] = useState([]);
  const [joinCode, setJoinCode] = useState('');
  const [joinError, setJoinError] = useState('');

  useEffect(() => {
    if (token) {
      fetch(`${API_BASE_URL}/my_forms`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then(r => r.json())
        .then(d => setMyForms(Array.isArray(d) ? d : []));
    }
  }, [token]);

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode) return;

    const res = await fetch(`${API_BASE_URL}/forms/unlock`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ join_code: joinCode.trim() }),
    });

    if (!res.ok) {
      setJoinError('Invalid join code.');
      return;
    }

    setJoinCode('');
    fetch(`${API_BASE_URL}/my_forms`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(d => setMyForms(Array.isArray(d) ? d : []));
  };

  return (
    <section className="flex-1 py-6 sm:py-8">
      <Container size="md">
        {/* ── Join form card ── */}
        <div
          className="rounded-xl p-6 sm:p-8 mb-6 sm:mb-8"
          style={{
            backgroundColor: 'var(--card)',
            border: '1px solid var(--border)',
            boxShadow: 'var(--card-shadow, none)',
          }}
        >
          <h2
            className="text-xl font-semibold mb-4 text-center"
            style={{ color: 'var(--foreground)' }}
          >
            Join a New Form
          </h2>
          <form onSubmit={handleUnlock} className="space-y-4">
            <input
              type="text"
              placeholder="Enter join code"
              value={joinCode}
              onChange={e => {
                setJoinCode(e.target.value);
                setJoinError('');
              }}
              className="w-full px-4 py-2 rounded-lg"
              style={{
                border: '1px solid var(--input)',
                backgroundColor: 'var(--background)',
                color: 'var(--foreground)',
              }}
            />
            {joinError && (
              <p
                className="text-sm text-center"
                style={{ color: 'var(--destructive)' }}
              >
                {joinError}
              </p>
            )}
            <button
              className="w-full py-2 rounded-lg font-medium"
              style={{
                backgroundColor: 'var(--accent)',
                color: 'var(--accent-foreground)',
              }}
            >
              Join Form
            </button>
          </form>
        </div>

        {/* ── My forms list ── */}
        <div
          className="rounded-xl p-6 sm:p-8"
          style={{
            backgroundColor: 'var(--card)',
            border: '1px solid var(--border)',
            boxShadow: 'var(--card-shadow, none)',
          }}
        >
          <h2
            className="text-xl font-semibold mb-4"
            style={{ color: 'var(--foreground)' }}
          >
            My Forms
          </h2>
          <ul className="space-y-3">
            {myForms.length === 0 && (
              <p style={{ color: 'var(--muted-foreground)' }}>
                No forms joined yet.
              </p>
            )}
            {myForms.map((f: any) => (
              <li
                key={f.id}
                className="rounded-lg p-4 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3"
                style={{
                  backgroundColor: 'var(--muted)',
                  border: '1px solid var(--border)',
                }}
              >
                <span style={{ color: 'var(--foreground)' }}>{f.title}</span>
                <button
                  className="self-start sm:self-auto px-4 py-1.5 rounded-lg font-medium text-sm shrink-0"
                  style={{
                    backgroundColor: 'var(--success)',
                    color: '#ffffff',
                  }}
                  onClick={() => navigate(`/form/${f.id}`)}
                >
                  Enter
                </button>
              </li>
            ))}
          </ul>
        </div>
      </Container>
    </section>
  );
}
