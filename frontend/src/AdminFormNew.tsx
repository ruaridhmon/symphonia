import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronUp, ChevronDown, Trash2, RefreshCw } from 'lucide-react';
import { API_BASE_URL } from './config';
import { useAuth } from './AuthContext';
import Container from './layouts/Container';
import { LoadingButton } from './components';
import { useDocumentTitle } from './hooks/useDocumentTitle';

/* ── Helpers ──────────────────────────────────────────────────── */

function generateJoinCode(): string {
  return String(Math.floor(10000 + Math.random() * 90000));
}

/* ── Toggle switch (pill-shaped) ──────────────────────────────── */

function ToggleSwitch({
  checked,
  onChange,
  id,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  id?: string;
}) {
  return (
    <button
      type="button"
      id={id}
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="relative inline-flex shrink-0 rounded-full transition-colors duration-200 focus-visible:outline-none"
      style={{
        width: 40,
        height: 22,
        backgroundColor: checked ? 'var(--accent)' : 'var(--input)',
        cursor: 'pointer',
        border: 'none',
        padding: 0,
      }}
    >
      <span
        className="block rounded-full shadow-sm transition-transform duration-200"
        style={{
          width: 18,
          height: 18,
          marginTop: 2,
          marginLeft: checked ? 20 : 2,
          backgroundColor: '#fff',
        }}
      />
    </button>
  );
}

/* ── Main component ───────────────────────────────────────────── */

export default function AdminFormNew() {
  useDocumentTitle('Create New Form');
  const { token } = useAuth();
  const navigate = useNavigate();

  /* Core state */
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [joinCode, setJoinCode] = useState(() => generateJoinCode());
  const [questions, setQuestions] = useState(['']);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* Question interaction state (Worker B) */
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);

  /* Settings state (Worker C) */
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [allowJoin, setAllowJoin] = useState(true);
  const [anonymous, setAnonymous] = useState(false);
  const [deadline, setDeadline] = useState('');

  const swapQuestions = (a: number, b: number) => {
    const updated = [...questions];
    [updated[a], updated[b]] = [updated[b], updated[a]];
    setQuestions(updated);
  };

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
          description: description.trim() || undefined,
          questions: questions.filter(q => q.trim() !== ''),
          allow_join: allowJoin,
          anonymous,
          deadline: deadline || null,
          join_code: joinCode,
        }),
      });
      if (!res.ok) throw new Error(`Save failed (HTTP ${res.status})`);
      const created = await res.json();
      navigate(`/admin/form/${created.id}`);
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.');
      setSaving(false);
    }
  };

  return (
    <section className="flex-1 py-6 sm:py-8">
      <Container size="lg">
        {/* Back button */}
        <button
          type="button"
          onClick={() => navigate('/admin')}
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

        {error && (
          <div
            className="rounded-lg p-4 mb-6"
            style={{
              backgroundColor:
                'color-mix(in srgb, var(--destructive) 10%, transparent)',
              border: '1px solid var(--destructive)',
              color: 'var(--destructive)',
            }}
          >
            <span className="text-sm font-medium">{error}</span>
          </div>
        )}

        <div
          className="rounded-lg p-6 sm:p-8"
          style={{
            backgroundColor: 'var(--card)',
            border: '1px solid var(--border)',
            borderLeft: '3px solid var(--accent)',
            boxShadow: 'var(--card-shadow, none)',
          }}
        >
          {/* ── Title ─────────────────────────────────────────────── */}
          <div className="space-y-1.5 mb-6">
            <label
              className="block text-sm font-medium"
              style={{ color: 'var(--foreground)' }}
            >
              Form title
            </label>
            <input
              type="text"
              placeholder="e.g. AI in Education: Risks & Opportunities"
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
                e.currentTarget.style.boxShadow =
                  '0 0 0 2px rgba(37, 99, 235, 0.2)';
              }}
              onBlur={e => {
                e.currentTarget.style.borderColor = 'var(--input)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            />
          </div>

          {/* ── Description (Worker A) ────────────────────────────── */}
          <div className="space-y-1.5 mb-6">
            <label
              className="block text-sm font-medium"
              style={{ color: 'var(--foreground)' }}
            >
              Description (optional)
            </label>
            <textarea
              placeholder="What is this consultation about? What should participants consider?"
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={4}
              className="w-full rounded-lg px-3 py-2.5 text-sm resize-vertical"
              style={{
                border: '1px solid var(--input)',
                backgroundColor: 'var(--background)',
                color: 'var(--foreground)',
                outline: 'none',
              }}
              onFocus={e => {
                e.currentTarget.style.borderColor = 'var(--accent)';
                e.currentTarget.style.boxShadow =
                  '0 0 0 2px rgba(37, 99, 235, 0.2)';
              }}
              onBlur={e => {
                e.currentTarget.style.borderColor = 'var(--input)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            />
          </div>

          {/* ── Join Code (Worker A) ──────────────────────────────── */}
          <div className="space-y-1.5 mb-6">
            <label
              className="block text-sm font-medium"
              style={{ color: 'var(--foreground)' }}
            >
              Join code
            </label>
            <div className="flex gap-2 items-center">
              <input
                type="text"
                value={joinCode}
                onChange={e => setJoinCode(e.target.value)}
                className="rounded-lg px-3 py-2 text-base font-mono tracking-widest"
                style={{
                  border: '1px solid var(--input)',
                  backgroundColor: 'var(--background)',
                  color: 'var(--foreground)',
                  fontWeight: 600,
                  outline: 'none',
                  width: '8rem',
                }}
                onFocus={e => {
                  e.currentTarget.style.borderColor = 'var(--accent)';
                  e.currentTarget.style.boxShadow =
                    '0 0 0 2px rgba(37, 99, 235, 0.2)';
                }}
                onBlur={e => {
                  e.currentTarget.style.borderColor = 'var(--input)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              />
              <button
                type="button"
                onClick={() => setJoinCode(generateJoinCode())}
                className="inline-flex items-center justify-center rounded-lg p-2 transition-colors"
                style={{
                  border: '1px solid var(--input)',
                  backgroundColor: 'var(--background)',
                  color: 'var(--muted-foreground)',
                  cursor: 'pointer',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = 'var(--accent)';
                  e.currentTarget.style.color = 'var(--accent)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = 'var(--input)';
                  e.currentTarget.style.color = 'var(--muted-foreground)';
                }}
                title="Regenerate join code"
              >
                <RefreshCw size={16} />
              </button>
            </div>
            <p
              className="text-xs mt-1"
              style={{ color: 'var(--muted-foreground)' }}
            >
              Share this code with participants so they can join.
            </p>
          </div>

          {/* ── Opening Questions (Workers A + B) ─────────────────── */}
          <div className="space-y-2 mb-4">
            <label
              className="block text-sm font-medium"
              style={{ color: 'var(--foreground)' }}
            >
              Opening questions
            </label>
            <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
              Good questions are open-ended, neutral, and invite diverse
              perspectives.
            </p>

            {questions.map((q, i) => {
              const isOnly = questions.length === 1;
              const isEmpty = q.length === 0;
              const showCounter = focusedIndex === i || q.length > 0;

              return (
                <div
                  key={i}
                  className="flex gap-2 items-center"
                  style={{ transition: 'opacity 0.15s ease' }}
                  onMouseEnter={() => setHoveredRow(i)}
                  onMouseLeave={() => setHoveredRow(null)}
                >
                  {/* Number badge */}
                  <span
                    className="flex-shrink-0 flex items-center justify-center rounded-full text-xs font-semibold"
                    style={{
                      width: 26,
                      height: 26,
                      minWidth: 26,
                      backgroundColor: 'var(--foreground)',
                      color: 'var(--background)',
                      opacity: 0.75,
                    }}
                  >
                    {i + 1}
                  </span>

                  {/* Reorder arrows */}
                  <div
                    className="flex flex-col flex-shrink-0"
                    style={{ width: 18, gap: 1 }}
                  >
                    {i > 0 ? (
                      <button
                        type="button"
                        onClick={() => swapQuestions(i, i - 1)}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          padding: 0,
                          color: 'var(--muted-foreground)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          lineHeight: 1,
                        }}
                        title="Move up"
                      >
                        <ChevronUp size={14} />
                      </button>
                    ) : (
                      <span style={{ height: 14 }} />
                    )}
                    {i < questions.length - 1 ? (
                      <button
                        type="button"
                        onClick={() => swapQuestions(i, i + 1)}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          padding: 0,
                          color: 'var(--muted-foreground)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          lineHeight: 1,
                        }}
                        title="Move down"
                      >
                        <ChevronDown size={14} />
                      </button>
                    ) : (
                      <span style={{ height: 14 }} />
                    )}
                  </div>

                  {/* Input with character counter */}
                  <div className="flex-1" style={{ position: 'relative' }}>
                    <input
                      type="text"
                      placeholder={
                        isOnly && isEmpty
                          ? 'e.g. What do you see as the biggest barrier to AI adoption in your sector?'
                          : `Question ${i + 1}`
                      }
                      value={q}
                      onChange={e => {
                        const updated = [...questions];
                        updated[i] = e.target.value;
                        setQuestions(updated);
                      }}
                      className="w-full rounded-lg px-3 py-2"
                      style={{
                        border: '1px solid var(--input)',
                        backgroundColor: 'var(--background)',
                        color: 'var(--foreground)',
                        outline: 'none',
                        paddingRight: showCounter ? 52 : 12,
                      }}
                      onFocus={e => {
                        setFocusedIndex(i);
                        e.currentTarget.style.borderColor = 'var(--accent)';
                        e.currentTarget.style.boxShadow =
                          '0 0 0 2px rgba(37, 99, 235, 0.2)';
                      }}
                      onBlur={e => {
                        setFocusedIndex(null);
                        e.currentTarget.style.borderColor = 'var(--input)';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                    />
                    {showCounter && (
                      <span
                        style={{
                          position: 'absolute',
                          bottom: 6,
                          right: 8,
                          fontSize: '0.65rem',
                          color: 'var(--muted-foreground)',
                          pointerEvents: 'none',
                          userSelect: 'none',
                          lineHeight: 1,
                        }}
                      >
                        {q.length}/200
                      </span>
                    )}
                  </div>

                  {/* Remove button (Trash2, visible on hover) */}
                  {questions.length > 1 && (
                    <button
                      type="button"
                      onClick={() =>
                        setQuestions(questions.filter((_, idx) => idx !== i))
                      }
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: 4,
                        color: 'var(--muted-foreground)',
                        opacity: hoveredRow === i ? 1 : 0,
                        transition: 'opacity 0.15s ease',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                      title="Remove question"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* ── Advanced Settings (Worker C) ───────────────────────── */}
          <div
            className="mt-6"
            style={{
              borderTop: '1px solid var(--border)',
              paddingTop: '1.25rem',
            }}
          >
            {/* Collapsible header */}
            <button
              type="button"
              onClick={() => setSettingsOpen(prev => !prev)}
              className="w-full flex items-center justify-between rounded-lg px-3 py-2.5 transition-colors duration-150"
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--muted-foreground)',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.backgroundColor =
                  'color-mix(in srgb, var(--foreground) 5%, transparent)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <span className="flex items-center gap-2 text-sm font-medium select-none">
                ⚙️ Advanced Settings
              </span>
              {settingsOpen ? (
                <ChevronUp
                  size={16}
                  style={{ color: 'var(--muted-foreground)' }}
                />
              ) : (
                <ChevronDown
                  size={16}
                  style={{ color: 'var(--muted-foreground)' }}
                />
              )}
            </button>

            {/* Collapsible body — CSS max-height transition */}
            <div
              style={{
                maxHeight: settingsOpen ? 400 : 0,
                overflow: 'hidden',
                transition:
                  'max-height 0.25s ease-in-out, opacity 0.2s ease-in-out',
                opacity: settingsOpen ? 1 : 0,
              }}
            >
              <div className="flex flex-col gap-5 px-3 pt-3 pb-1">
                {/* 1 ── Allow join toggle */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <label
                      htmlFor="toggle-allow-join"
                      className="block text-sm font-medium"
                      style={{
                        color: 'var(--foreground)',
                        cursor: 'pointer',
                      }}
                    >
                      Allow participants to join
                    </label>
                    <p
                      className="text-xs mt-0.5"
                      style={{ color: 'var(--muted-foreground)' }}
                    >
                      Participants can find and join this form using the join
                      code.
                    </p>
                  </div>
                  <ToggleSwitch
                    id="toggle-allow-join"
                    checked={allowJoin}
                    onChange={setAllowJoin}
                  />
                </div>

                {/* 2 ── Anonymous responses toggle */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <label
                      htmlFor="toggle-anonymous"
                      className="block text-sm font-medium"
                      style={{
                        color: 'var(--foreground)',
                        cursor: 'pointer',
                      }}
                    >
                      Anonymous responses
                    </label>
                    <p
                      className="text-xs mt-0.5"
                      style={{ color: 'var(--muted-foreground)' }}
                    >
                      Participant names will not be visible in the synthesis.
                    </p>
                  </div>
                  <ToggleSwitch
                    id="toggle-anonymous"
                    checked={anonymous}
                    onChange={setAnonymous}
                  />
                </div>

                {/* 3 ── Deadline (optional) */}
                <div>
                  <label
                    htmlFor="input-deadline"
                    className="block text-sm font-medium mb-1"
                    style={{ color: 'var(--foreground)' }}
                  >
                    Response deadline (optional)
                  </label>
                  <input
                    id="input-deadline"
                    type="date"
                    value={deadline}
                    onChange={e => setDeadline(e.target.value)}
                    className="w-full sm:w-56 rounded-lg px-3 py-2 text-sm"
                    style={{
                      border: '1px solid var(--input)',
                      backgroundColor: 'var(--background)',
                      color: 'var(--foreground)',
                      outline: 'none',
                    }}
                    onFocus={e => {
                      e.currentTarget.style.borderColor = 'var(--accent)';
                      e.currentTarget.style.boxShadow =
                        '0 0 0 2px rgba(37, 99, 235, 0.2)';
                    }}
                    onBlur={e => {
                      e.currentTarget.style.borderColor = 'var(--input)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  />
                  <p
                    className="text-xs mt-1"
                    style={{ color: 'var(--muted-foreground)' }}
                  >
                    Leave blank for no deadline.
                  </p>
                </div>
              </div>
            </div>
          </div>
          {/* ── End Advanced Settings ─────────────────────────────── */}

          {/* ── Actions ───────────────────────────────────────────── */}
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
              onMouseEnter={e =>
                (e.currentTarget.style.backgroundColor =
                  'color-mix(in srgb, var(--accent) 8%, transparent)')
              }
              onMouseLeave={e =>
                (e.currentTarget.style.backgroundColor = 'transparent')
              }
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
