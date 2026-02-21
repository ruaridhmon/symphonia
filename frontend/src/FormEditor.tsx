import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Trash2, Plus, Save, ArrowLeft } from 'lucide-react';
import { API_BASE_URL } from './config';
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
  useDocumentTitle('Edit Form');
  const { id } = useParams();
  const navigate = useNavigate();
  const { toastError } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [title, setTitle] = useState('');
  const [questions, setQuestions] = useState<FormData['questions']>([]);
  const [joinCode, setJoinCode] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      navigate('/');
      return;
    }

    fetch(`${API_BASE_URL}/forms/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((form: FormData) => {
        setTitle(form.title);
        setQuestions(form.questions || []);
        setJoinCode(form.join_code);
        setLoading(false);
      });
  }, [id, navigate]);

  async function saveForm() {
    const token = localStorage.getItem('access_token');
    setSaving(true);

    try {
      const res = await fetch(`${API_BASE_URL}/forms/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title,
          questions,
          allow_join: true,
          join_code: joinCode,
        }),
      });

      if (!res.ok) {
        toastError('Failed to save edits');
        return;
      }

      navigate('/');
    } finally {
      setSaving(false);
    }
  }

  async function deleteForm() {
    if (
      !window.confirm(
        'Are you sure you want to delete this form? This action cannot be undone.',
      )
    )
      return;

    setDeleting(true);
    try {
      await fetch(`${API_BASE_URL}/forms/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('access_token')}`,
        },
      });
      navigate('/');
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

      {/* Title */}
      <div className="card-lg p-6 sm:p-8 mb-6">
        <h2 className="text-lg font-semibold mb-4 text-foreground">Form Title</h2>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full rounded-lg px-3 py-2.5 border border-border bg-card text-foreground"
        />
      </div>

      {/* Questions */}
      <div className="card-lg p-6 sm:p-8 mb-6">
        <h2 className="text-lg font-semibold mb-4 text-foreground">Questions</h2>
        <div className="space-y-3">
          {questions.map((q, i) => (
            <div key={i} className="flex items-center gap-2">
              <span
                className="text-xs font-medium shrink-0"
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
                className="w-full rounded-lg px-3 py-2.5 border border-border bg-card text-foreground"
                placeholder={`Question ${i + 1}`}
              />
              <button
                className="shrink-0 p-2 rounded-lg transition-colors"
                style={{ color: 'var(--destructive)' }}
                type="button"
                onClick={() => removeQuestion(i)}
                title="Remove question"
              >
                <Trash2 size={16} />
              </button>
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

      {/* Actions */}
      <div className="card-lg p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center gap-3">
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
          Delete Form
        </LoadingButton>
      </div>
    </div>
  );
}
