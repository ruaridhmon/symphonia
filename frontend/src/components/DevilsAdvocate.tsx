import { useState } from 'react';
import { ShieldAlert, Loader2, AlertTriangle, ChevronDown } from 'lucide-react';
import { generateDevilsAdvocate, pollSynthesisJob } from '../api/synthesis';
import type { Counterargument } from '../api/synthesis';

interface DevilsAdvocateProps {
  formId: number;
  roundId: number;
}

const STRENGTH_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  strong: { bg: 'color-mix(in srgb, var(--destructive) 12%, transparent)', text: 'var(--destructive)', label: 'Strong' },
  moderate: { bg: 'color-mix(in srgb, var(--warning) 12%, transparent)', text: 'var(--warning)', label: 'Moderate' },
  weak: { bg: 'color-mix(in srgb, var(--success) 12%, transparent)', text: 'var(--success)', label: 'Weak' },
};

function StrengthBadge({ strength }: { strength: string }) {
  const s = STRENGTH_STYLES[strength] || STRENGTH_STYLES.moderate;
  return (
    <span
      className="text-xs font-medium px-2 py-0.5 rounded-full"
      style={{ backgroundColor: s.bg, color: s.text }}
    >
      {s.label}
    </span>
  );
}

export default function DevilsAdvocate({ formId, roundId }: DevilsAdvocateProps) {
  const [counterarguments, setCounterarguments] = useState<Counterargument[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(true);
  const [generated, setGenerated] = useState(false);

  async function handleGenerate() {
    setLoading(true);
    setError(null);
    try {
      // POST returns immediately with {job_id, status: "pending"}
      const { job_id } = await generateDevilsAdvocate(formId, roundId) as { job_id: string; status: string };
      // Poll until complete or failed
      while (true) {
        await new Promise(r => setTimeout(r, 3000));
        const job = await pollSynthesisJob(job_id);
        if (job.status === 'complete') {
          setCounterarguments((job.result as { counterarguments: Counterargument[] }).counterarguments ?? []);
          setGenerated(true);
          setExpanded(true);
          break;
        } else if (job.status === 'failed') {
          throw new Error(job.error || 'Generation failed');
        }
        // still running — loop
      }
    } catch (err) {
      setError((err as Error).message || 'Failed to generate counterarguments');
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
          style={{ background: 'none', border: 'none', cursor: generated ? 'pointer' : 'default', padding: 0 }}
        >
          <ShieldAlert size={20} style={{ color: 'var(--warning)' }} />
          <h2 className="text-lg font-semibold text-foreground">
            🤖 AI Counterpoints
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
            backgroundColor: loading ? 'var(--muted)' : 'rgba(249,115,22,0.12)',
            color: loading ? 'var(--muted-foreground)' : 'var(--warning)',
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

      {/* Disclaimer */}
      <div
        className="flex items-start gap-2 text-xs rounded-lg px-3 py-2 mb-3"
        style={{ backgroundColor: 'rgba(249,115,22,0.06)', color: 'var(--muted-foreground)' }}
      >
        <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" style={{ color: 'var(--warning)' }} />
        <span>
          These counterarguments are <strong>AI-generated</strong> and do not represent expert views.
          They highlight potential blind spots for consideration.
        </span>
      </div>

      {/* Error */}
      {error && (
        <div
          className="text-sm rounded-lg px-3 py-2 mb-3"
          style={{ backgroundColor: 'rgba(239,68,68,0.08)', color: 'var(--destructive)' }}
        >
          {error}
        </div>
      )}

      {/* Counterarguments list */}
      {generated && expanded && counterarguments.length > 0 && (
        <div className="space-y-3">
          {counterarguments.map((ca, i) => (
            <div
              key={i}
              className="rounded-lg p-3 sm:p-4"
              style={{ backgroundColor: 'var(--muted)', border: '1px solid var(--border)' }}
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <p className="text-sm font-medium text-foreground">{ca.argument}</p>
                <StrengthBadge strength={ca.strength} />
              </div>
              <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
                {ca.rationale}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!generated && !loading && (
        <p className="text-sm text-center py-4" style={{ color: 'var(--muted-foreground)' }}>
          Click <strong>Generate</strong> to have AI identify counterarguments and blind spots in the current synthesis.
        </p>
      )}
    </div>
  );
}
