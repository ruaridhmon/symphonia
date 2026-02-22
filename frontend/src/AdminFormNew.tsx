import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from './config';
import { useAuth } from './AuthContext';
import Container from './layouts/Container';
import { LoadingButton } from './components';
import { useDocumentTitle } from './hooks/useDocumentTitle';

/**
 * Dedicated page for creating a new Delphi consultation form.
 * Route: /admin/forms/new
 */
export default function AdminFormNew() {
  useDocumentTitle('Create New Form');
  const { token } = useAuth();
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [questions, setQuestions] = useState(['']);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createForm = async () => {
    if (!title.trim()) {
      setError('Please enter a form title.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/create_form`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: title.trim(),
          questions: questions.filter(q => q.trim() !== ''),
          allow_join: true,
          join_code: String(Math.floor(10000 + Math.random() * 90000)),
        }),
      });
      if (!res.ok) {
        throw new Error(`Save failed (HTTP ${res.status})`);
      }
      const created = await res.json();
      // Navigate directly to the new form's editor
      navigate(`/admin/form/${created.id}`);
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.');
      setSaving(false);
    }
  };

  return (
    <section className="flex-1 py-6 sm:py-8">
      <Container size="md">
        {/* ── Back link ── */}
        <button
          type="button"
          onClick={() => navigate('/admin')}
          className="inline-flex items-center gap-1.5 text-sm mb-6 transition-colors"
          style={{ color: 'var(--muted-foreground)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--foreground)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--muted-foreground)')}
        >
          ← Back to Dashboard
        </button>

        {/* ── Heading ── */}
        <div className="mb-6">
          <h1
            className="text-2xl font-bold tracking-tight"
            style={{ color: 'var(--foreground)' }}
          >
            Create a New Form
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--muted-foreground)' }}>
            Set up a new Delphi consultation with title and opening questions.
          </p>
        </div>

        {/* ── Error ── */}
        {error && (
          <div
            className="rounded-lg p-4 mb-6"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--destructive) 10%, transparent)',
              border: '1px solid var(--destructive)',
              color: 'var(--destructive)',
            }}
          >
            <span className="text-sm font-medium">{error}</span>
          </div>
        )}

        {/* ── Form card ── */}
        <div
          className="rounded-lg p-6 sm:p-8"
          style={{
            backgroundColor: 'var(--card)',
            border: '1px solid var(--border)',
            borderLeft: '3px solid var(--accent)',
            boxShadow: 'var(--card-shadow, none)',
          }}
        >
          {/* Title */}
          <div className="space-y-1.5 mb-6">
            <label
              className="block text-sm font-medium"
              style={{ color: 'var(--foreground)' }}
            >
              Form title
            </label>
            <input
              type="text"
              placeholder="e.g. AI in Education: Risks &amp; Opportunities"
              value={title}
              onChange={e => setTitle(e.target.value)}
              autoFocus
              className="w-full rounded-lg px-3 py-2.5 text-base"
              style={{
                border: '1px solid var(--input)',
                backgroundColor: 'var(--background)',
                color: 'var(--foreground)',
                fontWeight: 500,
                outline: 'none',
              }}
              onFocus={e => {
                e.currentTarget.style.borderColor = 'var(--accent)';
                e.currentTarget.style.boxShadow = '0 0 0 2px rgba(37, 99, 235, 0.2)';
              }}
              onBlur={e => {
                e.currentTarget.style.borderColor = 'var(--input)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            />
          </div>

          {/* Questions */}
          <div className="space-y-1.5 mb-4">
            <label
              className="block text-sm font-medium"
              style={{ color: 'var(--foreground)' }}
            >
              Opening questions
            </label>
            {questions.map((q, i) => (
              <div key={i} className="flex gap-2 items-center">
                <input
                  type="text"
                  placeholder={`Question ${i + 1}`}
                  value={q}
                  onChange={e => {
                    const updated = [...questions];
                    updated[i] = e.target.value;
                    setQuestions(updated);
                  }}
                  className="flex-1 rounded-lg px-3 py-2"
                  style={{
                    border: '1px solid var(--input)',
                    backgroundColor: 'var(--background)',
                    color: 'var(--foreground)',
                    outline: 'none',
                  }}
                  onFocus={e => {
                    e.currentTarget.style.borderColor = 'var(--accent)';
                    e.currentTarget.style.boxShadow = '0 0 0 2px rgba(37, 99, 235, 0.2)';
                  }}
                  onBlur={e => {
                    e.currentTarget.style.borderColor = 'var(--input)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                />
                {questions.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setQuestions(questions.filter((_, idx) => idx !== i))}
                    className="text-sm px-2 py-1 rounded"
                    style={{ color: 'var(--muted-foreground)', background: 'none', border: 'none', cursor: 'pointer' }}
                    title="Remove question"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center sm:justify-between gap-3 mt-6">
            <button
              type="button"
              onClick={() => setQuestions([...questions, ''])}
              className="text-sm px-3 py-1.5 rounded-lg font-medium"
              style={{
                color: 'var(--accent)',
                backgroundColor: 'transparent',
                border: 'none',
                cursor: 'pointer',
              }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'color-mix(in srgb, var(--accent) 8%, transparent)')}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              + Add question
            </button>
            <div className="flex gap-3 self-end sm:self-auto">
              <LoadingButton
                variant="ghost"
                size="md"
                onClick={() => navigate('/admin')}
              >
                Cancel
              </LoadingButton>
              <LoadingButton
                variant="accent"
                size="md"
                loading={saving}
                onClick={createForm}
              >
                Create Form
              </LoadingButton>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
