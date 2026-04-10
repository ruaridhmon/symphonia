import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { joinForm, magicJoin } from './api/forms';
import { getPublicForm, startPublicFormSession, type PublicFormDetail } from './api/publicForms';
import { ApiError, getApiErrorDetail } from './api/client';
import Container from './layouts/Container';
import { BackLink, LoadingButton } from './components';
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
  const [publicForm, setPublicForm] = useState<PublicFormDetail | null>(null);
  const [participantName, setParticipantName] = useState('');
  const [consentGiven, setConsentGiven] = useState(false);
  const [startingPublicSession, setStartingPublicSession] = useState(false);

  // Manual entry mode state
  const [manualCode, setManualCode] = useState('');
  const [manualError, setManualError] = useState('');
  const [manualLoading, setManualLoading] = useState(false);

  // ── Magic-link mode: code comes from URL ──────────────────────
  useEffect(() => {
    if (!code) return;

    setError(null);
    setPublicForm(null);
    setJoining(true);
    (async () => {
      try {
        const form = await getPublicForm(code);
        setPublicForm(form);
      } catch (err) {
        if (!(err instanceof ApiError) || err.status !== 404) {
          const detail = getApiErrorDetail(err);
          setError(detail || 'Failed to open consultation link.');
          return;
        }

        if (!token) {
          sessionStorage.setItem('pending_join_code', code);
          navigate('/register', { replace: true });
          return;
        }

        try {
          const result = await magicJoin(code);
          navigate(`/form/${result.form_id}`, { replace: true });
        } catch (joinErr) {
          const detail = getApiErrorDetail(joinErr);
          setError(detail || 'Failed to join. Please try again.');
        }
      } finally {
        setJoining(false);
      }
    })();
  }, [code, token, navigate]);

  async function handleStartPublicSession(e: React.FormEvent) {
    e.preventDefault();
    if (!code) return;

    setError(null);
    setStartingPublicSession(true);
    try {
      const result = await startPublicFormSession(code, {
        participantName,
        consentGiven,
      });
      navigate(`/public/session/${result.session_token}`, { replace: true });
    } catch (err) {
      const detail = getApiErrorDetail(err);
      setError(detail || 'Could not open the public form.');
    } finally {
      setStartingPublicSession(false);
    }
  }

  // ── Manual entry mode: no code in URL ────────────────────────
  const handleManualJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setManualError('');
    setManualLoading(true);
    try {
      const result = await joinForm(manualCode.trim());
      navigate(`/form/${result.form_id}`, { replace: true });
    } catch (err: any) {
      const detail = getApiErrorDetail(err);
      setManualError(detail || (err.status === 404 ? 'Invalid join code. Please check and try again.' : `Could not join (HTTP ${err.status})`));
    } finally {
      setManualLoading(false);
    }
  };

  // ── Manual entry view ─────────────────────────────────────────
  if (!code) {
    return (
      <section className="flex-1 py-6 sm:py-8">
        <Container size="sm">
          <BackLink to="/" label="Dashboard" className="mb-6" />

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
          {publicForm && (
            <form onSubmit={handleStartPublicSession} className="space-y-5 text-left">
              <div className="text-center">
                <h1 className="text-2xl font-semibold text-foreground">{publicForm.title}</h1>
                {publicForm.description ? (
                  <p className="mt-2 text-sm" style={{ color: 'var(--muted-foreground)' }}>
                    {publicForm.description}
                  </p>
                ) : null}
              </div>

              <div>
                <label htmlFor="public-name" className="block text-sm font-medium text-foreground">
                  Your name
                </label>
                <input
                  id="public-name"
                  type="text"
                  value={participantName}
                  onChange={(event) => setParticipantName(event.target.value)}
                  className="mt-2 w-full rounded-lg px-4 py-3 text-sm"
                  style={{
                    border: '1px solid var(--input)',
                    backgroundColor: 'var(--background)',
                    color: 'var(--foreground)',
                  }}
                  placeholder="Enter your name"
                  autoFocus
                />
              </div>

              {publicForm.public_require_consent ? (
                <label className="flex items-start gap-3 rounded-xl p-4" style={{ border: '1px solid var(--border)' }}>
                  <input
                    type="checkbox"
                    checked={consentGiven}
                    onChange={(event) => setConsentGiven(event.target.checked)}
                    className="mt-1"
                  />
                  <span className="text-sm leading-6" style={{ color: 'var(--foreground)' }}>
                    {publicForm.public_consent_text}
                  </span>
                </label>
              ) : null}

              {error ? (
                <p className="text-sm text-center" style={{ color: 'var(--destructive)' }}>
                  {error}
                </p>
              ) : null}

              <LoadingButton
                type="submit"
                variant="accent"
                size="md"
                className="w-full"
                loading={startingPublicSession}
                disabled={!participantName.trim()}
              >
                Continue to form
              </LoadingButton>
            </form>
          )}
          {joining && (
            <>
              <div
                className="w-8 h-8 mx-auto mb-3 rounded-full border-2 border-t-transparent animate-spin"
                style={{ borderColor: 'var(--border)', borderTopColor: 'transparent' }}
              />
              <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>Joining consultation...</p>
            </>
          )}
          {error && !publicForm && !joining && (
            <>
              <p className="text-sm font-medium mb-3" style={{ color: 'var(--destructive)' }}>{error}</p>
              <BackLink to="/" label="Dashboard" />
            </>
          )}
        </div>
      </Container>
    </section>
  );
}
