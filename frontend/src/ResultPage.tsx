import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getWebSocketUrl } from './api/ws';
import { api } from './api/client';
import { LoadingButton, SynthesisDisplay } from './components';
import { useDocumentTitle } from './hooks/useDocumentTitle';
import Skeleton from './components/Skeleton';
import OwnResponseCard from './components/OwnResponseCard';

interface ResultState {
  formId?: string;
  formTitle?: string;
}

export default function ResultPage() {
  useDocumentTitle('Synthesis Results');
  const [html, setHtml] = useState('');
  const [ownResponse, setOwnResponse] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [responses, setResponses] = useState({
    accuracy: '',
    influence: '',
    furtherThoughts: '',
    usability: '',
  });
  const hadSummary = useRef(false);
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state as ResultState) || {};
  const resultFormId = state.formId || localStorage.getItem('last_result_form_id') || '';
  const resultFormTitle = state.formTitle || localStorage.getItem('last_result_form_title') || '';

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      navigate('/');
      return;
    }

    const load = async () => {
      try {
        setError(null);
        setLoading(true);

        const feedback = await api.get<{ submitted: boolean }>('/has_submitted_feedback');
        if (feedback.submitted === true) {
          navigate('/thank-you', { replace: true });
          return;
        }

        const summary: {
          summary: string;
          show_own_response_to_participants?: boolean;
          own_response?: Record<string, unknown> | null;
        } = resultFormId
          ? await api.get<{
              summary: string;
              show_own_response_to_participants?: boolean;
              own_response?: Record<string, unknown> | null;
            }>(`/forms/${resultFormId}/summary_text`)
          : await api.get<{ summary: string }>('/summary_text');
        if (!summary.summary?.trim()) {
          navigate('/waiting', { replace: true });
          return;
        }

        setHtml(summary.summary);
        setOwnResponse('own_response' in summary ? summary.own_response || null : null);
        hadSummary.current = true;
      } catch {
        setError('Failed to load synthesis results. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [navigate, resultFormId]);

  useEffect(() => {
    const ws = new WebSocket(getWebSocketUrl('/ws'));

    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        if (msg.type === 'summary_updated') {
          const newHtml = (msg.html ?? msg.summary ?? '').trim();
          if (!newHtml && hadSummary.current) {
            navigate('/waiting', { replace: true });
          } else if (newHtml) {
            hadSummary.current = true;
            setHtml(newHtml);
          }
        }
      } catch {
        // Ignore malformed WebSocket messages
      }
    };

    return () => ws.close();
  }, [navigate]);

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setResponses((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function autoResize(e: React.ChangeEvent<HTMLTextAreaElement>) {
    e.target.style.height = 'auto';
    e.target.style.height = `${e.target.scrollHeight}px`;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await api.post('/submit_feedback', responses);
      navigate('/thank-you');
    } finally {
      setIsSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex-1 px-4 sm:px-6 py-6 sm:py-8 max-w-3xl mx-auto space-y-6">
        <Skeleton variant="card" width="100%" height="200px" />
        <Skeleton variant="card" width="100%" height="300px" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 px-4 sm:px-6 py-6 sm:py-8 max-w-3xl mx-auto">
        <div
          className="card-lg p-8 sm:p-10 text-center space-y-4"
        >
          <p style={{ color: 'var(--destructive)' }}>{error}</p>
          <LoadingButton
            variant="accent"
            size="md"
            onClick={() => window.location.reload()}
          >
            Retry
          </LoadingButton>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 px-4 sm:px-6 py-6 sm:py-8 max-w-6xl mx-auto space-y-6 overflow-x-hidden">
      <div className="max-w-3xl mx-auto bounce-in overflow-x-hidden">
        <SynthesisDisplay
          content={html}
          title={resultFormTitle ? `${resultFormTitle} synthesis` : 'Final Synthesis'}
        />
        <OwnResponseCard
          answers={ownResponse}
          title="Your response"
          subtitle="Included because the facilitator has enabled this view."
        />
      </div>

      <form
        onSubmit={handleSubmit}
        className="card-lg p-8 sm:p-10 w-full space-y-6 fade-in"
      >
        <h3 className="text-lg font-semibold text-foreground">
          Post-Synthesis Feedback
        </h3>

        {(
          [
            [
              'accuracy',
              'Does this summary accurately reflect your viewpoint?',
            ],
            [
              'influence',
              'Has this synthesis affected your viewpoint in any way?',
            ],
            [
              'furtherThoughts',
              "Are there any further thoughts you'd like to add?",
            ],
            ['usability', 'How did you find using the platform?'],
          ] as const
        ).map(([name, label]) => (
          <div key={name}>
            <label className="text-sm text-muted-foreground block mb-1.5">
              {label}
            </label>
            <textarea
              name={name}
              rows={2}
              onInput={autoResize}
              className="w-full rounded-lg px-4 py-2.5 resize-none overflow-hidden scroll-mt-24 bg-muted"
              onChange={handleChange}
              value={responses[name]}
              required
            />
          </div>
        ))}

        <LoadingButton
          type="submit"
          variant="accent"
          size="lg"
          loading={isSubmitting}
          loadingText="Submitting…"
          className="w-full"
        >
          Submit Feedback
        </LoadingButton>
      </form>
    </div>
  );
}
