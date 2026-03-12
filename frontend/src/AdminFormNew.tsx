import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronUp, ChevronDown, Trash2, RefreshCw, BookOpen, X } from 'lucide-react';
import { API_BASE_URL } from './config';
import { api } from './api/client';
import { useAuth } from './AuthContext';
import Container from './layouts/Container';
import { LoadingButton } from './components';
import StructuredInput from './components/StructuredInput';
import { useDocumentTitle } from './hooks/useDocumentTitle';
import TemplatePicker, { type FormTemplate } from './TemplatePicker';
import { emptyStructuredResponse, type StructuredResponse } from './types/structured-input';
import { normalizeQuestion, type ConfigurableQuestion } from './utils/questions';

/* ── Helpers ──────────────────────────────────────────────────── */

function generateJoinCode(): string {
  return String(Math.floor(10000 + Math.random() * 90000));
}

function createBlankQuestion(): ConfigurableQuestion {
  return {
    label: '',
    requireEvidence: true,
    requireConfidence: true,
  };
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

/* ── Delphi Guide Modal ───────────────────────────────────────── */

function DelphiGuideModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Delphi Consultation Guide"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
      }}
      onClick={onClose}
    >
      {/* Backdrop */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          backdropFilter: 'blur(4px)',
        }}
      />

      {/* Modal panel */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: 640,
          maxHeight: '85vh',
          overflowY: 'auto',
          backgroundColor: 'var(--card)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          padding: '2rem',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        }}
      >
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          style={{
            position: 'absolute',
            top: 16,
            right: 16,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--muted-foreground)',
            padding: 4,
            borderRadius: 6,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          title="Close guide"
          aria-label="Close guide"
        >
          <X size={20} aria-hidden="true" />
        </button>

        {/* Header */}
        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <BookOpen size={22} style={{ color: 'var(--accent)' }} />
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--foreground)', margin: 0 }}>
              Delphi Consultation Guide
            </h2>
          </div>
          <p style={{ fontSize: '0.875rem', color: 'var(--muted-foreground)', margin: 0, lineHeight: 1.6 }}>
            Everything you need to design a great consultation.
          </p>
        </div>

        {/* What is standard Delphi? */}
        <section style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--foreground)', marginBottom: 8 }}>
            What is the Delphi method?
          </h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--muted-foreground)', lineHeight: 1.7, margin: '0 0 10px 0' }}>
            Developed at the RAND Corporation in the 1950s, the Delphi method is a structured process
            for reaching consensus among a panel of experts — without the distortions of face-to-face debate.
            Dominant voices, social pressure, and groupthink are eliminated because each expert responds
            independently and anonymously.
          </p>
          <div style={{ fontSize: '0.85rem', color: 'var(--muted-foreground)', lineHeight: 1.7 }}>
            <p style={{ margin: '0 0 8px 0' }}>
              <strong style={{ color: 'var(--foreground)' }}>Round 1:</strong> A facilitator sends structured
              questionnaires to the expert panel. Experts respond independently, in writing.
            </p>
            <p style={{ margin: '0 0 8px 0' }}>
              <strong style={{ color: 'var(--foreground)' }}>Synthesis:</strong> The facilitator manually
              reads all responses, extracts themes, identifies areas of agreement and disagreement,
              and writes a summary.
            </p>
            <p style={{ margin: '0 0 8px 0' }}>
              <strong style={{ color: 'var(--foreground)' }}>Round 2+:</strong> Experts see the anonymised
              summary and respond again — refining their positions, challenging others, or converging
              toward shared views.
            </p>
            <p style={{ margin: 0 }}>
              <strong style={{ color: 'var(--foreground)' }}>Outcome:</strong> After 2–4 rounds a clear picture
              emerges — areas of genuine consensus, and areas of principled disagreement worth
              understanding.
            </p>
          </div>
        </section>

        {/* Divider */}
        <div style={{ borderTop: '1px solid var(--border)', margin: '1.25rem 0' }} />

        {/* How Symphonia augments Delphi */}
        <section style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--foreground)', marginBottom: 4 }}>
            How Symphonia augments this process
          </h3>
          <p style={{ fontSize: '0.83rem', color: 'var(--muted-foreground)', lineHeight: 1.6, margin: '0 0 14px 0' }}>
            Symphonia keeps the Delphi principles intact — anonymity, independent response, iterative
            refinement — and replaces the bottleneck: manual facilitation.
          </p>

          {/* Core augmentations */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
            {[
              { label: 'AI synthesis', desc: 'Instead of a facilitator spending days reading and summarising, AI analyses all responses in minutes — identifying convergence, surfacing minority views, and preserving nuance that would otherwise be lost.' },
              { label: 'Convergence scoring', desc: 'Each round is automatically scored for how much expert opinion is converging. You can see at a glance whether another round is warranted.' },
              { label: 'Suggested follow-up questions', desc: 'After synthesis, Symphonia can suggest targeted questions for the next round. The admin reviews, edits, or replaces them — full automation is available but the facilitator stays in control.' },
              { label: 'Speed', desc: 'A traditional Delphi takes weeks per round due to manual synthesis. Symphonia compresses this to hours — without sacrificing rigour.' },
            ].map((item, i) => (
              <div key={i} style={{ fontSize: '0.83rem', lineHeight: 1.6, display: 'flex', gap: 10 }}>
                <span style={{ color: 'var(--accent)', fontWeight: 700, flexShrink: 0 }}>+</span>
                <span style={{ color: 'var(--muted-foreground)' }}>
                  <strong style={{ color: 'var(--foreground)' }}>{item.label}:</strong> {item.desc}
                </span>
              </div>
            ))}
          </div>

          {/* Analysis tools */}
          <p style={{ fontSize: '0.83rem', fontWeight: 600, color: 'var(--foreground)', margin: '0 0 8px 0' }}>
            Analysis tools
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
            {[
              { label: 'Structured Analysis', desc: 'The synthesis is broken into structured sections — key findings, areas of agreement, areas of tension, and open questions — making it easy to navigate complex expert opinion.' },
              { label: 'Consensus Heatmap', desc: 'A visual matrix showing where experts align and where they diverge, question by question. Spots of red reveal the sharpest disagreements worth probing further.' },
              { label: "Expert Cross-Analysis", desc: "A cross-reference view showing how each expert's position relates to others — surfacing which experts are outliers, which are anchors, and where surprising alignments exist." },
              { label: "Emergent Insights", desc: "AI identifies patterns, themes, and connections that don't appear in any single response — ideas that only become visible when the full expert panel is considered together." },
              { label: "Expert Voice Mirroring", desc: "Each expert's response is available in its original form or as an AI-clarified version that improves readability while preserving meaning exactly. Toggle between them at any time." },
              { label: 'Version History', desc: 'Every synthesis is versioned. You can compare how the expert consensus has evolved across rounds — and revert to any earlier synthesis if needed.' },
            ].map((item, i) => (
              <div key={i} style={{ fontSize: '0.83rem', lineHeight: 1.6, display: 'flex', gap: 10 }}>
                <span style={{ color: 'var(--accent)', fontWeight: 700, flexShrink: 0 }}>◆</span>
                <span style={{ color: 'var(--muted-foreground)' }}>
                  <strong style={{ color: 'var(--foreground)' }}>{item.label}:</strong> {item.desc}
                </span>
              </div>
            ))}
          </div>

          {/* Synthesis strategies */}
          <p style={{ fontSize: '0.83rem', fontWeight: 600, color: 'var(--foreground)', margin: '0 0 8px 0' }}>
            Synthesis strategies
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              { label: 'Simple', desc: 'A single AI pass over all responses. Fast, clear, good for most consultations.' },
              { label: 'Committee', desc: 'Multiple AI reviewers synthesise independently, then an integrator resolves disagreements between the syntheses. More thorough — catches things a single pass misses.' },
              { label: 'Test-Time Diffusion (TTD)', desc: 'An advanced iterative synthesis — the AI generates and refines multiple candidate syntheses, selecting the most accurate convergence of expert views. Best for high-stakes consultations where precision matters most.' },
            ].map((item, i) => (
              <div key={i} style={{ fontSize: '0.83rem', lineHeight: 1.6, display: 'flex', gap: 10 }}>
                <span style={{ color: 'var(--muted-foreground)', fontWeight: 700, flexShrink: 0 }}>→</span>
                <span style={{ color: 'var(--muted-foreground)' }}>
                  <strong style={{ color: 'var(--foreground)' }}>{item.label}:</strong> {item.desc}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* Good questions */}
        <section style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--foreground)', marginBottom: 8 }}>
            ✅ Good questions look like this
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {[
              'What are the most significant barriers to adopting AI in clinical settings over the next 5 years?',
              'How should regulatory frameworks adapt to keep pace with generative AI capabilities?',
              'What key factors will determine whether autonomous vehicles achieve broad public trust by 2030?',
            ].map((q, i) => (
              <div
                key={i}
                style={{
                  fontSize: '0.83rem',
                  padding: '8px 12px',
                  borderRadius: 8,
                  backgroundColor: 'color-mix(in srgb, var(--accent) 8%, transparent)',
                  border: '1px solid color-mix(in srgb, var(--accent) 20%, transparent)',
                  color: 'var(--foreground)',
                  lineHeight: 1.5,
                }}
              >
                {q}
              </div>
            ))}
          </div>
          <p style={{ fontSize: '0.78rem', color: 'var(--muted-foreground)', marginTop: 8 }}>
            Open-ended, forward-looking, neutral, specific, expert-relevant.
          </p>
        </section>

        {/* Bad questions */}
        <section style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--foreground)', marginBottom: 8 }}>
            ❌ Avoid questions like these
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {[
              { q: 'Should we regulate AI?', why: 'Binary — experts just say yes/no' },
              { q: 'Given the obvious dangers of deepfakes, how should we ban them?', why: 'Leading — implies the answer' },
              { q: 'What do you think about technology?', why: 'Too broad — no focus' },
            ].map((item, i) => (
              <div
                key={i}
                style={{
                  fontSize: '0.83rem',
                  padding: '8px 12px',
                  borderRadius: 8,
                  backgroundColor: 'color-mix(in srgb, var(--destructive) 6%, transparent)',
                  border: '1px solid color-mix(in srgb, var(--destructive) 15%, transparent)',
                  color: 'var(--foreground)',
                  lineHeight: 1.5,
                }}
              >
                <span style={{ fontStyle: 'italic' }}>"{item.q}"</span>
                <span style={{ color: 'var(--muted-foreground)', marginLeft: 6 }}>— {item.why}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Tips */}
        <section>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--foreground)', marginBottom: 8 }}>
            💡 Tips for a great consultation
          </h3>
          <ul style={{ fontSize: '0.83rem', color: 'var(--muted-foreground)', lineHeight: 1.8, paddingLeft: 20, margin: 0 }}>
            <li>Start with 3–5 well-crafted questions — quality beats quantity.</li>
            <li>Each question should cover one topic only. Split double-barrelled questions.</li>
            <li>Use "What…", "How…", "In what ways…" — not "Do you agree…"</li>
            <li>Think: "Would 10 different experts give 10 meaningfully different answers?"</li>
            <li>Write a clear title — it helps experts calibrate their responses.</li>
            <li>Draft questions manually first, then refine after seeing round-one responses.</li>
          </ul>
        </section>
      </div>
    </div>
  );
}

/* ── Main component ───────────────────────────────────────────── */

export default function AdminFormNew() {
  useDocumentTitle('Create New Form');
  const { token } = useAuth();
  const navigate = useNavigate();

  /* Template picker state */
  const [showTemplatePicker, setShowTemplatePicker] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState<FormTemplate | null>(null);

  /* Core state */
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [joinCode, setJoinCode] = useState(() => generateJoinCode());
  const [questions, setQuestions] = useState<ConfigurableQuestion[]>([createBlankQuestion()]);
  const [previewResponses, setPreviewResponses] = useState<Record<string, StructuredResponse>>({});
  const [saving, setSaving] = useState(false);
  const [synthesisModel, setSynthesisModel] = useState('openai/gpt-4o');
  const [error, setError] = useState<string | null>(null);

  /* Question interaction state (Worker B) */
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);

  /* Settings state (Worker C) */
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [allowJoin, setAllowJoin] = useState(true);
  const [anonymous, setAnonymous] = useState(false);
  const [deadline, setDeadline] = useState('');

  // Load synthesis model from settings
  useEffect(() => {
    api.get<Record<string, string>>('/admin/settings')
      .then(data => { if (data.synthesis_model) setSynthesisModel(data.synthesis_model); })
      .catch(() => {}); // silently fall back to default
  }, []);

  /* Template selection handlers */
  const handleSelectTemplate = (template: FormTemplate) => {
    setSelectedTemplate(template);
    setTitle(template.name);
    setDescription(template.description);
    setQuestions(template.default_questions.map(normalizeQuestion));
    setShowTemplatePicker(false);
  };

  const handleStartBlank = () => {
    setSelectedTemplate(null);
    setTitle('');
    setDescription('');
    setQuestions([createBlankQuestion()]);
    setShowTemplatePicker(false);
  };

  const handleBackToTemplates = () => {
    setShowTemplatePicker(true);
    setSelectedTemplate(null);
  };

  /* Worker D state — Guide modal */
  const [guideOpen, setGuideOpen] = useState(false);

  const swapQuestions = (a: number, b: number) => {
    const updated = [...questions];
    [updated[a], updated[b]] = [updated[b], updated[a]];
    setQuestions(updated);
  };

  useEffect(() => {
    setPreviewResponses(prev => {
      const next: Record<string, StructuredResponse> = {};
      questions.forEach((_, index) => {
        const key = `q${index + 1}`;
        next[key] = prev[key] ?? emptyStructuredResponse();
      });
      return next;
    });
  }, [questions]);

  const createForm = async () => {
    if (!title.trim()) {
      setError('Please enter a form title.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/forms/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || undefined,
          questions: questions.filter(q => q.label.trim() !== ''),
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
        {/* Delphi Guide Modal */}
        <DelphiGuideModal open={guideOpen} onClose={() => setGuideOpen(false)} />

        {/* Back button */}
        <button
          type="button"
          onClick={() => showTemplatePicker ? navigate('/') : handleBackToTemplates()}
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
          ← {showTemplatePicker ? 'Back to Dashboard' : 'Back to Templates'}
        </button>

        {/* ── Template Picker View ────────────────────────────── */}
        {showTemplatePicker ? (
          <div>
            <div className="mb-6">
              <h1
                className="text-2xl font-bold tracking-tight"
                style={{ color: 'var(--foreground)' }}
              >
                Create a New Form
              </h1>
              <p className="text-sm mt-1" style={{ color: 'var(--muted-foreground)' }}>
                Pick a template to get started quickly, or create a blank form from scratch.
              </p>
            </div>
            <TemplatePicker
              onSelectTemplate={handleSelectTemplate}
              onStartBlank={handleStartBlank}
            />
          </div>
        ) : (
        <>

        {/* ── Form Editor View ────────────────────────────────── */}
        <div className="mb-6" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <h1
              className="text-2xl font-bold tracking-tight"
              style={{ color: 'var(--foreground)' }}
            >
              {selectedTemplate ? `New Form — ${selectedTemplate.icon} ${selectedTemplate.name}` : 'Create a New Form'}
            </h1>
              <p className="text-sm mt-1" style={{ color: 'var(--muted-foreground)' }}>
                {selectedTemplate
                  ? 'Customise the template below, then create your consultation.'
                  : 'Set up a new Delphi consultation with title and questions.'}
              </p>
          </div>

          {/* Guide button — Worker D */}
          <button
            type="button"
            onClick={() => setGuideOpen(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 14px',
              borderRadius: 8,
              border: '1px solid var(--border)',
              backgroundColor: 'var(--background)',
              color: 'var(--muted-foreground)',
              fontSize: '0.82rem',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              flexShrink: 0,
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = 'var(--accent)';
              e.currentTarget.style.color = 'var(--accent)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = 'var(--border)';
              e.currentTarget.style.color = 'var(--muted-foreground)';
            }}
          >
            <BookOpen size={16} />
            Guide
          </button>
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
              htmlFor="form-title"
              className="block text-sm font-medium"
              style={{ color: 'var(--foreground)' }}
            >
              Form title
            </label>
            <input
              id="form-title"
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
              htmlFor="form-description"
              className="block text-sm font-medium"
              style={{ color: 'var(--foreground)' }}
            >
              Description (optional)
            </label>
            <textarea
              id="form-description"
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

          {/* ── Questions (Workers A + B) ─────────────────────────── */}
          <fieldset className="space-y-2 mb-4" style={{ border: 'none', margin: 0, padding: 0 }}>
            <legend
              className="block text-sm font-medium"
              style={{ color: 'var(--foreground)' }}
            >
              Questions
            </legend>
            <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
              Good questions are open-ended, neutral, and invite diverse
              perspectives.
            </p>

            {questions.map((q, i) => {
              const isOnly = questions.length === 1;
              const isEmpty = q.label.length === 0;
              const showCounter = focusedIndex === i || q.label.length > 0;

              return (
                <div
                  key={i}
                  className="rounded-xl p-3"
                  style={{ transition: 'opacity 0.15s ease' }}
                  onMouseEnter={() => setHoveredRow(i)}
                  onMouseLeave={() => setHoveredRow(null)}
                >
                  <div
                    className="flex gap-2 items-start"
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
                        marginTop: 8,
                      }}
                    >
                      {i + 1}
                    </span>

                    {/* Reorder arrows */}
                    <div
                      className="flex flex-col flex-shrink-0"
                      style={{ width: 18, gap: 1, marginTop: 6 }}
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
                      {/* Input with character counter */}
                      <div className="flex-1" style={{ position: 'relative' }}>
                        <input
                          type="text"
                          aria-label={`Question ${i + 1}`}
                          placeholder={
                            isOnly && isEmpty
                              ? 'e.g. What do you see as the biggest barrier to AI adoption in your sector?'
                              : `Question ${i + 1}`
                          }
                          value={q.label}
                          onChange={e => {
                            const updated = [...questions];
                            updated[i] = { ...updated[i], label: e.target.value };
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
                            {q.label.length}/200
                          </span>
                        )}
                      </div>

                      <div
                        className="mt-3 flex flex-wrap gap-4 rounded-lg px-3 py-2"
                        style={{
                          backgroundColor: 'color-mix(in srgb, var(--foreground) 3%, transparent)',
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
                            <p className="text-xs mt-0.5" style={{ color: 'var(--muted-foreground)' }}>
                              Show an evidence and reasoning field under this question.
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
                            <p className="text-xs mt-0.5" style={{ color: 'var(--muted-foreground)' }}>
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
                    </div>
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
                      aria-label={`Remove question ${i + 1}`}
                    >
                      <Trash2 size={16} aria-hidden="true" />
                    </button>
                  )}
                </div>
              );
            })}
          </fieldset>

          {/* ── Add questions (primary drafting action) ───────────────── */}
          <div className="mt-4 mb-3">
            <button
              type="button"
              onClick={() => setQuestions([...questions, createBlankQuestion()])}
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
          </div>

          <div className="mb-6">
            <div className="flex items-center justify-between gap-3 mb-3">
              <div>
                <h2 className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>
                  Expert Form Preview
                </h2>
                <p className="text-xs mt-0.5" style={{ color: 'var(--muted-foreground)' }}>
                  This is what participants will see. Your question toggles apply immediately here.
                </p>
              </div>
            </div>
            <div
              className="rounded-xl p-4 sm:p-5"
              style={{
                backgroundColor: 'color-mix(in srgb, var(--foreground) 2%, var(--card))',
                border: '1px solid var(--border)',
              }}
            >
              <div className="mb-4">
                <div className="text-lg font-semibold" style={{ color: 'var(--foreground)' }}>
                  {title.trim() || 'Untitled consultation'}
                </div>
                <p className="text-sm mt-1" style={{ color: 'var(--muted-foreground)' }}>
                  {description.trim() || 'Add a description to show experts what this consultation is about.'}
                </p>
              </div>

              {questions.filter(question => question.label.trim()).length === 0 ? (
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
                questions
                  .map((question, index) => {
                    if (!question.label.trim()) {
                      return null;
                    }
                    const key = `q${index + 1}`;
                    return (
                      <div key={key} className="mb-5 last:mb-0">
                        <label className="block text-sm font-medium mb-2" style={{ color: 'var(--foreground)' }}>
                          {question.label}
                        </label>
                        <StructuredInput
                          questionIndex={index}
                          formId="preview"
                          value={previewResponses[key] ?? emptyStructuredResponse()}
                          onChange={(value) =>
                            setPreviewResponses(prev => ({ ...prev, [key]: value }))
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

          {/* ── Join Code (moved lower for clearer flow) ─────────────── */}
          <div className="space-y-1.5 mb-6">
            <label
              htmlFor="form-join-code"
              className="block text-sm font-medium"
              style={{ color: 'var(--foreground)' }}
            >
              Join code
            </label>
            <div className="flex gap-2 items-center">
              <input
                id="form-join-code"
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
                aria-label="Regenerate join code"
              >
                <RefreshCw size={16} aria-hidden="true" />
              </button>
            </div>
            <p
              className="text-xs mt-1"
              style={{ color: 'var(--muted-foreground)' }}
            >
              Share this code with participants so they can join.
            </p>
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
              aria-expanded={settingsOpen}
              aria-label="Advanced Settings"
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
          <div className="flex flex-col sm:flex-row items-start sm:items-center sm:justify-end gap-3 mt-6">
            <div className="flex gap-3 self-end sm:self-auto">
              <LoadingButton
                variant="ghost"
                size="md"
                onClick={() => navigate('/')}
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
        </>
        )}
      </Container>
    </section>
  );
}
