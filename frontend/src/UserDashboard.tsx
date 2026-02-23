import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Clock, FileText } from 'lucide-react';
import { useAuth } from './AuthContext';
import { getMyForms, unlockForm, Form } from './api/forms';
import { api } from './api/client';
import { ApiError } from './api/client';
import Container from './layouts/Container';
import { LoadingButton } from './components';
import Skeleton, { SkeletonCard } from './components/Skeleton';
import { useDocumentTitle } from './hooks/useDocumentTitle';

/** Per-form status info fetched from the API */
interface FormStatus {
  submitted: boolean;
  roundNumber: number | null;
}

/**
 * User dashboard — join forms via code, view/enter joined forms.
 *
 * Rendered inside PageLayout via Dashboard component.
 * Uses <section> instead of <main> to avoid nesting <main> inside PageLayout's <main>.
 */
export default function UserDashboard() {
  useDocumentTitle('My Forms');
  const { token } = useAuth();
  const navigate = useNavigate();
  const [myForms, setMyForms] = useState<Form[]>([]);
  const [formStatuses, setFormStatuses] = useState<Record<number, FormStatus>>({});
  const [joinCode, setJoinCode] = useState('');
  const [joinError, setJoinError] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  /** Fetch submission status + round info for a list of forms */
  const fetchStatuses = useCallback(async (forms: Form[]) => {
    const statuses: Record<number, FormStatus> = {};
    await Promise.allSettled(
      forms.map(async (f) => {
        try {
          const [submitRes, roundRes] = await Promise.allSettled([
            api.get<{ submitted: boolean }>(`/has_submitted?form_id=${f.id}`),
            api.get<{ round_number: number }>(`/forms/${f.id}/active_round`),
          ]);
          statuses[f.id] = {
            submitted:
              submitRes.status === 'fulfilled' ? submitRes.value.submitted : false,
            roundNumber:
              roundRes.status === 'fulfilled' ? roundRes.value.round_number : null,
          };
        } catch {
          statuses[f.id] = { submitted: false, roundNumber: null };
        }
      })
    );
    setFormStatuses(statuses);
  }, []);

  const fetchMyForms = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      setError(null);
      setLoading(true);
      const data = await getMyForms();
      const forms = Array.isArray(data) ? data : [];
      setMyForms(forms);
      // Fire-and-forget status enrichment
      fetchStatuses(forms);
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
  }, [token, fetchStatuses]);

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
              aria-label="Join code"
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
            <ul className="space-y-3 stagger-enter">
              {myForms.length === 0 && (
                <div className="text-center py-8">
                  <div className="text-3xl mb-3 opacity-40">📭</div>
                  <p className="text-sm font-medium mb-1" style={{ color: 'var(--foreground)' }}>
                    No consultations yet
                  </p>
                  <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
                    Enter a join code above to access your first consultation.
                  </p>
                </div>
              )}
              {myForms.map((f) => {
                const status = formStatuses[f.id];
                return (
                  <li
                    key={f.id}
                    className="form-item rounded-lg p-4 relative overflow-hidden"
                    style={{
                      backgroundColor: 'var(--muted)',
                      border: '1px solid var(--border)',
                    }}
                  >
                    <div className="flex flex-col gap-1.5 pr-16">
                      <span style={{ color: 'var(--foreground)', fontWeight: 500 }}>{f.title}</span>
                      <div className="flex flex-wrap items-center gap-2">
                        {status?.roundNumber != null && (
                          <span
                            className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full"
                            style={{
                              backgroundColor: 'color-mix(in srgb, var(--accent) 12%, transparent)',
                              color: 'var(--accent)',
                            }}
                          >
                            <FileText size={11} />
                            Round {status.roundNumber}
                          </span>
                        )}
                        {status?.submitted ? (
                          <span
                            className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full"
                            style={{
                              backgroundColor: 'color-mix(in srgb, var(--success) 12%, transparent)',
                              color: 'var(--success)',
                            }}
                          >
                            <CheckCircle2 size={11} />
                            Submitted
                          </span>
                        ) : status ? (
                          <span
                            className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full"
                            style={{
                              backgroundColor: 'color-mix(in srgb, var(--warning) 12%, transparent)',
                              color: 'var(--warning-foreground)',
                            }}
                          >
                            <Clock size={11} />
                            Awaiting response
                          </span>
                        ) : null}
                      </div>
                    </div>
                    {/* Float-in action — slides in from right on hover */}
                    <div className="form-item-action">
                      <LoadingButton
                        variant="success"
                        size="sm"
                        onClick={() => navigate(`/form/${f.id}`)}
                      >
                        {status?.submitted ? 'Review' : 'Enter'}
                      </LoadingButton>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </Container>
    </section>
  );
}
