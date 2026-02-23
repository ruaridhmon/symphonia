import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Trash2, Plus, Save, ArrowLeft } from 'lucide-react';
import { api } from './api/client';
import { extractQuestionText } from './utils/questions';
import LoadingButton from './components/LoadingButton';
import { useToast } from './components/Toast';
import { useDocumentTitle } from './hooks/useDocumentTitle';

interface FormData {
  title: string;
  questions: (string | { label: string; [key: string]: unknown })[];
  join_code: string;
}

export default function FormEditor() {
  const { id } = useParams();
  const isCreateMode = id === 'new';
  
  useDocumentTitle(isCreateMode ? 'Create Consultation' : 'Edit Consultation');
  const navigate = useNavigate();
  const { toastError, toastSuccess } = useToast();

  const [loading, setLoading] = useState(!isCreateMode);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [title, setTitle] = useState('');
  const [questions, setQuestions] = useState<FormData['questions']>(['']);
  const [joinCode, setJoinCode] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      navigate('/');
      return;
    }

    // In create mode, don't fetch - just set empty state
    if (isCreateMode) {
      setJoinCode(String(Math.floor(10000 + Math.random() * 90000)));
      return;
    }

    // Edit mode - fetch existing form
    api.get<FormData>(`/forms/${id}`)
      .then((form) => {
        setTitle(form.title);
        setQuestions(form.questions || []);
        setJoinCode(form.join_code);
        setLoading(false);
      })
      .catch(() => {
        toastError('Failed to load form');
        setLoading(false);
      });
  }, [id, isCreateMode, navigate, toastError]);

  async function saveForm() {
    if (!title.trim()) {
      toastError('Please enter a title');
      return;
    }

    const validQuestions = questions.filter(q => {
      const text = extractQuestionText(q);
      return text && text.trim() !== '';
    });

    if (validQuestions.length === 0) {
      toastError('Please add at least one question');
      return;
    }

    setSaving(true);

    try {
      if (isCreateMode) {
        // Create new form
        await api.post('/create_form', {
          title,
          questions: validQuestions.map(q => extractQuestionText(q)),
          allow_join: true,
          join_code: joinCode,
        });
        toastSuccess('Consultation created');
      } else {
        // Update existing form
        await api.put(`/forms/${id}`, {
          title,
          questions: validQuestions,
          allow_join: true,
          join_code: joinCode,
        });
        toastSuccess('Consultation saved');
      }
      navigate('/');
    } catch {
      toastError(isCreateMode ? 'Failed to create consultation' : 'Failed to save edits');
    } finally {
      setSaving(false);
    }
  }

  async function deleteForm() {
    if (
      !window.confirm(
        'Are you sure you want to delete this consultation? This action cannot be undone.',
      )
    )
      return;

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
    const original = updated[i];
    if (original && typeof original === 'object') {
      updated[i] = { ...original, label: value };
    } else {
      updated[i] = value;
    }
    setQuestions(updated);
  }

  function addQuestion() {
    setQuestions((prev) => [...prev, '']);
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
      {/* Back link */}
      <button
        onClick={() => navigate('/')}
        className="inline-flex items-center gap-1.5 text-sm font-medium mb-6"
        style={{ color: 'var(--accent)' }}
      >
        <ArrowLeft size={16} />
        Back to Dashboard
      </button>

      {/* Page title */}
      <h1 className="text-2xl font-bold mb-6 text-foreground">
        {isCreateMode ? 'Create New Consultation' : 'Edit Consultation'}
      </h1>

      {/* Title */}
      <div className="card-lg p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4 text-foreground">Consultation Title</h2>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. AI in Education: Risks & Opportunities"
          className="w-full rounded-lg px-3 py-2.5 border border-border bg-card text-foreground"
        />
      </div>

      {/* Questions */}
      <div className="card-lg p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4 text-foreground">Questions</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Add the questions you want experts to respond to in this consultation.
        </p>
        <div className="space-y-3">
          {questions.map((q, i) => (
            <div key={i} className="flex items-start sm:items-center gap-2">
              <span
                className="text-xs font-medium shrink-0 mt-3 sm:mt-0"
                style={{
                  color: 'var(--muted-foreground)',
                  width: '1.5rem',
                  textAlign: 'right',
                }}
              >
                {i + 1}.
              </span>
              <input
                value={extractQuestionText(q)}
                onChange={(e) => updateQuestion(i, e.target.value)}
                className="w-full min-w-0 rounded-lg px-3 py-2.5 border border-border bg-card text-foreground"
                placeholder={`Question ${i + 1}`}
              />
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

      {/* Join Code (read-only preview) */}
      <div className="card-lg p-6 mb-6">
        <h2 className="text-lg font-semibold mb-2 text-foreground">Join Code</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Share this code with experts so they can access the consultation.
        </p>
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-muted">
          <span className="font-mono text-lg font-semibold text-foreground">{joinCode}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="card-lg p-6 flex flex-col sm:flex-row sm:items-center gap-4">
        <LoadingButton
          variant="accent"
          loading={saving}
          onClick={saveForm}
          className="px-6 py-2.5"
        >
          <Save size={16} className="mr-2" />
          {isCreateMode ? 'Create Consultation' : 'Save Edits'}
        </LoadingButton>

        {!isCreateMode && (
          <LoadingButton
            variant="destructive"
            loading={deleting}
            onClick={deleteForm}
            className="sm:ml-auto px-5 py-2.5"
          >
            <Trash2 size={16} className="mr-2" />
            Delete Consultation
          </LoadingButton>
        )}
      </div>
    </div>
  );
}
