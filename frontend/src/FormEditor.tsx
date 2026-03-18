import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Trash2, Plus, Save, ArrowLeft, ChevronUp, ChevronDown } from 'lucide-react';
import { api, getApiErrorDetail } from './api/client';
import LoadingButton from './components/LoadingButton';
import StructuredInput from './components/StructuredInput';
import { useToast } from './components/Toast';
import { useDocumentTitle } from './hooks/useDocumentTitle';
import { emptyStructuredResponse, type StructuredResponse } from './types/structured-input';
import { normalizeQuestion, type ConfigurableQuestion } from './utils/questions';

interface FormData {
  title: string;
  questions: unknown[];
  join_code: string;
}

function createBlankQuestion(): ConfigurableQuestion {
  return {
    label: '',
    requireEvidence: true,
    requireConfidence: true,
  };
}

function createBlankInformationGatheringQuestion(): ConfigurableQuestion {
  return {
    label: '',
    requireEvidence: false,
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
  const isInformationGatheringMode =
    questions.length > 0 &&
    questions.every(
      question => !question.requireEvidence && !question.requireConfidence,
    );

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
            ? form.questions.map(normalizeQuestion)
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
        allow_join: true,
        join_code: joinCode,
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
      isInformationGatheringMode
        ? createBlankInformationGatheringQuestion()
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

  if (loading) {
    return (
      <div className="flex items-center justify-center" style={{ minHeight: '60vh' }}>
        <p className="text-muted-foreground text-lg">Loading…</p>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 py-6 sm:py-8 max-w-5xl mx-auto">
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

      <h1 className="text-2xl font-bold mb-6 text-foreground">Edit Consultation</h1>

      <div className="card-lg p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4 text-foreground">Consultation Title</h2>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. AI in Education: Risks & Opportunities"
          className="w-full rounded-lg px-3 py-2.5 border border-border bg-card text-foreground"
        />
      </div>

      <div className="card-lg p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4 text-foreground">Questions</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Edit each question and choose whether experts must provide evidence and confidence.
        </p>
        <div className="flex flex-wrap gap-2 mb-4">
          <button
            type="button"
            onClick={() => setResponseStyle('consensus')}
            className="text-sm px-3 py-2 rounded-lg font-medium transition-colors"
            style={{
              border: '1px solid',
              borderColor: isInformationGatheringMode ? 'var(--border)' : 'var(--accent)',
              backgroundColor: isInformationGatheringMode
                ? 'var(--card)'
                : 'color-mix(in srgb, var(--accent) 10%, var(--card))',
              color: isInformationGatheringMode ? 'var(--muted-foreground)' : 'var(--foreground)',
              cursor: 'pointer',
            }}
          >
            Consensus
          </button>
          <button
            type="button"
            onClick={() => setResponseStyle('information')}
            className="text-sm px-3 py-2 rounded-lg font-medium transition-colors"
            style={{
              border: '1px solid',
              borderColor: isInformationGatheringMode ? 'var(--accent)' : 'var(--border)',
              backgroundColor: isInformationGatheringMode
                ? 'color-mix(in srgb, var(--accent) 10%, var(--card))'
                : 'var(--card)',
              color: isInformationGatheringMode ? 'var(--foreground)' : 'var(--muted-foreground)',
              cursor: 'pointer',
            }}
          >
            Information Gathering
          </button>
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
                  {isInformationGatheringMode ? (
                    <div
                      className="mt-3 rounded-lg px-3 py-2 text-xs"
                      style={{
                        backgroundColor:
                          'color-mix(in srgb, var(--foreground) 3%, transparent)',
                        border: '1px solid var(--border)',
                        color: 'var(--muted-foreground)',
                      }}
                    >
                      Participants will see this question with one plain response textbox below it.
                    </div>
                  ) : (
                    <div
                      className="mt-3 flex flex-wrap gap-4 rounded-lg px-3 py-2"
                      style={{
                        backgroundColor:
                          'color-mix(in srgb, var(--foreground) 3%, transparent)',
                        border: '1px solid var(--border)',
                      }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <label
                            htmlFor={`question-${i + 1}-evidence`}
                            className="block text-sm font-medium"
                            style={{ color: 'var(--foreground)' }}
                          >
                            Ask for evidence
                          </label>
                          <p
                            className="text-xs mt-0.5"
                            style={{ color: 'var(--muted-foreground)' }}
                          >
                            Show an evidence and reasoning field for this question.
                          </p>
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

                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <label
                            htmlFor={`question-${i + 1}-confidence`}
                            className="block text-sm font-medium"
                            style={{ color: 'var(--foreground)' }}
                          >
                            Ask for confidence
                          </label>
                          <p
                            className="text-xs mt-0.5"
                            style={{ color: 'var(--muted-foreground)' }}
                          >
                            Show the confidence slider and confidence explanation.
                          </p>
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

      <div className="card-lg p-6 mb-6">
        <h2 className="text-lg font-semibold mb-2 text-foreground">Expert Form Preview</h2>
        <p className="text-sm text-muted-foreground mb-4">
          {isInformationGatheringMode
            ? 'This preview updates immediately so you can verify each question uses a single response textbox.'
            : 'This preview updates immediately so you can verify each question’s evidence and confidence settings.'}
        </p>
        <div
          className="rounded-xl p-4 sm:p-5"
          style={{
            backgroundColor: 'color-mix(in srgb, var(--foreground) 2%, var(--card))',
            border: '1px solid var(--border)',
          }}
        >
          {questions.filter((question) => question.label.trim()).length === 0 ? (
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
                    showConfidence={question.requireConfidence}
                    persistDraft={false}
                  />
                </div>
              );
            })
          )}
        </div>
      </div>

      <div className="card-lg p-6 mb-6">
        <h2 className="text-lg font-semibold mb-2 text-foreground">Join Code</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Share this code with experts so they can access the consultation.
        </p>
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-muted">
          <span className="font-mono text-lg font-semibold text-foreground">{joinCode}</span>
        </div>
      </div>

      <div className="card-lg p-6 flex flex-col sm:flex-row sm:items-center gap-4">
        <LoadingButton
          variant="accent"
          loading={saving}
          onClick={saveForm}
          className="px-6 py-2.5"
        >
          <Save size={16} className="mr-2" />
          Save Edits
        </LoadingButton>

        <LoadingButton
          variant="destructive"
          loading={deleting}
          onClick={deleteForm}
          className="sm:ml-auto px-5 py-2.5"
        >
          <Trash2 size={16} className="mr-2" />
          Delete Consultation
        </LoadingButton>
      </div>
    </div>
  );
}
