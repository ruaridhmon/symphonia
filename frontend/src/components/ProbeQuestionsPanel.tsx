import { useState } from 'react';
import { Crosshair, Loader2, ChevronDown, Copy, Check } from 'lucide-react';
import { generateProbeQuestions } from '../api/synthesis';
import type { ProbeQuestion, ProbeCategory } from '../api/synthesis';

interface ProbeQuestionsPanelProps {
  formId: number;
  roundId: number;
  synthesisText?: string;
}

const CATEGORY_STYLES: Record<
  ProbeCategory,
  { bg: string; text: string; label: string; emoji: string }
> = {
  assumption: {
    bg: 'color-mix(in srgb, var(--accent) 12%, transparent)',
    text: 'var(--accent)',
    label: 'Assumption',
    emoji: '🔍',
  },
  challenge: {
    bg: 'color-mix(in srgb, var(--destructive) 10%, transparent)',
    text: 'var(--destructive)',
    label: 'Challenge',
    emoji: '⚔️',
  },
  disagreement: {
    bg: 'color-mix(in srgb, var(--warning) 12%, transparent)',
    text: 'var(--warning)',
    label: 'Disagreement',
    emoji: '⚡',
  },
  depth: {
    bg: 'color-mix(in srgb, var(--success) 10%, transparent)',
    text: 'var(--success)',
    label: 'Depth',
    emoji: '🌊',
  },
  blind_spot: {
    bg: 'rgba(139,92,246,0.12)',
    text: '#8b5cf6',
    label: 'Blind Spot',
    emoji: '🎯',
  },
  clarification: {
    bg: 'color-mix(in srgb, var(--muted-foreground) 12%, transparent)',
    text: 'var(--muted-foreground)',
    label: 'Clarification',
    emoji: '💡',
  },
};

function CategoryBadge({ category }: { category: ProbeCategory }) {
  const s = CATEGORY_STYLES[category] || CATEGORY_STYLES.depth;
  return (
    <span
      className="text-xs font-medium px-2 py-0.5 rounded-full whitespace-nowrap"
      style={{ backgroundColor: s.bg, color: s.text }}
    >
      {s.emoji} {s.label}
    </span>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      onClick={handleCopy}
      title="Copy question"
      className="flex-shrink-0 p-1 rounded transition-colors"
      style={{
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        color: copied ? 'var(--success)' : 'var(--muted-foreground)',
        opacity: 0.7,
      }}
    >
      {copied ? <Check size={13} /> : <Copy size={13} />}
    </button>
  );
}

export default function ProbeQuestionsPanel({
  formId,
  roundId,
  synthesisText = '',
}: ProbeQuestionsPanelProps) {
  const [questions, setQuestions] = useState<ProbeQuestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(true);
  const [generated, setGenerated] = useState(false);
  const [isMock, setIsMock] = useState(false);

  async function handleGenerate() {
    setLoading(true);
    setError(null);
    try {
      const result = await generateProbeQuestions(formId, roundId, synthesisText);
      setQuestions(result.questions);
      setIsMock(result.mock);
      setGenerated(true);
      setExpanded(true);
    } catch (err) {
      setError((err as Error).message || 'Failed to generate probing questions');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card p-4 sm:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={() => generated && setExpanded(e => !e)}
          className="flex items-center gap-2 text-left"
          style={{
            background: 'none',
            border: 'none',
            cursor: generated ? 'pointer' : 'default',
            padding: 0,
          }}
          aria-expanded={generated ? expanded : undefined}
          aria-label="Toggle AI probe questions section"
        >
          <Crosshair size={20} style={{ color: 'var(--accent)' }} />
          <h2 className="text-lg font-semibold text-foreground">
            🎯 AI Probing Questions
          </h2>
          {generated && (
            <ChevronDown
              size={16}
              className="transition-transform"
              style={{
                color: 'var(--muted-foreground)',
                transform: expanded ? 'rotate(0deg)' : 'rotate(-90deg)',
              }}
            />
          )}
        </button>
        <button
          onClick={handleGenerate}
          disabled={loading}
          className="text-sm font-medium px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5"
          style={{
            backgroundColor: loading
              ? 'var(--muted)'
              : 'color-mix(in srgb, var(--accent) 12%, transparent)',
            color: loading ? 'var(--muted-foreground)' : 'var(--accent)',
            border: 'none',
            cursor: loading ? 'not-allowed' : 'pointer',
          }}
        >
          {loading ? (
            <>
              <Loader2 size={14} className="animate-spin" />
              Generating…
            </>
          ) : generated ? (
            'Regenerate'
          ) : (
            'Generate'
          )}
        </button>
      </div>

      {/* Subtitle */}
      <p className="text-xs mb-3" style={{ color: 'var(--muted-foreground)' }}>
        AI-generated questions designed to surface hidden assumptions, sharpen disagreements, and deepen the enquiry for the next round.
      </p>

      {/* Mock mode notice */}
      {isMock && generated && (
        <div
          className="flex items-start gap-2 text-xs rounded-lg px-3 py-2 mb-3"
          style={{
            backgroundColor: 'rgba(249,115,22,0.06)',
            color: 'var(--muted-foreground)',
          }}
        >
          <span>⚠️</span>
          <span>
            <strong>Mock mode</strong> — Add an <code>OPENROUTER_API_KEY</code> to enable real AI-generated questions.
          </span>
        </div>
      )}

      {/* Error */}
      {error && (
        <div
          className="text-sm rounded-lg px-3 py-2 mb-3"
          style={{
            backgroundColor: 'rgba(239,68,68,0.08)',
            color: 'var(--destructive)',
          }}
        >
          {error}
        </div>
      )}

      {/* Questions list */}
      {generated && expanded && questions.length > 0 && (
        <div className="space-y-3">
          {questions.map((q, i) => (
            <div
              key={i}
              className="rounded-lg p-3 sm:p-4"
              style={{
                backgroundColor: 'var(--muted)',
                border: '1px solid var(--border)',
              }}
            >
              <div className="flex items-start gap-2 mb-2">
                <span
                  className="flex-shrink-0 flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold mt-0.5"
                  style={{
                    backgroundColor: 'color-mix(in srgb, var(--accent) 15%, transparent)',
                    color: 'var(--accent)',
                  }}
                >
                  {i + 1}
                </span>
                <p className="text-sm font-medium text-foreground flex-1">{q.question}</p>
                <CopyButton text={q.question} />
              </div>
              <div className="flex items-start gap-2 mt-1 ml-7">
                <CategoryBadge category={q.category} />
                <p className="text-xs flex-1" style={{ color: 'var(--muted-foreground)' }}>
                  {q.rationale}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!generated && !loading && (
        <p
          className="text-sm text-center py-4"
          style={{ color: 'var(--muted-foreground)' }}
        >
          Click <strong>Generate</strong> to have AI craft maximally-probing follow-up questions based on the full expert context.
        </p>
      )}
    </div>
  );
}
