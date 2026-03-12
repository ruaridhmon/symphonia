import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { magicJoin, unlockForm } from './api/forms';
import { ApiError } from './api/client';
import Container from './layouts/Container';
import { LoadingButton } from './components';
import { useDocumentTitle } from './hooks/useDocumentTitle';

/**
 * Join page — two modes:
 *   /join        → manual code entry form (for dashboard "Join" buttons)
 *   /join/:code  → magic link: auto-joins and redirects to the form
 */
export default function JoinPage() {
  useDocumentTitle('Join Consultation');
  const { code } = useParams<{ code?: string }>();
  const { token } = useAuth();
  const navigate = useNavigate();

  // Magic-link mode state
  const [error, setError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);

  // Manual entry mode state
  const [manualCode, setManualCode] = useState('');
  const [manualError, setManualError] = useState('');
  const [manualLoading, setManualLoading] = useState(false);

  // ── Magic-link mode: code comes from URL ──────────────────────
  useEffect(() => {
    if (!code) return;

    if (!token) {
      sessionStorage.setItem('pending_join_code', code);
      navigate('/register', { replace: true });
      return;
    }

    setJoining(true);
    magicJoin(code)
      .then((result) => {
        navigate(`/form/${result.form_id}`, { replace: true });
      })
      .catch((err) => {
        if (err instanceof ApiError) {
          try {
            const body = JSON.parse(err.message);
            setError(body.detail || err.message);
          } catch {
            setError(err.message);
          }
        } else {
          setError('Failed to join. Please try again.');
        }
      })
      .finally(() => setJoining(false));
  }, [code, token, navigate]);

  // ── Manual entry mode: no code in URL ────────────────────────
  const handleManualJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setManualError('');
    setManualLoading(true);
    try {
      const result = await unlockForm(manualCode.trim());
      navigate(`/form/${result.form_id}`, { replace: true });
    } catch (err: any) {
      setManualError(err.status === 404 ? 'Invalid join code. Please check and try again.' : `Could not join (HTTP ${err.status})`);
    } finally {
      setManualLoading(false);
    }
  };

  // ── Manual entry view ─────────────────────────────────────────
  if (!code) {
    return (
      <section className="flex-1 py-6 sm:py-8">
        <Container size="sm">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="inline-flex items-center gap-1.5 text-sm mb-6 transition-colors"
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

          <div
            className="rounded-xl p-6 sm:p-10"
            style={{
              backgroundColor: 'var(--card)',
              border: '1px solid var(--border)',
              boxShadow: 'var(--card-shadow, none)',
            }}
          >
            <h1 className="text-2xl font-semibold mb-2 text-center" style={{ color: 'var(--foreground)' }}>
              Join a Consultation
            </h1>
            <p className="text-sm text-center mb-8" style={{ color: 'var(--muted-foreground)' }}>
              Enter the join code shared by the consultation facilitator.
            </p>
            <form onSubmit={handleManualJoin} className="space-y-4">
              <input
                type="text"
                placeholder="e.g. SYM-ABCD-2345"
                value={manualCode}
                onChange={e => { setManualCode(e.target.value.toUpperCase()); setManualError(''); }}
                className="w-full px-4 py-3 rounded-lg text-base tracking-widest text-center font-mono"
                style={{
                  border: '1px solid var(--input)',
                  backgroundColor: 'var(--background)',
                  color: 'var(--foreground)',
                }}
                autoFocus
                autoComplete="off"
                spellCheck={false}
              />
              {manualError && (
                <p className="text-sm text-center" style={{ color: 'var(--destructive)' }}>{manualError}</p>
              )}
              <LoadingButton
                type="submit"
                variant="accent"
                size="md"
                className="w-full"
                loading={manualLoading}
                disabled={!manualCode.trim()}
              >
                Join Consultation
              </LoadingButton>
            </form>
          </div>
        </Container>
      </section>
    );
  }

  // ── Magic-link view ───────────────────────────────────────────
  return (
    <section className="flex-1 py-6 sm:py-8">
      <Container size="sm">
        <div
          className="rounded-xl p-6 sm:p-8 text-center"
          style={{
            backgroundColor: 'var(--card)',
            border: '1px solid var(--border)',
          }}
        >
          {joining && (
            <>
              <div
                className="w-8 h-8 mx-auto mb-3 rounded-full border-2 border-t-transparent animate-spin"
                style={{ borderColor: 'var(--border)', borderTopColor: 'transparent' }}
              />
              <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>Joining consultation...</p>
            </>
          )}
          {error && (
            <>
              <p className="text-sm font-medium mb-3" style={{ color: 'var(--destructive)' }}>{error}</p>
              <button
                onClick={() => navigate('/')}
                className="text-sm px-4 py-2 rounded-lg"
                style={{ backgroundColor: 'var(--accent)', color: 'white' }}
              >
                Go to Dashboard
              </button>
            </>
          )}
        </div>
      </Container>
    </section>
  );
}
