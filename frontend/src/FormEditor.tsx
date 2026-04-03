import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Trash2, Plus, Save, ArrowLeft, ChevronUp, ChevronDown, Copy, Ticket } from 'lucide-react';
import { api, getApiErrorDetail } from './api/client';
import LoadingButton from './components/LoadingButton';
import QuestionModeToggle from './components/QuestionModeToggle';
import StructuredInput from './components/StructuredInput';
import { useToast } from './components/Toast';
import { useDocumentTitle } from './hooks/useDocumentTitle';
import { emptyStructuredResponse, type StructuredResponse } from './types/structured-input';
import { isSurveyQuestion, normalizeQuestion, type ConfigurableQuestion, type QuestionInput } from './utils/questions';

interface FormData {
  title: string;
  questions: QuestionInput[];
  join_code: string;
}

function createBlankQuestion(): ConfigurableQuestion {
  return {
    label: '',
    requireEvidence: true,
    requireCounterarguments: true,
    requireConfidence: true,
  };
}

function createBlankSurveyQuestion(): ConfigurableQuestion {
  return {
    label: '',
    requireEvidence: false,
    requireCounterarguments: false,
    requireConfidence: false,
  };
}

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

export default function FormEditor() {
  const { id } = useParams();
  useDocumentTitle('Edit Consultation');
  const navigate = useNavigate();
  const { toastError, toastSuccess } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [title, setTitle] = useState('');
  const [questions, setQuestions] = useState<ConfigurableQuestion[]>([createBlankQuestion()]);
  const [joinCode, setJoinCode] = useState('');
  const [previewResponses, setPreviewResponses] = useState<Record<string, StructuredResponse>>({});
  const validQuestions = questions.filter((question) => question.label.trim() !== '');
  const isSurveyMode =
    questions.length > 0 &&
    questions.every((question) => isSurveyQuestion(question));
  const questionModeLabel = isSurveyMode ? 'Survey' : 'Consensus';
  const consultationHeading = title.trim() || 'Untitled Consultation';

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      navigate('/');
      return;
    }

    api.get<FormData>(`/forms/${id}`)
      .then((form) => {
        setTitle(form.title);
        setQuestions(
          Array.isArray(form.questions) && form.questions.length > 0
            ? form.questions.map((question) => normalizeQuestion(question))
            : [createBlankQuestion()],
        );
        setJoinCode(form.join_code);
        setLoading(false);
      })
      .catch(() => {
        toastError('Failed to load form');
        setLoading(false);
      });
  }, [id, navigate, toastError]);

  useEffect(() => {
    setPreviewResponses((prev) => {
      const next: Record<string, StructuredResponse> = {};
      questions.forEach((_, index) => {
        const key = `q${index + 1}`;
        next[key] = prev[key] ?? emptyStructuredResponse();
      });
      return next;
    });
  }, [questions]);

  function setResponseStyle(mode: 'consensus' | 'information') {
    setQuestions((prev) =>
      prev.map((question) => ({
        ...question,
        requireEvidence: mode === 'consensus',
        requireCounterarguments: mode === 'consensus',
        requireConfidence: mode === 'consensus',
      })),
    );
  }

  async function saveForm() {
    if (!title.trim()) {
      toastError('Please enter a title');
      return;
    }

    const validQuestions = questions.filter((q) => q.label.trim() !== '');

    if (validQuestions.length === 0) {
      toastError('Please add at least one question');
      return;
    }

    setSaving(true);

    try {
      await api.put(`/forms/${id}`, {
        title: title.trim(),
        questions: validQuestions,
      });
      toastSuccess('Consultation saved');
    } catch (error) {
      toastError(getApiErrorDetail(error) || 'Failed to save edits');
    } finally {
      setSaving(false);
    }
  }

  async function deleteForm() {
    if (
      !window.confirm(
        'Are you sure you want to delete this consultation? This action cannot be undone.',
      )
    ) {
      return;
    }

    setDeleting(true);
    try {
      await api.delete(`/forms/${id}`);
      toastSuccess('Consultation deleted');
      navigate('/');
    } catch {
      toastError('Failed to delete consultation');
    } finally {
      setDeleting(false);
    }
  }

  function updateQuestion(i: number, value: string) {
    const updated = [...questions];
    updated[i] = { ...updated[i], label: value };
    setQuestions(updated);
  }

  function addQuestion() {
    setQuestions((prev) => [
      ...prev,
      isSurveyMode
        ? createBlankSurveyQuestion()
        : createBlankQuestion(),
    ]);
  }

  function swapQuestions(a: number, b: number) {
    setQuestions((prev) => {
      const updated = [...prev];
      [updated[a], updated[b]] = [updated[b], updated[a]];
      return updated;
    });
  }

  function removeQuestion(i: number) {
    setQuestions((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function copyJoinCode() {
    try {
      await navigator.clipboard.writeText(joinCode);
      toastSuccess('Join code copied');
    } catch {
      toastError('Failed to copy join code');
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center" style={{ minHeight: '60vh' }}>
        <p className="text-muted-foreground text-lg">Loading…</p>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 py-6 sm:py-8 max-w-7xl mx-auto">
      <button
        onClick={() => navigate('/')}
        className="inline-flex items-center gap-2 mb-6 transition-colors"
        style={{
          color: 'var(--muted-foreground)',
          backgroundColor: 'var(--card)',
          border: '1px solid var(--border)',
          borderRadius: 10,
          cursor: 'pointer',
          padding: '10px 14px',
          fontSize: '0.95rem',
          fontWeight: 600,
          lineHeight: 1,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = 'var(--foreground)';
          e.currentTarget.style.borderColor = 'var(--accent)';
          e.currentTarget.style.backgroundColor = 'color-mix(in srgb, var(--accent) 6%, var(--card))';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = 'var(--muted-foreground)';
          e.currentTarget.style.borderColor = 'var(--border)';
          e.currentTarget.style.backgroundColor = 'var(--card)';
        }}
      >
        <ArrowLeft size={16} />
        Back to Dashboard
      </button>

      <section className="card-lg p-5 sm:p-6 mb-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0 max-w-3xl">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--accent)' }}>
              Edit Consultation
            </div>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-foreground">{consultationHeading}</h1>
            <div className="mt-4 flex flex-wrap gap-2">
              <span
                className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium"
                style={{ backgroundColor: 'var(--muted)', color: 'var(--foreground)' }}
              >
                {validQuestions.length} question{validQuestions.length === 1 ? '' : 's'}
              </span>
              <span
                className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium"
                style={{ backgroundColor: 'var(--muted)', color: 'var(--muted-foreground)' }}
              >
                {questionModeLabel}
              </span>
              <span
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium"
                style={{ backgroundColor: 'var(--muted)', color: 'var(--foreground)' }}
              >
                <Ticket size={12} />
                {joinCode}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <LoadingButton
              variant="ghost"
              onClick={copyJoinCode}
              className="px-4 py-2.5"
            >
              <Copy size={16} className="mr-2" />
              Copy Join Code
            </LoadingButton>
            <LoadingButton
              variant="accent"
              loading={saving}
              onClick={saveForm}
              className="px-5 py-2.5"
            >
              <Save size={16} className="mr-2" />
              Save Edits
            </LoadingButton>
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="space-y-6 min-w-0">
          <div className="card-lg p-6">
            <h2 className="text-lg font-semibold mb-4 text-foreground">Consultation Details</h2>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. AI in Education: Risks & Opportunities"
              className="w-full rounded-lg px-3 py-2.5 border border-border bg-card text-foreground"
            />
          </div>

          <div className="card-lg p-6">
            <div className="mb-6">
              <QuestionModeToggle
                isSurveyMode={isSurveyMode}
                onSelectSurvey={() => setResponseStyle('information')}
                onSelectConsensus={() => setResponseStyle('consensus')}
              />
            </div>

            <div className="mb-5">
              <h2 className="text-lg font-semibold text-foreground">Questions</h2>
            </div>
            <div className="space-y-4">
          {questions.map((q, i) => (
            <div key={i} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-start gap-3">
                <span
                  className="text-xs font-medium shrink-0 mt-3"
                  style={{
                    color: 'var(--muted-foreground)',
                    width: '1.5rem',
                    textAlign: 'right',
                  }}
                >
                  {i + 1}.
                </span>
                <div
                  className="flex flex-col shrink-0"
                  style={{ width: 18, gap: 2, marginTop: 8 }}
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
                      aria-label={`Move question ${i + 1} up`}
                    >
                      <ChevronUp size={14} aria-hidden="true" />
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
                      aria-label={`Move question ${i + 1} down`}
                    >
                      <ChevronDown size={14} aria-hidden="true" />
                    </button>
                  ) : (
                    <span style={{ height: 14 }} />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <input
                    value={q.label}
                    onChange={(e) => updateQuestion(i, e.target.value)}
                    className="w-full min-w-0 rounded-lg px-3 py-2.5 border border-border bg-card text-foreground"
                    placeholder={`Question ${i + 1}`}
                  />
                  {isSurveyMode ? (
                    <div
                      className="mt-3 rounded-lg px-3 py-2 text-xs"
                      style={{
                        backgroundColor:
                          'color-mix(in srgb, var(--foreground) 3%, transparent)',
                        border: '1px solid var(--border)',
                        color: 'var(--muted-foreground)',
                      }}
                    >
                      Single response box only.
                    </div>
                  ) : (
                    <div
                      className="mt-3 grid gap-3 rounded-lg px-3 py-3 sm:grid-cols-3"
                      style={{
                        backgroundColor:
                          'color-mix(in srgb, var(--foreground) 3%, transparent)',
                        border: '1px solid var(--border)',
                      }}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <label
                            htmlFor={`question-${i + 1}-evidence`}
                            className="block text-sm font-medium"
                            style={{ color: 'var(--foreground)' }}
                          >
                            Evidence
                          </label>
                        </div>
                        <ToggleSwitch
                          id={`question-${i + 1}-evidence`}
                          checked={q.requireEvidence}
                          onChange={(checked) => {
                            const updated = [...questions];
                            updated[i] = { ...updated[i], requireEvidence: checked };
                            setQuestions(updated);
                          }}
                        />
                      </div>

                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <label
                            htmlFor={`question-${i + 1}-counterarguments`}
                            className="block text-sm font-medium"
                            style={{ color: 'var(--foreground)' }}
                          >
                            Counterarguments
                          </label>
                        </div>
                        <ToggleSwitch
                          id={`question-${i + 1}-counterarguments`}
                          checked={q.requireCounterarguments}
                          onChange={(checked) => {
                            const updated = [...questions];
                            updated[i] = { ...updated[i], requireCounterarguments: checked };
                            setQuestions(updated);
                          }}
                        />
                      </div>

                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <label
                            htmlFor={`question-${i + 1}-confidence`}
                            className="block text-sm font-medium"
                            style={{ color: 'var(--foreground)' }}
                          >
                            Confidence
                          </label>
                        </div>
                        <ToggleSwitch
                          id={`question-${i + 1}-confidence`}
                          checked={q.requireConfidence}
                          onChange={(checked) => {
                            const updated = [...questions];
                            updated[i] = { ...updated[i], requireConfidence: checked };
                            setQuestions(updated);
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>
                {questions.length > 1 && (
                  <button
                    className="shrink-0 p-2 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                    style={{ color: 'var(--destructive)' }}
                    type="button"
                    onClick={() => removeQuestion(i)}
                    title="Remove question"
                    aria-label={`Remove question ${i + 1}`}
                  >
                    <Trash2 size={16} aria-hidden="true" />
                  </button>
                )}
              </div>
            </div>
          ))}
            </div>
            <button
              onClick={addQuestion}
              type="button"
              className="inline-flex items-center gap-1.5 mt-4 text-sm font-medium"
              style={{ color: 'var(--accent)' }}
            >
              <Plus size={16} />
              Add question
            </button>
          </div>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
            <div className="card-lg p-5">
              <div className="text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: 'var(--accent)' }}>
                Join code
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <code
                  className="inline-flex items-center rounded-lg px-3 py-2 text-base font-semibold"
                  style={{
                    backgroundColor: 'var(--muted)',
                    border: '1px solid var(--border)',
                    color: 'var(--foreground)',
                    letterSpacing: '0.04em',
                  }}
                >
                  {joinCode}
                </code>
                <LoadingButton variant="ghost" size="sm" onClick={copyJoinCode}>
                  <Copy size={14} className="mr-1.5" />
                  Copy
                </LoadingButton>
              </div>
            </div>

            <div
              className="card-lg p-5"
              style={{
                borderColor: 'color-mix(in srgb, var(--destructive) 22%, var(--border))',
              }}
            >
              <div className="text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: 'var(--destructive)' }}>
                Danger
              </div>
              <p className="mt-2 text-sm" style={{ color: 'var(--muted-foreground)' }}>
                Delete this consultation permanently.
              </p>
              <LoadingButton
                variant="destructive"
                loading={deleting}
                onClick={deleteForm}
                className="mt-4 w-full justify-center px-5 py-2.5"
              >
                <Trash2 size={16} className="mr-2" />
                Delete Consultation
              </LoadingButton>
            </div>
          </div>
        </div>

        <aside className="xl:sticky xl:top-24 self-start">
          <div className="card-lg p-5 sm:p-6">
            <div className="text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: 'var(--accent)' }}>
              Preview
            </div>
            <h2 className="mt-2 text-lg font-semibold text-foreground">What experts will see</h2>
            <p className="text-sm mt-2" style={{ color: 'var(--muted-foreground)' }}>
              {isSurveyMode
                ? 'Each question shows one response box.'
                : 'Structured fields appear in the same Evidence, Counterarguments, Confidence order as the live form.'}
            </p>
            <div
              className="rounded-xl p-4 sm:p-5 mt-4"
              style={{
                backgroundColor: 'color-mix(in srgb, var(--foreground) 2%, var(--card))',
                border: '1px solid var(--border)',
              }}
            >
              {validQuestions.length === 0 ? (
                <div
                  className="rounded-lg px-4 py-5 text-sm"
                  style={{
                    backgroundColor: 'var(--background)',
                    border: '1px dashed var(--border)',
                    color: 'var(--muted-foreground)',
                  }}
                >
                  Add at least one question to preview the expert form.
                </div>
              ) : (
                questions.map((question, index) => {
                  if (!question.label.trim()) {
                    return null;
                  }
                  const key = `q${index + 1}`;
                  return (
                    <div key={key} className="mb-5 last:mb-0">
                      <label
                        className="block text-sm font-medium mb-2"
                        style={{ color: 'var(--foreground)' }}
                      >
                        {question.label}
                      </label>
                      <StructuredInput
                        questionIndex={index}
                        formId={`edit-preview-${id ?? 'form'}`}
                        value={previewResponses[key] ?? emptyStructuredResponse()}
                        onChange={(value) =>
                          setPreviewResponses((prev) => ({ ...prev, [key]: value }))
                        }
                        showEvidence={question.requireEvidence}
                        showCounterarguments={question.requireCounterarguments}
                        showConfidence={question.requireConfidence}
                        persistDraft={false}
                      />
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
