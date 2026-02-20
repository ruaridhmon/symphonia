import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from './config';
import { LoadingButton, SynthesisDisplay } from './components';

export default function ResultPage() {
  const [html, setHtml] = useState('');
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [responses, setResponses] = useState({
    accuracy: '',
    influence: '',
    furtherThoughts: '',
    usability: '',
  });
  const hadSummary = useRef(false);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      navigate('/');
      return;
    }

    const load = async () => {
      try {
        const me = await fetch(`${API_BASE_URL}/me`, {
          headers: { Authorization: `Bearer ${token}` },
        }).then((r) => r.json());

        setEmail(me.email || '');

        const feedback = await fetch(`${API_BASE_URL}/has_submitted_feedback`, {
          headers: { Authorization: `Bearer ${token}` },
        }).then((r) => r.json());

        if (feedback.submitted === true) {
          navigate('/thank-you', { replace: true });
          return;
        }

        const summary = await fetch(`${API_BASE_URL}/summary_text`, {
          headers: { Authorization: `Bearer ${token}` },
        }).then((r) => r.json());

        if (!summary.summary?.trim()) {
          navigate('/waiting', { replace: true });
          return;
        }

        setHtml(summary.summary);
        hadSummary.current = true;
      } catch (err) {
        console.error('ResultPage load error:', err);
        navigate('/waiting', { replace: true });
      }
    };

    load();
  }, [navigate]);

  useEffect(() => {
    const ws = new WebSocket(
      `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${new URL(API_BASE_URL).host}/ws`
    );

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
      } catch (err) {
        console.error('WebSocket parse error:', err);
      }
    };

    return () => ws.close();
  }, [navigate]);

  function logout() {
    localStorage.clear();
    navigate('/');
  }

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
      const token = localStorage.getItem('access_token');
      await fetch(`${API_BASE_URL}/submit_feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(responses),
      });
      navigate('/thank-you');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex-1 px-4 sm:px-6 py-6 sm:py-8 max-w-6xl mx-auto space-y-6">
      <div className="max-w-3xl mx-auto bounce-in">
        <SynthesisDisplay
          content={html}
          title="Final Synthesis"
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
