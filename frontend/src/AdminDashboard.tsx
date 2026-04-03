import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { FileText, Pencil, Plus, Search, Settings, Ticket, Users } from 'lucide-react';
import { API_BASE_URL } from './config';
import { useAuth } from './AuthContext';
import { isCfAccessRedirect, clearAuthAndRedirect } from './api/client';
import Container from './layouts/Container';
import { LoadingButton, SkeletonDashboard } from './components';

/**
 * Admin dashboard — create forms, view/manage existing forms.
 *
 * Rendered inside PageLayout via Dashboard component.
 */
export default function AdminDashboard() {
  const { t } = useTranslation();
  const { token } = useAuth();
  const navigate = useNavigate();

  const [forms, setForms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const fetchForms = () => {
    if (!token) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    fetch(`${API_BASE_URL}/forms`, {
      headers: { Authorization: `Bearer ${token}` },
      credentials: 'include',
    })
      .then(r => {
        // Detect CF Access redirect
        if (isCfAccessRedirect(r)) {
          clearAuthAndRedirect();
          throw new Error('Session expired (CF Access). Redirecting…');
        }
        if (!r.ok) {
          if (r.status === 401) {
            clearAuthAndRedirect();
            throw new Error('Session expired. Please log in again.');
          } else if (r.status === 403) {
            throw new Error('Admin access required to view forms.');
          }
          throw new Error(`Failed to load forms (HTTP ${r.status})`);
        }
        // Verify response is JSON (not a CF HTML page)
        const contentType = r.headers.get('content-type') || '';
        if (!contentType.includes('application/json')) {
          clearAuthAndRedirect();
          throw new Error('Unexpected response — possible session expiry.');
        }
        return r.json();
      })
      .then(d => {
        setForms(Array.isArray(d) ? d : []);
        setLoading(false);
      })
      .catch(err => {
        // Network errors (TypeError from failed fetch) — don't crash
        if (err instanceof TypeError) {
          setError('Network error. Please check your connection.');
        } else {
          setError(err.message || 'Failed to load forms');
        }
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchForms();
  }, [token]);

  /* ── Filtered forms for search ── */
  const filteredForms = forms.filter(f => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (f.title && f.title.toLowerCase().includes(q)) ||
      (f.join_code && String(f.join_code).toLowerCase().includes(q))
    );
  });
  const visibleForms = [...filteredForms].sort((a, b) => {
    const participantDelta = (b.participant_count ?? 0) - (a.participant_count ?? 0);
    if (participantDelta !== 0) return participantDelta;
    const roundDelta = (b.current_round ?? 0) - (a.current_round ?? 0);
    if (roundDelta !== 0) return roundDelta;
    return String(a.title || '').localeCompare(String(b.title || ''));
  });

  if (loading) {
    return (
      <section className="flex-1 py-6 sm:py-8">
        <Container size="lg">
          <SkeletonDashboard />
        </Container>
      </section>
    );
  }

  return (
    <section className="flex-1 py-6 sm:py-8">
      <Container size="lg">
        {/* ── Error banner ── */}
        {error && (
          <div
            className="rounded-lg p-4 mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
            role="alert"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--destructive) 10%, transparent)',
              border: '1px solid var(--destructive)',
              color: 'var(--destructive)',
            }}
          >
            <span className="text-sm font-medium">{error}</span>
            <button
              type="button"
              onClick={fetchForms}
              className="self-start sm:self-auto px-3 py-1.5 rounded-lg text-sm font-medium"
              style={{
                backgroundColor: 'var(--destructive)',
                color: 'var(--destructive-foreground)',
              }}
            >
              {t('common.retry')}
            </button>
          </div>
        )}

        <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 flex-1">
            <h1
              className="text-3xl sm:text-[2.1rem] font-semibold tracking-tight"
              style={{ color: 'var(--foreground)' }}
            >
              {t('adminDashboard.title')}
            </h1>
            {forms.length > 0 && (
              <div className="relative mt-4 w-full sm:max-w-sm">
                <Search
                  size={15}
                  aria-hidden="true"
                  style={{
                    position: 'absolute',
                    left: 12,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--muted-foreground)',
                    pointerEvents: 'none',
                  }}
                />
                <input
                  type="text"
                  placeholder={t('adminDashboard.searchPlaceholder')}
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full text-sm"
                  aria-label={t('adminDashboard.searchLabel')}
                  style={{
                    height: '2.75rem',
                    borderRadius: '999px',
                    border: '1px solid color-mix(in srgb, var(--border) 60%, transparent)',
                    backgroundColor: 'color-mix(in srgb, var(--background) 70%, var(--card) 30%)',
                    color: 'var(--foreground)',
                    outline: 'none',
                    paddingLeft: '2.25rem',
                    paddingRight: '0.9rem',
                  }}
                  onFocus={e => {
                    e.currentTarget.style.borderColor = 'var(--accent)';
                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(37, 99, 235, 0.12)';
                  }}
                  onBlur={e => {
                    e.currentTarget.style.borderColor = 'color-mix(in srgb, var(--border) 60%, transparent)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                />
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap lg:justify-end">
            <LoadingButton
              variant="ghost"
              size="sm"
              onClick={() => navigate('/join')}
              aria-label={t('adminDashboard.joinCodeAction')}
            >
              <Ticket size={15} aria-hidden="true" /> {t('adminDashboard.joinCodeAction')}
            </LoadingButton>
            <LoadingButton
              variant="ghost"
              size="sm"
              onClick={() => navigate('/admin/settings')}
              aria-label={t('adminDashboard.openSettings', 'Open settings')}
            >
              <Settings size={15} aria-hidden="true" /> {t('common.settings')}
            </LoadingButton>
            <LoadingButton
              variant="ghost"
              size="sm"
              onClick={() => navigate('/admin/users')}
              aria-label={t('adminDashboard.manageUsers')}
            >
              <Users size={15} aria-hidden="true" /> {t('adminDashboard.users')}
            </LoadingButton>
            <LoadingButton
              variant="accent"
              size="sm"
              onClick={() => navigate('/admin/forms/new')}
              icon={<Plus size={15} aria-hidden="true" />}
            >
              {t('adminDashboard.newForm')}
            </LoadingButton>
          </div>
        </div>

        {forms.length === 0 ? (
          <div
            className="rounded-2xl px-6 sm:px-8 py-12 sm:py-14 text-center"
            style={{
              backgroundColor: 'var(--card)',
              border: '1px solid color-mix(in srgb, var(--border) 55%, transparent)',
              boxShadow: '0 20px 48px rgba(15, 23, 42, 0.05)',
            }}
          >
            <h2 className="text-xl font-semibold" style={{ color: 'var(--foreground)' }}>
              {t('adminDashboard.emptyTitle')}
            </h2>
            <p className="mt-2 text-sm max-w-md mx-auto" style={{ color: 'var(--muted-foreground)' }}>
              {t('adminDashboard.emptyBody')}
            </p>
            <LoadingButton
              variant="accent"
              size="sm"
              onClick={() => navigate('/admin/forms/new')}
              className="mt-5"
              icon={<Plus size={15} aria-hidden="true" />}
            >
              {t('adminDashboard.newForm')}
            </LoadingButton>
          </div>
        ) : (
          <div
            className="rounded-2xl overflow-hidden"
            style={{
              backgroundColor: 'var(--card)',
              border: '1px solid color-mix(in srgb, var(--border) 55%, transparent)',
              boxShadow: '0 20px 48px rgba(15, 23, 42, 0.05)',
            }}
          >
            {/* ── Empty search state ── */}
            {visibleForms.length === 0 && search && (
              <div className="px-3 sm:px-4 py-10 text-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="mx-auto mb-3"
                  style={{
                    width: '2.5rem',
                    height: '2.5rem',
                    color: 'var(--muted-foreground)',
                    opacity: 0.5,
                  }}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
                  />
                </svg>
                <p className="text-sm font-medium" style={{ color: 'var(--muted-foreground)' }}>
                  {t('adminDashboard.noFormsMatch', { query: search })}
                </p>
                <p
                  className="text-xs mt-1"
                  style={{ color: 'var(--muted-foreground)' }}
                >
                  {t('adminDashboard.tryDifferent')}
                </p>
              </div>
            )}

            {visibleForms.length > 0 && (
              <div className="hidden sm:block overflow-x-auto px-3 sm:px-4 pt-3 pb-3">
                <table
                  className="w-full text-sm text-left"
                  aria-label={t('adminDashboard.existingForms')}
                  style={{ borderCollapse: 'separate', borderSpacing: 0 }}
                >
                  <thead>
                    <tr
                      style={{
                        backgroundColor: 'transparent',
                      }}
                    >
                      {[t('adminDashboard.formTitle'), t('adminDashboard.joinCode'), t('adminDashboard.participants'), t('adminDashboard.round')].map(label => (
                        <th
                          key={label}
                          scope="col"
                          className="px-4 py-2.5 text-left"
                          style={{
                            color: 'var(--muted-foreground)',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            borderBottom: '1px solid color-mix(in srgb, var(--border) 55%, transparent)',
                          }}
                        >
                          {label}
                        </th>
                      ))}
                      <th
                        scope="col"
                        className="px-4 py-2.5 text-right"
                        style={{
                          color: 'var(--muted-foreground)',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          borderBottom: '1px solid color-mix(in srgb, var(--border) 55%, transparent)',
                        }}
                      >
                        {t('adminDashboard.actions')}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleForms.map((f: any, idx: number) => (
                      <tr
                        key={f.id}
                        className="transition-colors duration-150"
                        style={{
                          borderBottom:
                            idx < visibleForms.length - 1
                              ? '1px solid color-mix(in srgb, var(--border) 40%, transparent)'
                              : 'none',
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.backgroundColor = 'color-mix(in srgb, var(--accent) 4%, var(--card))';
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                      >
                        <td
                          className="px-4 py-4 font-medium text-sm"
                          style={{
                            color: 'var(--foreground)',
                            maxWidth: '26rem',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {f.title}
                        </td>
                        <td className="px-4 py-4">
                          <span
                            className="inline-block text-[13px] font-mono font-medium"
                            style={{
                              color: 'var(--muted-foreground)',
                              letterSpacing: '0.04em',
                            }}
                          >
                            {f.join_code}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <span
                            className="inline-flex items-center justify-center min-w-[2rem] h-7 px-2.5 rounded-full text-xs font-semibold"
                            style={{
                              backgroundColor: 'color-mix(in srgb, var(--muted) 75%, var(--card) 25%)',
                              color: (f.participant_count ?? 0) > 0 ? 'var(--foreground)' : 'var(--muted-foreground)',
                            }}
                          >
                            {f.participant_count ?? 0}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <span
                            className="text-sm font-medium"
                            style={{
                              color: 'var(--muted-foreground)',
                            }}
                          >
                            Round {f.current_round ?? 1}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            <a
                              href={`/admin/form/${f.id}`}
                              aria-label={`${t('adminDashboard.edit')} ${f.title}`}
                              title={t('adminDashboard.edit')}
                              className="inline-flex h-9 w-9 items-center justify-center rounded-full transition-colors duration-150"
                              style={{
                                color: 'var(--muted-foreground)',
                              }}
                              onMouseEnter={e => {
                                e.currentTarget.style.color = 'var(--foreground)';
                                e.currentTarget.style.backgroundColor = 'color-mix(in srgb, var(--foreground) 6%, transparent)';
                              }}
                              onMouseLeave={e => {
                                e.currentTarget.style.color = 'var(--muted-foreground)';
                                e.currentTarget.style.backgroundColor = 'transparent';
                              }}
                            >
                              <Pencil size={15} aria-hidden="true" />
                            </a>
                            <a
                              href={`/admin/form/${f.id}/summary`}
                              aria-label={`${t('adminDashboard.summary')} ${f.title}`}
                              title={t('adminDashboard.summary')}
                              className="inline-flex h-9 w-9 items-center justify-center rounded-full transition-colors duration-150"
                              style={{
                                color: 'var(--muted-foreground)',
                              }}
                              onMouseEnter={e => {
                                e.currentTarget.style.color = 'var(--foreground)';
                                e.currentTarget.style.backgroundColor = 'color-mix(in srgb, var(--accent) 7%, transparent)';
                              }}
                              onMouseLeave={e => {
                                e.currentTarget.style.color = 'var(--muted-foreground)';
                                e.currentTarget.style.backgroundColor = 'transparent';
                              }}
                            >
                              <FileText size={15} aria-hidden="true" />
                            </a>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {visibleForms.length > 0 && (
              <div className="sm:hidden px-4 pt-4 pb-4 space-y-3">
                {visibleForms.map((f: any) => {
                  const participantCount = f.participant_count ?? 0;
                  const participantLabel = `${participantCount} participant${participantCount === 1 ? '' : 's'}`;
                  return (
                    <div
                      key={f.id}
                      className="rounded-2xl px-4 py-4 transition-colors duration-150"
                      style={{
                        backgroundColor: 'color-mix(in srgb, var(--card) 96%, var(--background) 4%)',
                        border: '1px solid color-mix(in srgb, var(--border) 55%, transparent)',
                      }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div
                            className="font-semibold text-sm leading-snug"
                            style={{ color: 'var(--foreground)' }}
                          >
                            {f.title}
                          </div>
                          <div
                            className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm"
                            style={{ color: 'var(--muted-foreground)' }}
                          >
                            <span
                              className="font-mono text-[13px]"
                              style={{ letterSpacing: '0.04em' }}
                            >
                              {f.join_code}
                            </span>
                            <span>{participantLabel}</span>
                            <span>Round {f.current_round ?? 1}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <a
                            href={`/admin/form/${f.id}`}
                            aria-label={`${t('adminDashboard.edit')} ${f.title}`}
                            title={t('adminDashboard.edit')}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-full transition-colors duration-150"
                            style={{ color: 'var(--muted-foreground)' }}
                            onMouseEnter={e => {
                              e.currentTarget.style.color = 'var(--foreground)';
                              e.currentTarget.style.backgroundColor = 'color-mix(in srgb, var(--foreground) 6%, transparent)';
                            }}
                            onMouseLeave={e => {
                              e.currentTarget.style.color = 'var(--muted-foreground)';
                              e.currentTarget.style.backgroundColor = 'transparent';
                            }}
                          >
                            <Pencil size={15} aria-hidden="true" />
                          </a>
                          <a
                            href={`/admin/form/${f.id}/summary`}
                            aria-label={`${t('adminDashboard.summary')} ${f.title}`}
                            title={t('adminDashboard.summary')}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-full transition-colors duration-150"
                            style={{ color: 'var(--muted-foreground)' }}
                            onMouseEnter={e => {
                              e.currentTarget.style.color = 'var(--foreground)';
                              e.currentTarget.style.backgroundColor = 'color-mix(in srgb, var(--accent) 7%, transparent)';
                            }}
                            onMouseLeave={e => {
                              e.currentTarget.style.color = 'var(--muted-foreground)';
                              e.currentTarget.style.backgroundColor = 'transparent';
                            }}
                          >
                            <FileText size={15} aria-hidden="true" />
                          </a>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {search && visibleForms.length > 0 && (
              <div
                className="px-5 sm:px-6 py-3 text-xs"
                style={{
                  borderTop: '1px solid color-mix(in srgb, var(--border) 45%, transparent)',
                  color: 'var(--muted-foreground)',
                }}
              >
                {t('common.showingResults', { count: visibleForms.length, total: forms.length })}
              </div>
            )}
          </div>
        )}
      </Container>
    </section>
  );
}
