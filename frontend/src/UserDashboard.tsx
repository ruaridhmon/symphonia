import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Clock, FileText, PlusCircle, ClipboardCopy, Trash2, RefreshCw } from 'lucide-react';
import { useAuth } from './AuthContext';
import {
  createUserForm,
  deleteMyForm,
  Form,
  getMyCreatedForms,
  getMyForms,
  joinForm,
  OwnedForm,
  regenerateJoinCode,
} from './api/forms';
import { api, ApiError, getApiErrorDetail } from './api/client';
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

  // Owned-form state
  const [ownedForms, setOwnedForms] = useState<OwnedForm[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newFormTitle, setNewFormTitle] = useState('');
  const [newFormAllowJoin, setNewFormAllowJoin] = useState(true);
  const [createdCode, setCreatedCode] = useState<string | null>(null);
  const [createdFormId, setCreatedFormId] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [regenLoading, setRegenLoading] = useState<Record<number, boolean>>({});

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

  useEffect(() => {
    getMyCreatedForms().then(setOwnedForms).catch(() => {});
  }, []);

  const handleCreateForm = async () => {
    if (!newFormTitle.trim()) return;
    setCreating(true);
    setCreateError(null);
    try {
      const result = await createUserForm({ title: newFormTitle, allow_join: newFormAllowJoin });
      setOwnedForms(prev => [result, ...prev]);
      setCreatedCode(result.join_code);
      setCreatedFormId(result.id);
      setNewFormTitle('');
      setShowCreateForm(false);
    } catch (e) {
      setCreateError(e instanceof ApiError ? `Error: ${e.message}` : 'Could not create form. Please try again.');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteOwned = async (formId: number) => {
    try {
      await deleteMyForm(formId);
      setOwnedForms(prev => prev.filter(f => f.id !== formId));
    } catch {
      // silently ignore for now
    }
  };

  const handleRegenCode = async (formId: number) => {
    setRegenLoading(prev => ({ ...prev, [formId]: true }));
    try {
      const result = await regenerateJoinCode(formId);
      setOwnedForms(prev =>
        prev.map(f => f.id === formId ? { ...f, join_code: result.join_code } : f)
      );
    } catch {
      // silent fail acceptable
    } finally {
      setRegenLoading(prev => ({ ...prev, [formId]: false }));
    }
  };

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode) return;

    try {
      await joinForm(joinCode.trim());
      setJoinCode('');
      setJoinError('');
      fetchMyForms();
    } catch (err) {
      if (err instanceof ApiError) {
        setJoinError(
          getApiErrorDetail(err)
            || (err.status === 404
              ? 'Invalid join code.'
              : `Could not join form (HTTP ${err.status})`)
        );
      } else {
        setJoinError('Something went wrong. Please try again.');
      }
    }
  };

  return (
    <section className="flex-1 py-4 sm:py-6">
      <Container size="md">
        {error && (
          <div
            className="mb-5 flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-sm"
            role="alert"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--destructive) 7%, transparent)',
              color: 'var(--destructive)',
            }}
          >
            <span>{error}</span>
            <button type="button" onClick={fetchMyForms} className="font-medium">Retry</button>
          </div>
        )}

        <div className="mb-7 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={() => {
              setShowCreateForm(v => !v);
              setCreateError(null);
              setCreatedCode(null);
              setCreatedFormId(null);
            }}
            className="inline-flex items-center gap-1.5 text-sm font-medium"
            style={{ color: 'var(--foreground)' }}
          >
            <PlusCircle size={16} />
            New
          </button>

          <form onSubmit={handleUnlock} className="flex w-full gap-2 sm:w-auto">
            <label htmlFor="join-code-input" className="sr-only">Join code</label>
            <input
              id="join-code-input"
              type="text"
              placeholder="Join with code"
              value={joinCode}
              onChange={e => {
                setJoinCode(e.target.value);
                setJoinError('');
              }}
              className="min-w-0 flex-1 rounded-lg px-3 py-2 text-sm sm:w-44"
              style={{
                border: '1px solid var(--border)',
                backgroundColor: 'transparent',
                color: 'var(--foreground)',
              }}
            />
            <LoadingButton type="submit" variant="ghost" size="sm">Join</LoadingButton>
          </form>
        </div>

        {joinError && (
          <p className="-mt-4 mb-5 text-right text-xs" style={{ color: 'var(--destructive)' }}>
            {joinError}
          </p>
        )}

        {showCreateForm && (
          <div
            className="mb-7 rounded-xl p-4 sm:p-5"
            style={{ backgroundColor: 'color-mix(in srgb, var(--muted) 55%, transparent)' }}
          >
            <input
              type="text"
              autoFocus
              placeholder="Untitled consultation"
              value={newFormTitle}
              onChange={e => setNewFormTitle(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && newFormTitle.trim()) void handleCreateForm();
              }}
              className="w-full bg-transparent text-base font-medium outline-none"
              style={{ color: 'var(--foreground)' }}
            />
            {createError && (
              <p className="mt-2 text-sm" style={{ color: 'var(--destructive)' }}>{createError}</p>
            )}
            <div className="mt-4 flex items-center justify-end gap-2">
              <LoadingButton
                variant="ghost"
                size="sm"
                onClick={() => { setShowCreateForm(false); setCreateError(null); }}
              >
                Cancel
              </LoadingButton>
              <LoadingButton
                variant="accent"
                size="sm"
                loading={creating}
                onClick={handleCreateForm}
                disabled={!newFormTitle.trim()}
              >
                Create
              </LoadingButton>
            </div>
          </div>
        )}

        {createdCode && (
          <div className="mb-6 flex items-center justify-between gap-3 text-sm">
            <span style={{ color: 'var(--muted-foreground)' }}>
              Created · code <strong style={{ color: 'var(--foreground)' }}>{createdCode}</strong>
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => navigator.clipboard.writeText(createdCode)}
                className="inline-flex items-center gap-1 text-sm"
                style={{ color: 'var(--muted-foreground)' }}
              >
                <ClipboardCopy size={14} /> Copy
              </button>
              {createdFormId && (
                <button
                  type="button"
                  onClick={() => navigate(`/form/${createdFormId}`)}
                  className="text-sm font-medium"
                  style={{ color: 'var(--foreground)' }}
                >
                  Open
                </button>
              )}
            </div>
          </div>
        )}

        <div>
          {ownedForms.length === 0 && !showCreateForm && !loading && myForms.length === 0 ? (
            <div className="py-20 text-center">
              <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
                Nothing here yet.
              </p>
            </div>
          ) : (
            <>
              {ownedForms.length > 0 && (
                <ul>
                  {ownedForms.map(f => (
                    <li
                      key={f.id}
                      className="group flex items-center justify-between gap-4 border-b py-4"
                      style={{ borderColor: 'color-mix(in srgb, var(--border) 55%, transparent)' }}
                    >
                      <button
                        type="button"
                        onClick={() => navigate(`/form/${f.id}`)}
                        className="min-w-0 flex-1 text-left"
                      >
                        <p className="truncate text-[15px] font-medium" style={{ color: 'var(--foreground)' }}>{f.title}</p>
                        <p className="mt-1 text-xs" style={{ color: 'var(--muted-foreground)' }}>
                          Round {f.round_count}{f.participant_count !== undefined ? ` · ${f.participant_count} participants` : ''}
                        </p>
                      </button>
                      <div className="flex items-center gap-2 opacity-70 transition-opacity group-hover:opacity-100">
                        <button
                          type="button"
                          onClick={() => navigator.clipboard.writeText(f.join_code)}
                          className="p-1.5"
                          title={`Copy join code ${f.join_code}`}
                          style={{ color: 'var(--muted-foreground)' }}
                        >
                          <ClipboardCopy size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRegenCode(f.id)}
                          disabled={regenLoading[f.id]}
                          className="p-1.5"
                          title="Regenerate join code"
                          style={{ color: 'var(--muted-foreground)' }}
                        >
                          <RefreshCw size={14} style={regenLoading[f.id] ? { animation: 'spin 1s linear infinite' } : {}} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteOwned(f.id)}
                          className="p-1.5"
                          title="Delete"
                          style={{ color: 'var(--muted-foreground)' }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}

              {myForms.length > 0 && (
                <div className={ownedForms.length > 0 ? 'mt-8' : ''}>
                  {ownedForms.length > 0 && (
                    <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.14em]" style={{ color: 'var(--muted-foreground)' }}>
                      Joined
                    </p>
                  )}
                  <ul>
                    {myForms.map(f => {
                      const status = formStatuses[f.id];
                      return (
                        <li
                          key={f.id}
                          className="group flex items-center justify-between gap-4 border-b py-4"
                          style={{ borderColor: 'color-mix(in srgb, var(--border) 55%, transparent)' }}
                        >
                          <button
                            type="button"
                            onClick={() => navigate(`/form/${f.id}`)}
                            className="min-w-0 flex-1 text-left"
                          >
                            <p className="truncate text-[15px] font-medium" style={{ color: 'var(--foreground)' }}>{f.title}</p>
                            <p className="mt-1 text-xs" style={{ color: 'var(--muted-foreground)' }}>
                              {status?.roundNumber != null ? `Round ${status.roundNumber}` : 'Open'}
                              {status ? ` · ${status.submitted ? 'Response sent' : 'Response needed'}` : ''}
                            </p>
                          </button>
                          <span className="text-sm opacity-0 transition-opacity group-hover:opacity-60" aria-hidden="true">→</span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </>
          )}

          {loading && (
            <div className="space-y-3 py-4">
              <SkeletonCard />
              <SkeletonCard />
            </div>
          )}
        </div>
      </Container>
    </section>
  );
}
