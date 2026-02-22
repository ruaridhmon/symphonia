import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from './config';
import { useAuth } from './AuthContext';
import Container from './layouts/Container';
import { LoadingButton, SkeletonDashboard } from './components';
import { useDocumentTitle } from './hooks/useDocumentTitle';

/**
 * Admin dashboard — create forms, view/manage existing forms.
 *
 * Rendered inside PageLayout via Dashboard component.
 */
export default function AdminDashboard() {
  useDocumentTitle('Admin Dashboard');
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
    })
      .then(r => {
        if (!r.ok) {
          if (r.status === 401) {
            throw new Error('Session expired. Please log in again.');
          } else if (r.status === 403) {
            throw new Error('Admin access required to view forms.');
          }
          throw new Error(`Failed to load forms (HTTP ${r.status})`);
        }
        return r.json();
      })
      .then(d => {
        setForms(Array.isArray(d) ? d : []);
        setLoading(false);
      })
      .catch(err => {
        console.error('[AdminDashboard] Failed to load forms:', err);
        setError(err.message || 'Failed to load forms');
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
              Retry
            </button>
          </div>
        )}

        {/* ── Create form CTA ── */}
        <div className="flex items-center justify-between mb-6 sm:mb-8">
          <div>
            <h1
              className="text-2xl font-bold tracking-tight"
              style={{ color: 'var(--foreground)' }}
            >
              Admin Dashboard
            </h1>
            <p className="text-sm mt-1" style={{ color: 'var(--muted-foreground)' }}>
              Create and manage your Delphi consultation forms
            </p>
          </div>
          <div className="flex items-center gap-2">
            <LoadingButton
              variant="ghost"
              size="md"
              onClick={() => navigate('/admin/settings')}
            >
              ⚙ Settings
            </LoadingButton>
            <LoadingButton
              variant="accent"
              size="md"
              onClick={() => navigate('/admin/forms/new')}
            >
              + New Form
            </LoadingButton>
          </div>
        </div>

        {/* ── Empty state when no forms ── */}
        {!loading && forms.length === 0 && !error && (
          <div
            className="rounded-xl p-8 sm:p-12 text-center"
            style={{
              backgroundColor: 'var(--card)',
              border: '1px solid var(--border)',
              boxShadow: 'var(--card-shadow, none)',
            }}
          >
            <div className="text-4xl mb-4 opacity-40">🎼</div>
            <h2
              className="text-lg font-semibold mb-2"
              style={{ color: 'var(--foreground)' }}
            >
              No consultations yet
            </h2>
            <p
              className="text-sm mb-6 max-w-md mx-auto"
              style={{ color: 'var(--muted-foreground)' }}
            >
              Create your first Delphi consultation to start gathering expert consensus.
              Each form guides participants through structured rounds of feedback.
            </p>
            <LoadingButton
              variant="accent"
              size="lg"
              onClick={() => navigate('/admin/forms/new')}
            >
              Create Your First Consultation
            </LoadingButton>
          </div>
        )}

        {/* ── Existing forms ── */}
        {forms.length > 0 && (
          <div
            className="rounded-lg overflow-hidden"
            style={{
              backgroundColor: 'var(--card)',
              border: '1px solid var(--border)',
              boxShadow: 'var(--card-shadow, none)',
            }}
          >
            {/* Section header + search */}
            <div
              className="p-4 sm:p-6 pb-0 sm:pb-0"
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                {/* Left: title + count badge */}
                <div className="flex items-center gap-3">
                  <h2
                    className="text-lg font-semibold"
                    style={{ color: 'var(--foreground)' }}
                  >
                    Existing Forms
                  </h2>
                  <span
                    className="inline-flex items-center justify-center text-xs font-bold px-2.5 py-0.5 rounded-full"
                    style={{
                      backgroundColor: 'rgba(37, 99, 235, 0.1)',
                      color: 'var(--accent)',
                      minWidth: '1.75rem',
                    }}
                  >
                    {forms.length}
                  </span>
                </div>

                {/* Right: search input */}
                <div
                  className="relative w-full sm:w-72"
                  role="search"
                >
                  {/* Search icon */}
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                    style={{
                      width: '1rem',
                      height: '1rem',
                      color: 'var(--muted-foreground)',
                    }}
                  >
                    <path
                      fillRule="evenodd"
                      d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <input
                    type="text"
                    placeholder="Search forms by title or code…"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="w-full text-sm pl-9 pr-3"
                    aria-label="Search forms by title or join code"
                    style={{
                      height: '2.5rem',
                      borderRadius: 'var(--radius)',
                      border: '1px solid var(--input)',
                      backgroundColor: 'var(--card)',
                      color: 'var(--foreground)',
                    }}
                  />
                </div>
              </div>
            </div>

            {/* ── Empty search state ── */}
            {filteredForms.length === 0 && search && (
              <div className="px-4 sm:px-6 py-12 text-center">
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
                  No forms match "<span style={{ color: 'var(--foreground)' }}>{search}</span>"
                </p>
                <p
                  className="text-xs mt-1"
                  style={{ color: 'var(--muted-foreground)' }}
                >
                  Try a different title or join code
                </p>
              </div>
            )}

            {/* ── Desktop table ── */}
            {filteredForms.length > 0 && (
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-sm text-left" style={{ borderCollapse: 'separate', borderSpacing: 0 }} aria-label="Consultation forms">
                  <thead>
                    <tr
                      style={{
                        backgroundColor: 'var(--muted)',
                      }}
                    >
                      <th
                        scope="col"
                        className="px-6 py-3 text-left"
                        style={{
                          color: 'var(--muted-foreground)',
                          fontSize: '0.6875rem',
                          fontWeight: 600,
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          borderBottom: '1px solid var(--border)',
                        }}
                      >
                        Form Title
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left"
                        style={{
                          color: 'var(--muted-foreground)',
                          fontSize: '0.6875rem',
                          fontWeight: 600,
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          borderBottom: '1px solid var(--border)',
                        }}
                      >
                        Join Code
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left"
                        style={{
                          color: 'var(--muted-foreground)',
                          fontSize: '0.6875rem',
                          fontWeight: 600,
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          borderBottom: '1px solid var(--border)',
                        }}
                      >
                        Participants
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left"
                        style={{
                          color: 'var(--muted-foreground)',
                          fontSize: '0.6875rem',
                          fontWeight: 600,
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          borderBottom: '1px solid var(--border)',
                        }}
                      >
                        Round
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-right"
                        style={{
                          color: 'var(--muted-foreground)',
                          fontSize: '0.6875rem',
                          fontWeight: 600,
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          borderBottom: '1px solid var(--border)',
                        }}
                      >
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredForms.map((f: any, idx: number) => (
                      <tr
                        key={f.id}
                        className="transition-colors duration-150"
                        style={{
                          borderBottom:
                            idx < filteredForms.length - 1
                              ? '1px solid var(--border)'
                              : 'none',
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.backgroundColor = 'var(--muted)';
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                      >
                        <td
                          className="px-6 py-3.5 font-medium"
                          style={{
                            color: 'var(--foreground)',
                            maxWidth: '20rem',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {f.title}
                        </td>
                        <td className="px-6 py-3.5">
                          <code
                            className="inline-block px-2.5 py-1 rounded-md text-xs font-mono font-semibold"
                            style={{
                              backgroundColor: 'var(--muted)',
                              color: 'var(--foreground)',
                              border: '1px solid var(--border)',
                              letterSpacing: '0.04em',
                            }}
                          >
                            {f.join_code}
                          </code>
                        </td>
                        <td className="px-6 py-3.5">
                          <span
                            className="inline-flex items-center justify-center min-w-[1.75rem] h-6 px-2 rounded-full text-xs font-bold"
                            style={{
                              backgroundColor:
                                f.participant_count > 0
                                  ? 'rgba(37, 99, 235, 0.1)'
                                  : 'var(--muted)',
                              color:
                                f.participant_count > 0
                                  ? 'var(--accent)'
                                  : 'var(--muted-foreground)',
                            }}
                          >
                            {f.participant_count}
                          </span>
                        </td>
                        <td className="px-6 py-3.5">
                          <span
                            className="inline-flex items-center justify-center min-w-[2rem] h-6 px-2 rounded-full text-xs font-medium"
                            style={{
                              backgroundColor: 'var(--muted)',
                              color: 'var(--foreground)',
                            }}
                          >
                            R{f.current_round}
                          </span>
                        </td>
                        <td className="px-6 py-3.5 text-right">
                          <div className="inline-flex items-center gap-1">
                            <a
                              href={`/admin/form/${f.id}`}
                              className="inline-flex items-center px-2.5 py-1.5 rounded-md text-sm font-medium transition-colors duration-150"
                              style={{
                                color: 'var(--muted-foreground)',
                              }}
                              onMouseEnter={e => {
                                e.currentTarget.style.color = 'var(--foreground)';
                                e.currentTarget.style.backgroundColor = 'var(--muted)';
                              }}
                              onMouseLeave={e => {
                                e.currentTarget.style.color = 'var(--muted-foreground)';
                                e.currentTarget.style.backgroundColor = 'transparent';
                              }}
                            >
                              Edit
                            </a>
                            <a
                              href={`/admin/form/${f.id}/summary`}
                              className="inline-flex items-center px-2.5 py-1.5 rounded-md text-sm font-medium transition-colors duration-150"
                              style={{
                                color: 'var(--accent)',
                              }}
                              onMouseEnter={e => {
                                e.currentTarget.style.backgroundColor = 'rgba(37, 99, 235, 0.08)';
                              }}
                              onMouseLeave={e => {
                                e.currentTarget.style.backgroundColor = 'transparent';
                              }}
                            >
                              Summary
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 16 16"
                                fill="currentColor"
                                style={{ width: '0.875rem', height: '0.875rem', marginLeft: '0.25rem' }}
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M6.22 4.22a.75.75 0 0 1 1.06 0l3.25 3.25a.75.75 0 0 1 0 1.06l-3.25 3.25a.75.75 0 0 1-1.06-1.06L8.94 8 6.22 5.28a.75.75 0 0 1 0-1.06Z"
                                  clipRule="evenodd"
                                />
                              </svg>
                            </a>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* ── Mobile card list ── */}
            {filteredForms.length > 0 && (
              <div className="sm:hidden px-4 pb-4 space-y-3">
                {filteredForms.map((f: any) => (
                  <div
                    key={f.id}
                    className="rounded-lg overflow-hidden transition-colors duration-150"
                    style={{
                      backgroundColor: 'var(--background)',
                      border: '1px solid var(--border)',
                    }}
                  >
                    {/* Card header */}
                    <div
                      className="px-4 py-3"
                      style={{
                        borderBottom: '1px solid var(--border)',
                      }}
                    >
                      <div
                        className="font-semibold text-sm leading-snug"
                        style={{ color: 'var(--foreground)' }}
                      >
                        {f.title}
                      </div>
                    </div>

                    {/* Card body: metadata row */}
                    <div className="px-4 py-3 flex items-center gap-3 flex-wrap">
                      {/* Join code pill */}
                      <code
                        className="inline-block px-2 py-0.5 rounded text-xs font-mono font-semibold"
                        style={{
                          backgroundColor: 'var(--muted)',
                          color: 'var(--foreground)',
                          border: '1px solid var(--border)',
                          letterSpacing: '0.04em',
                        }}
                      >
                        {f.join_code}
                      </code>

                      {/* Participants pill */}
                      <span
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold"
                        style={{
                          backgroundColor:
                            f.participant_count > 0
                              ? 'rgba(37, 99, 235, 0.1)'
                              : 'var(--muted)',
                          color:
                            f.participant_count > 0
                              ? 'var(--accent)'
                              : 'var(--muted-foreground)',
                        }}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 16 16"
                          fill="currentColor"
                          style={{ width: '0.75rem', height: '0.75rem' }}
                        >
                          <path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM12.735 14c.618 0 1.093-.561.872-1.139a6.002 6.002 0 0 0-11.215 0c-.22.578.254 1.139.872 1.139h9.47Z" />
                        </svg>
                        {f.participant_count}
                      </span>

                      {/* Round pill */}
                      <span
                        className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                        style={{
                          backgroundColor: 'var(--muted)',
                          color: 'var(--foreground)',
                        }}
                      >
                        R{f.current_round}
                      </span>
                    </div>

                    {/* Card actions */}
                    <div
                      className="px-4 py-2.5 flex items-center gap-2"
                      style={{
                        borderTop: '1px solid var(--border)',
                        backgroundColor: 'var(--muted)',
                      }}
                    >
                      <a
                        href={`/admin/form/${f.id}`}
                        className="flex-1 text-center py-1.5 rounded-md text-sm font-medium transition-colors duration-150"
                        style={{
                          color: 'var(--muted-foreground)',
                        }}
                      >
                        Edit
                      </a>
                      <div
                        style={{
                          width: '1px',
                          height: '1.25rem',
                          backgroundColor: 'var(--border)',
                        }}
                      />
                      <a
                        href={`/admin/form/${f.id}/summary`}
                        className="flex-1 text-center py-1.5 rounded-md text-sm font-medium transition-colors duration-150"
                        style={{
                          color: 'var(--accent)',
                        }}
                      >
                        Summary →
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ── Footer with result count ── */}
            {search && filteredForms.length > 0 && (
              <div
                className="px-4 sm:px-6 py-3 text-xs"
                role="status"
                aria-live="polite"
                style={{
                  borderTop: '1px solid var(--border)',
                  color: 'var(--muted-foreground)',
                }}
              >
                Showing {filteredForms.length} of {forms.length} form{forms.length !== 1 ? 's' : ''}
              </div>
            )}
          </div>
        )}
      </Container>
    </section>
  );
}
