import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { getForms, FormListItem } from './api/forms';
import { ApiError } from './api/client';
import Container from './layouts/Container';
import { LoadingButton, SkeletonDashboard } from './components';
import { useToast } from './components/Toast';
import { useDocumentTitle } from './hooks/useDocumentTitle';
import { useCopyToClipboard } from './hooks/useCopyToClipboard';
import { Plus, Search, Copy, Check, X, FileText } from 'lucide-react';

/**
 * Admin dashboard — create forms, view/manage existing forms.
 *
 * Rendered inside PageLayout via Dashboard component.
 * Uses centralised API client for all requests.
 */
export default function AdminDashboard() {
  useDocumentTitle('Admin Dashboard');
  const { token } = useAuth();
  const { toastError, toastSuccess } = useToast();
  
  const [forms, setForms] = useState<FormListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [codeCopied, copyCode] = useCopyToClipboard();

  // Filter forms by search query
  const filteredForms = useMemo(() => {
    if (!searchQuery.trim()) return forms;
    const q = searchQuery.toLowerCase().trim();
    return forms.filter(
      f =>
        f.title.toLowerCase().includes(q) ||
        f.join_code?.toLowerCase().includes(q)
    );
  }, [forms, searchQuery]);

  const fetchForms = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await getForms();
      setForms(Array.isArray(data) ? data : []);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 401) return; // client.ts handles redirect
        if (err.status === 403) {
          setError('Admin access required to view forms.');
        } else {
          setError(`Failed to load forms (HTTP ${err.status})`);
        }
      } else {
        setError('Failed to load forms. Please check your connection.');
      }
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchForms();
  }, [fetchForms]);

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
        {/* ── Page heading ── */}
        <div className="mb-6 sm:mb-8">
          <h1
            className="text-2xl font-bold tracking-tight"
            style={{ color: 'var(--foreground)' }}
          >
            Admin Dashboard
          </h1>
          <p
            className="text-sm mt-1"
            style={{ color: 'var(--muted-foreground)' }}
          >
            Create and manage your Delphi consultation forms
          </p>
        </div>

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
              onClick={fetchForms}
            >
              Retry
            </LoadingButton>
          </div>
        )}

        {/* ── Header with Create button ── */}
        <div className="flex items-center justify-between mb-6">
          <h2
            className="text-lg font-semibold"
            style={{ color: 'var(--foreground)' }}
          >
            Your Consultations
          </h2>
          <Link to="/admin/form/new">
            <LoadingButton variant="accent" size="md">
              <Plus size={18} className="mr-1.5" />
              New Consultation
            </LoadingButton>
          </Link>
        </div>

        {/* ── Empty state ── */}
        {forms.length === 0 && !error && (
          <div
            className="rounded-lg p-12 text-center"
            style={{
              backgroundColor: 'var(--card)',
              border: '1px solid var(--border)',
              boxShadow: 'var(--card-shadow, none)',
            }}
          >
            <div
              className="mx-auto mb-4 inline-flex items-center justify-center w-16 h-16 rounded-full"
              style={{
                backgroundColor: 'color-mix(in srgb, var(--accent) 10%, transparent)',
              }}
            >
              <FileText size={32} style={{ color: 'var(--accent)' }} />
            </div>
            <h3
              className="text-lg font-semibold mb-2"
              style={{ color: 'var(--foreground)' }}
            >
              No consultations yet
            </h3>
            <p
              className="text-sm mb-6 max-w-sm mx-auto"
              style={{ color: 'var(--muted-foreground)' }}
            >
              Create your first consultation to get started collecting expert insights with the Delphi method.
            </p>
            <Link to="/admin/form/new">
              <LoadingButton variant="accent" size="md">
                <Plus size={18} className="mr-1.5" />
                Create First Consultation
              </LoadingButton>
            </Link>
          </div>
        )}

        {/* ── Existing forms table ── */}
        {forms.length > 0 && (
          <div
            className="rounded-lg p-4 sm:p-6"
            style={{
              backgroundColor: 'var(--card)',
              border: '1px solid var(--border)',
              boxShadow: 'var(--card-shadow, none)',
            }}
          >
            <div className="flex flex-col gap-4 mb-4">
              <div className="flex items-center justify-between">
                <h2
                  className="text-lg font-semibold"
                  style={{ color: 'var(--foreground)' }}
                >
                  Existing Forms
                </h2>
                <span
                  className="text-xs font-medium px-2 py-1 rounded-full"
                  style={{
                    backgroundColor: 'var(--muted)',
                    color: 'var(--muted-foreground)',
                  }}
                >
                  {filteredForms.length === forms.length
                    ? `${forms.length} form${forms.length !== 1 ? 's' : ''}`
                    : `${filteredForms.length} of ${forms.length}`}
                </span>
              </div>

              {/* Search bar */}
              {forms.length > 3 && (
                <div className="relative">
                  <Search
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                    style={{ color: 'var(--muted-foreground)' }}
                  />
                  <input
                    type="search"
                    placeholder="Search forms by title or code…"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-9 py-2 rounded-lg text-sm"
                    style={{
                      border: '1px solid var(--input)',
                      backgroundColor: 'var(--background)',
                      color: 'var(--foreground)',
                    }}
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2"
                      style={{
                        color: 'var(--muted-foreground)',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: 0,
                        display: 'flex',
                      }}
                      aria-label="Clear search"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Desktop table */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr
                    style={{
                      backgroundColor: 'var(--muted)',
                      color: 'var(--muted-foreground)',
                      borderBottom: '2px solid var(--border)',
                    }}
                  >
                    <th className="p-3 text-xs font-semibold uppercase tracking-wider text-left">Form Title</th>
                    <th className="p-3 text-xs font-semibold uppercase tracking-wider text-left">Join Code</th>
                    <th className="p-3 text-xs font-semibold uppercase tracking-wider text-left">Participants</th>
                    <th className="p-3 text-xs font-semibold uppercase tracking-wider text-left">Round</th>
                    <th className="p-3 text-xs font-semibold uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredForms.map((f) => (
                    <tr
                      key={f.id}
                      className="transition-colors"
                      style={{ borderBottom: '1px solid var(--border)' }}
                      onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--muted)'}
                      onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <td
                        className="p-3 font-medium"
                        style={{ color: 'var(--foreground)' }}
                      >
                        {f.title}
                      </td>
                      <td className="p-3">
                        <button
                          type="button"
                          onClick={() => {
                            copyCode(f.join_code);
                            toastSuccess(`Copied code: ${f.join_code}`);
                          }}
                          className="inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs transition-all group"
                          style={{
                            backgroundColor: 'var(--muted)',
                            color: 'var(--foreground)',
                            border: '1px solid transparent',
                            cursor: 'pointer',
                            fontFamily: 'monospace',
                          }}
                          onMouseEnter={e => {
                            e.currentTarget.style.borderColor = 'var(--accent)';
                            e.currentTarget.style.backgroundColor = 'color-mix(in srgb, var(--accent) 8%, var(--muted))';
                          }}
                          onMouseLeave={e => {
                            e.currentTarget.style.borderColor = 'transparent';
                            e.currentTarget.style.backgroundColor = 'var(--muted)';
                          }}
                          title="Click to copy"
                        >
                          {f.join_code}
                          {codeCopied ? (
                            <Check size={12} style={{ color: 'var(--success)' }} />
                          ) : (
                            <Copy size={12} style={{ color: 'var(--muted-foreground)', opacity: 0.6 }} />
                          )}
                        </button>
                      </td>
                      <td className="p-3">
                        <span
                          className="inline-flex items-center justify-center min-w-[1.5rem] h-6 px-2 rounded-full text-xs font-semibold"
                          style={{
                            backgroundColor: f.participant_count > 0
                              ? 'color-mix(in srgb, var(--accent) 12%, transparent)'
                              : 'var(--muted)',
                            color: f.participant_count > 0
                              ? 'var(--accent)'
                              : 'var(--muted-foreground)',
                          }}
                        >
                          {f.participant_count}
                        </span>
                      </td>
                      <td className="p-3">
                        <span
                          className="inline-flex items-center justify-center min-w-[1.5rem] h-6 px-2 rounded-full text-xs font-medium"
                          style={{
                            backgroundColor: 'var(--muted)',
                            color: 'var(--foreground)',
                          }}
                        >
                          R{f.current_round}
                        </span>
                      </td>
                      <td className="p-3 text-right space-x-3">
                        <Link
                          to={`/admin/form/${f.id}`}
                          className="text-sm font-medium transition-colors"
                          style={{ color: 'var(--muted-foreground)' }}
                          onMouseEnter={e => e.currentTarget.style.color = 'var(--foreground)'}
                          onMouseLeave={e => e.currentTarget.style.color = 'var(--muted-foreground)'}
                        >
                          Edit
                        </Link>
                        <Link
                          to={`/admin/form/${f.id}/summary`}
                          className="text-sm font-medium"
                          style={{ color: 'var(--accent)' }}
                        >
                          Summary →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Empty search state */}
            {filteredForms.length === 0 && searchQuery && (
              <div className="text-center py-8">
                <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
                  No forms match "<strong style={{ color: 'var(--foreground)' }}>{searchQuery}</strong>"
                </p>
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="mt-2 text-sm font-medium"
                  style={{ color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  Clear search
                </button>
              </div>
            )}

            {/* Mobile card list */}
            <div className="sm:hidden space-y-3">
              {filteredForms.map((f) => (
                <div
                  key={f.id}
                  className="rounded-lg p-4"
                  style={{
                    backgroundColor: 'var(--muted)',
                    border: '1px solid var(--border)',
                  }}
                >
                  <div
                    className="font-medium mb-2"
                    style={{ color: 'var(--foreground)' }}
                  >
                    {f.title}
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm mb-3"
                    style={{ color: 'var(--muted-foreground)' }}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        copyCode(f.join_code);
                        toastSuccess(`Copied: ${f.join_code}`);
                      }}
                      className="inline-flex items-center gap-1"
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: 'var(--muted-foreground)',
                        fontSize: 'inherit',
                        fontFamily: 'inherit',
                        padding: 0,
                      }}
                    >
                      Code:{' '}
                      <code
                        className="px-1.5 py-0.5 rounded text-xs"
                        style={{
                          backgroundColor: 'var(--card)',
                          color: 'var(--foreground)',
                        }}
                      >
                        {f.join_code}
                      </code>
                      <Copy size={11} style={{ opacity: 0.5, marginLeft: 2 }} />
                    </button>
                    <span>Participants: {f.participant_count}</span>
                    <span>Round: {f.current_round}</span>
                  </div>
                  <div className="flex gap-4">
                    <Link
                      to={`/admin/form/${f.id}`}
                      className="text-sm"
                      style={{ color: 'var(--accent)' }}
                    >
                      Edit
                    </Link>
                    <Link
                      to={`/admin/form/${f.id}/summary`}
                      className="text-sm"
                      style={{ color: 'var(--accent)' }}
                    >
                      Summary
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </Container>
    </section>
  );
}
