import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { getMyForms, unlockForm, Form } from './api/forms';
import { ApiError } from './api/client';
import Container from './layouts/Container';
import { LoadingButton } from './components';
import Skeleton, { SkeletonCard } from './components/Skeleton';

/**
 * User dashboard — join forms via code, view/enter joined forms.
 *
 * Rendered inside PageLayout via Dashboard component.
 * Uses <section> instead of <main> to avoid nesting <main> inside PageLayout's <main>.
 */
export default function UserDashboard() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [myForms, setMyForms] = useState<Form[]>([]);
  const [joinCode, setJoinCode] = useState('');
  const [joinError, setJoinError] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchMyForms = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      setError(null);
      setLoading(true);
      const data = await getMyForms();
      setMyForms(Array.isArray(data) ? data : []);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 401) return; // client.ts handles redirect
        setError(`Failed to load forms (HTTP ${err.status})`);
      } else {
        setError('Failed to load forms. Please check your connection.');
      }
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchMyForms();
  }, [fetchMyForms]);

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode) return;

    try {
      await unlockForm(joinCode.trim());
      setJoinCode('');
      setJoinError('');
      fetchMyForms();
    } catch (err) {
      if (err instanceof ApiError) {
        setJoinError(
          err.status === 404
            ? 'Invalid join code.'
            : `Could not join form (HTTP ${err.status})`
        );
      } else {
        setJoinError('Something went wrong. Please try again.');
      }
    }
  };

  return (
    <section className="flex-1 py-6 sm:py-8">
      <Container size="md">
        {/* ── Error banner ── */}
        {error && (
          <div
            className="rounded-lg p-4 mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--destructive) 10%, transparent)',
              border: '1px solid var(--destructive)',
              color: 'var(--destructive)',
            }}
          >
            <span className="text-sm font-medium">{error}</span>
            <LoadingButton
              variant="destructive"
              size="sm"
              onClick={fetchMyForms}
            >
              Retry
            </LoadingButton>
          </div>
        )}

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
            <LoadingButton
              type="submit"
              variant="accent"
              size="md"
              className="w-full"
            >
              Join Form
            </LoadingButton>
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

          {loading ? (
            <div className="space-y-3">
              <SkeletonCard />
              <SkeletonCard />
              <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '0.5rem' }}>
                <Skeleton variant="text" width="40%" height="0.75rem" />
              </div>
            </div>
          ) : (
            <ul className="space-y-3">
              {myForms.length === 0 && (
                <p style={{ color: 'var(--muted-foreground)' }}>
                  No forms joined yet.
                </p>
              )}
              {myForms.map((f) => (
                <li
                  key={f.id}
                  className="rounded-lg p-4 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3"
                  style={{
                    backgroundColor: 'var(--muted)',
                    border: '1px solid var(--border)',
                  }}
                >
                  <span style={{ color: 'var(--foreground)' }}>{f.title}</span>
                  <LoadingButton
                    variant="success"
                    size="sm"
                    onClick={() => navigate(`/form/${f.id}`)}
                  >
                    Enter
                  </LoadingButton>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Container>
    </section>
  );
}
