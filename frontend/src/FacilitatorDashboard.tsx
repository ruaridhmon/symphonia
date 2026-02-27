import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Clock, FileText, PlusCircle, ClipboardCopy, Trash2, RefreshCw } from 'lucide-react';
import { useAuth } from './AuthContext';
import {
  getMyForms, Form,
  OwnedForm, createUserForm, getMyCreatedForms, deleteMyForm, regenerateJoinCode,
} from './api/forms';
import { api } from './api/client';
import { ApiError } from './api/client';
import Container from './layouts/Container';
import { LoadingButton } from './components';
import Skeleton, { SkeletonCard } from './components/Skeleton';
import { useDocumentTitle } from './hooks/useDocumentTitle';

interface FormStatus {
  submitted: boolean;
  roundNumber: number | null;
}

/**
 * Facilitator dashboard — create and manage own consultations,
 * plus join other facilitators' consultations as an expert.
 */
export default function FacilitatorDashboard() {
  useDocumentTitle('My Consultations');
  const { token } = useAuth();
  const navigate = useNavigate();
  const [myForms, setMyForms] = useState<Form[]>([]);
  const [formStatuses, setFormStatuses] = useState<Record<number, FormStatus>>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Owned-form state
  const [ownedForms, setOwnedForms] = useState<OwnedForm[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newFormTitle, setNewFormTitle] = useState('');
  const [newFormAllowJoin, setNewFormAllowJoin] = useState(true);
  const [createdCode, setCreatedCode] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [regenLoading, setRegenLoading] = useState<Record<number, boolean>>({});

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
            submitted: submitRes.status === 'fulfilled' ? submitRes.value.submitted : false,
            roundNumber: roundRes.status === 'fulfilled' ? roundRes.value.round_number : null,
          };
        } catch {
          statuses[f.id] = { submitted: false, roundNumber: null };
        }
      })
    );
    setFormStatuses(statuses);
  }, []);

  const fetchMyForms = useCallback(async () => {
    if (!token) { setLoading(false); return; }
    try {
      setError(null);
      setLoading(true);
      const data = await getMyForms();
      const forms = Array.isArray(data) ? data : [];
      setMyForms(forms);
      fetchStatuses(forms);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 401) return;
        setError(`Failed to load forms (HTTP ${err.status})`);
      } else {
        setError('Failed to load forms. Please check your connection.');
      }
    } finally {
      setLoading(false);
    }
  }, [token, fetchStatuses]);

  useEffect(() => { fetchMyForms(); }, [fetchMyForms]);

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
    } catch { /* silent */ }
  };

  const handleRegenCode = async (formId: number) => {
    setRegenLoading(prev => ({ ...prev, [formId]: true }));
    try {
      const result = await regenerateJoinCode(formId);
      setOwnedForms(prev =>
        prev.map(f => f.id === formId ? { ...f, join_code: result.join_code } : f)
      );
    } catch { /* silent */ }
    finally { setRegenLoading(prev => ({ ...prev, [formId]: false })); }
  };


  return (
    <section className="flex-1 py-6 sm:py-8">
      <Container size="md">
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
            <LoadingButton variant="destructive" size="sm" onClick={fetchMyForms}>Retry</LoadingButton>
          </div>
        )}

        {/* My Consultations (owned forms) */}
        <div
          className="rounded-xl p-6 sm:p-8 mb-6 sm:mb-8"
          style={{
            backgroundColor: 'var(--card)',
            border: '1px solid var(--border)',
            boxShadow: 'var(--card-shadow, none)',
          }}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold" style={{ color: 'var(--foreground)' }}>
              My Consultations
            </h2>
            <button
              onClick={() => { setShowCreateForm(v => !v); setCreateError(null); setCreatedCode(null); }}
              className="inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg font-medium"
              style={{
                backgroundColor: 'color-mix(in srgb, var(--accent) 12%, transparent)',
                color: 'var(--accent)',
                border: '1px solid color-mix(in srgb, var(--accent) 30%, transparent)',
              }}
            >
              <PlusCircle size={14} />
              New Consultation
            </button>
          </div>

          {showCreateForm && (
            <div
              className="rounded-lg p-4 mb-4 space-y-3"
              style={{ backgroundColor: 'var(--muted)', border: '1px solid var(--border)' }}
            >
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--foreground)' }}>
                  Consultation Title
                </label>
                <input
                  type="text"
                  placeholder="Enter title..."
                  value={newFormTitle}
                  onChange={e => setNewFormTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg text-sm"
                  style={{ border: '1px solid var(--input)', backgroundColor: 'var(--background)', color: 'var(--foreground)' }}
                />
              </div>
              <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: 'var(--foreground)' }}>
                <input type="checkbox" checked={newFormAllowJoin} onChange={e => setNewFormAllowJoin(e.target.checked)} />
                Allow participants to join via code
              </label>
              {createError && <p className="text-sm" style={{ color: 'var(--destructive)' }}>{createError}</p>}
              <div className="flex gap-2">
                <LoadingButton variant="accent" size="sm" loading={creating} onClick={handleCreateForm}>Create</LoadingButton>
                <LoadingButton variant="ghost" size="sm" onClick={() => { setShowCreateForm(false); setCreateError(null); }}>Cancel</LoadingButton>
              </div>
            </div>
          )}

          {createdCode && (
            <div
              className="rounded-lg p-3 mb-4 flex items-center justify-between gap-3"
              style={{
                backgroundColor: 'color-mix(in srgb, var(--success) 10%, transparent)',
                border: '1px solid color-mix(in srgb, var(--success) 40%, transparent)',
              }}
            >
              <div>
                <p className="text-xs font-medium mb-0.5" style={{ color: 'var(--success)' }}>
                  Consultation created! Share this join code with your experts:
                </p>
                <p className="text-sm font-mono font-bold" style={{ color: 'var(--foreground)' }}>{createdCode}</p>
              </div>
              <button
                onClick={() => { navigator.clipboard.writeText(createdCode); }}
                className="p-1.5 rounded" title="Copy join code"
                style={{ color: 'var(--success)' }}
              >
                <ClipboardCopy size={16} />
              </button>
            </div>
          )}

          {ownedForms.length === 0 && !showCreateForm ? (
            <div className="text-center py-6">
              <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
                No consultations created yet. Click <strong>New Consultation</strong> to start one.
              </p>
            </div>
          ) : (
            <ul className="space-y-2">
              {ownedForms.map(f => (
                <li
                  key={f.id}
                  className="rounded-lg p-3 flex items-center justify-between gap-3"
                  style={{ backgroundColor: 'var(--muted)', border: '1px solid var(--border)' }}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: 'var(--foreground)' }}>{f.title}</p>
                    <div className="flex items-center gap-3 mt-0.5 text-xs" style={{ color: 'var(--muted-foreground)' }}>
                      <span>Round {f.round_count}</span>
                      {f.participant_count !== undefined && <span>{f.participant_count} participants</span>}
                      <button
                        className="inline-flex items-center gap-1 hover:underline"
                        title="Copy join code"
                        onClick={() => navigator.clipboard.writeText(f.join_code)}
                        style={{ color: 'var(--accent)' }}
                      >
                        <ClipboardCopy size={11} />
                        {f.join_code}
                      </button>
                      <button
                        className="inline-flex items-center gap-1 hover:opacity-70"
                        title="Regenerate join code"
                        onClick={() => handleRegenCode(f.id)}
                        disabled={regenLoading[f.id]}
                        style={{ color: 'var(--muted-foreground)' }}
                      >
                        <RefreshCw size={11} style={regenLoading[f.id] ? { animation: 'spin 1s linear infinite' } : {}} />
                      </button>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteOwned(f.id)}
                    className="p-1.5 rounded hover:opacity-80" title="Delete form"
                    style={{ color: 'var(--destructive)' }}
                  >
                    <Trash2 size={15} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* ── Join consultation banner ── */}
        <div
          className="mb-6 rounded-xl flex items-center justify-between gap-4 px-5 py-4"
          style={{
            background: 'linear-gradient(135deg, color-mix(in srgb, var(--accent) 8%, transparent), color-mix(in srgb, var(--accent) 3%, transparent))',
            border: '1px solid color-mix(in srgb, var(--accent) 20%, transparent)',
          }}
        >
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>
              Joining another consultation as an expert?
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--muted-foreground)' }}>
              Enter the join code you received from the facilitator
            </p>
          </div>
          <LoadingButton
            variant="accent"
            size="sm"
            onClick={() => navigate('/join')}
            style={{ flexShrink: 0 }}
          >
            🎟️ Enter join code
          </LoadingButton>
        </div>

        {/* Participating In (forms joined via code) */}
        <div
          className="rounded-xl p-6 sm:p-8"
          style={{
            backgroundColor: 'var(--card)',
            border: '1px solid var(--border)',
            boxShadow: 'var(--card-shadow, none)',
          }}
        >
          <h2 className="text-xl font-semibold mb-4" style={{ color: 'var(--foreground)' }}>
            Participating In
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
                  <p className="text-sm font-medium mb-1" style={{ color: 'var(--foreground)' }}>
                    Not participating in any other consultations
                  </p>
                  <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
                    Enter a join code above to participate as an expert in another facilitator's consultation.
                  </p>
                </div>
              )}
              {myForms.map((f) => {
                const status = formStatuses[f.id];
                return (
                  <li
                    key={f.id}
                    className="form-item rounded-lg p-4 relative overflow-hidden"
                    style={{ backgroundColor: 'var(--muted)', border: '1px solid var(--border)' }}
                  >
                    <div className="flex flex-col gap-1.5 pr-16">
                      <span style={{ color: 'var(--foreground)', fontWeight: 500 }}>{f.title}</span>
                      <div className="flex flex-wrap items-center gap-2">
                        {status?.roundNumber != null && (
                          <span
                            className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full"
                            style={{ backgroundColor: 'color-mix(in srgb, var(--accent) 12%, transparent)', color: 'var(--accent)' }}
                          >
                            <FileText size={11} /> Round {status.roundNumber}
                          </span>
                        )}
                        {status?.submitted ? (
                          <span
                            className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full"
                            style={{ backgroundColor: 'color-mix(in srgb, var(--success) 12%, transparent)', color: 'var(--success)' }}
                          >
                            <CheckCircle2 size={11} /> Submitted
                          </span>
                        ) : status ? (
                          <span
                            className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full"
                            style={{ backgroundColor: 'color-mix(in srgb, var(--warning) 12%, transparent)', color: 'var(--warning-foreground)' }}
                          >
                            <Clock size={11} /> Awaiting response
                          </span>
                        ) : null}
                      </div>
                    </div>
                    <div className="form-item-action">
                      <LoadingButton variant="success" size="sm" onClick={() => navigate(`/form/${f.id}`)}>
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
