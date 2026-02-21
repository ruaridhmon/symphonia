import { useState, useEffect } from 'react';
import { API_BASE_URL } from './config';
import { useAuth } from './AuthContext';
import Container from './layouts/Container';
import { LoadingButton, SkeletonDashboard } from './components';
import { useToast } from './components/Toast';

/**
 * Admin dashboard — create forms, view/manage existing forms.
 *
 * Rendered inside PageLayout via Dashboard component.
 */
export default function AdminDashboard() {
  const { token } = useAuth();
  const { toastError, toastSuccess } = useToast();
  
  const [forms, setForms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newFormTitle, setNewFormTitle] = useState('');
  const [newQuestions, setNewQuestions] = useState(['']);

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

  const createForm = async () => {
    const res = await fetch(`${API_BASE_URL}/create_form`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        title: newFormTitle,
        questions: newQuestions.filter(q => q.trim() !== ''),
        allow_join: true,
        join_code: String(Math.floor(10000 + Math.random() * 90000)),
      }),
    });
    if (!res.ok) {
      toastError(`Save failed (HTTP ${res.status})`);
      return;
    }

    const created = await res.json();
    setForms(prev => [...prev, created]);
    setNewFormTitle('');
    setNewQuestions(['']);
    toastSuccess('Form created');
  };

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
            <button
              type="button"
              onClick={fetchForms}
              className="self-start sm:self-auto px-3 py-1.5 rounded-lg text-sm font-medium"
              style={{
                backgroundColor: 'var(--destructive)',
                color: '#ffffff',
              }}
            >
              Retry
            </button>
          </div>
        )}

        {/* ── Create form card ── */}
        <div
          className="rounded-lg p-4 sm:p-6 mb-6 sm:mb-8"
          style={{
            backgroundColor: 'var(--card)',
            border: '1px solid var(--border)',
            borderLeft: '3px solid var(--accent)',
            boxShadow: 'var(--card-shadow, none)',
          }}
        >
          <h2
            className="text-lg font-semibold mb-4"
            style={{ color: 'var(--foreground)' }}
          >
            ✨ Create a New Form
          </h2>
          <div className="space-y-1.5 mb-4">
            <label
              className="block text-sm font-medium"
              style={{ color: 'var(--foreground)' }}
            >
              Form title
            </label>
            <input
              type="text"
              placeholder="e.g. AI in Education: Risks & Opportunities"
              value={newFormTitle}
              onChange={e => setNewFormTitle(e.target.value)}
              className="w-full rounded-lg px-3 py-2.5 text-base"
              style={{
                border: '1px solid var(--input)',
                backgroundColor: 'var(--background)',
                color: 'var(--foreground)',
                fontWeight: 500,
              }}
            />
          </div>
          {newQuestions.map((q, i) => (
            <input
              key={i}
              type="text"
              placeholder={`Question ${i + 1}`}
              value={q}
              onChange={e => {
                const updated = [...newQuestions];
                updated[i] = e.target.value;
                setNewQuestions(updated);
              }}
              className="w-full rounded-lg px-3 py-2 mb-2"
              style={{
                border: '1px solid var(--input)',
                backgroundColor: 'var(--background)',
                color: 'var(--foreground)',
              }}
            />
          ))}
          <div className="flex flex-col sm:flex-row items-start sm:items-center sm:justify-between gap-3 mt-3">
            <button
              type="button"
              onClick={() => setNewQuestions([...newQuestions, ''])}
              className="text-sm w-fit px-3 py-1.5 rounded-lg font-medium transition-colors"
              style={{
                color: 'var(--accent)',
                backgroundColor: 'transparent',
                border: 'none',
                cursor: 'pointer',
              }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = 'color-mix(in srgb, var(--accent) 8%, transparent)'}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              + Add question
            </button>
            <LoadingButton
              variant="accent"
              size="md"
              onClick={createForm}
            >
              Save Form
            </LoadingButton>
          </div>
        </div>

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
            <div className="flex items-center justify-between mb-4">
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
                {forms.length} form{forms.length !== 1 ? 's' : ''}
              </span>
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
                  {forms.map((f: any) => (
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
                        <code
                          className="px-2 py-1 rounded text-xs"
                          style={{
                            backgroundColor: 'var(--muted)',
                            color: 'var(--foreground)',
                          }}
                        >
                          {f.join_code}
                        </code>
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
                        <a
                          href={`/admin/form/${f.id}`}
                          className="text-sm font-medium transition-colors"
                          style={{ color: 'var(--muted-foreground)' }}
                          onMouseEnter={e => e.currentTarget.style.color = 'var(--foreground)'}
                          onMouseLeave={e => e.currentTarget.style.color = 'var(--muted-foreground)'}
                        >
                          Edit
                        </a>
                        <a
                          href={`/admin/form/${f.id}/summary`}
                          className="text-sm font-medium"
                          style={{ color: 'var(--accent)' }}
                        >
                          Summary →
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile card list */}
            <div className="sm:hidden space-y-3">
              {forms.map((f: any) => (
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
                    <span>
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
                    </span>
                    <span>Participants: {f.participant_count}</span>
                    <span>Round: {f.current_round}</span>
                  </div>
                  <div className="flex gap-4">
                    <a
                      href={`/admin/form/${f.id}`}
                      className="text-sm"
                      style={{ color: 'var(--accent)' }}
                    >
                      Edit
                    </a>
                    <a
                      href={`/admin/form/${f.id}/summary`}
                      className="text-sm"
                      style={{ color: 'var(--accent)' }}
                    >
                      Summary
                    </a>
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
