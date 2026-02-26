import { Fragment, useState, useMemo, useEffect, useRef } from 'react';
import { GitCompareArrows, X, ChevronDown } from 'lucide-react';
import { MarkdownRenderer } from '../index';
import type { SynthesisVersion } from '../../types/summary';
import type { SynthesisData, Agreement, Disagreement } from '../../types/synthesis';

type Props = {
  versions: SynthesisVersion[];
  currentVersionId: number | null;
  onClose: () => void;
};

function formatTs(iso: string | null): string {
  if (!iso) return '';
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Side-by-side (desktop) / stacked (mobile) comparison of two synthesis versions.
 * Shows narrative text and key structured data differences.
 */
export default function VersionCompare({ versions, currentVersionId, onClose }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  const sorted = useMemo(
    () => [...versions].sort((a, b) => a.version - b.version),
    [versions],
  );

  // Default: right = currently selected version (or latest); left = latest version that isn't right
  // Ensures A !== B even when currentVersionId is the second-to-last version
  const defaultB = currentVersionId ?? sorted.at(-1)?.id ?? null;
  const defaultA = sorted.filter(v => v.id !== defaultB).at(-1)?.id ?? sorted.at(0)?.id ?? null;

  const [leftId, setLeftId] = useState<number | null>(defaultA);
  const [rightId, setRightId] = useState<number | null>(defaultB);

  // Scroll into view on mount so user immediately sees the comparison panel
  useEffect(() => {
    containerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  const left = versions.find(v => v.id === leftId) ?? null;
  const right = versions.find(v => v.id === rightId) ?? null;

  if (versions.length < 2) return null;

  return (
    <div ref={containerRef} className="card p-4 sm:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <GitCompareArrows size={20} style={{ color: 'var(--accent)' }} />
          Compare Versions
        </h2>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg transition-colors"
          style={{ background: 'none', border: 'none', color: 'var(--muted-foreground)', cursor: 'pointer' }}
          title="Close comparison"
        >
          <X size={18} />
        </button>
      </div>

      {/* Version selectors */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mb-4">
        <VersionSelect
          label="Left"
          versions={sorted}
          value={leftId}
          onChange={setLeftId}
          excludeId={rightId}
        />
        <span
          className="hidden sm:flex items-center justify-center text-xs font-bold px-2"
          style={{ color: 'var(--muted-foreground)' }}
        >
          vs
        </span>
        <VersionSelect
          label="Right"
          versions={sorted}
          value={rightId}
          onChange={setRightId}
          excludeId={leftId}
        />
      </div>

      {/* Comparison grid */}
      {left && right && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <VersionPane version={left} />
          <VersionPane version={right} />
        </div>
      )}

      {/* Stats diff */}
      {left?.synthesis_json && right?.synthesis_json && (
        <div className="mt-4">
          <StatsDiff left={left.synthesis_json} right={right.synthesis_json} leftVersion={left.version} rightVersion={right.version} />
        </div>
      )}
    </div>
  );
}

/* ── Sub-components ─────────────────────────────────────────────────── */

function VersionSelect({
  label,
  versions,
  value,
  onChange,
  excludeId,
}: {
  label: string;
  versions: SynthesisVersion[];
  value: number | null;
  onChange: (id: number) => void;
  excludeId: number | null;
}) {
  return (
    <div className="flex-1">
      <label
        className="text-xs font-medium mb-1 block"
        style={{ color: 'var(--muted-foreground)' }}
      >
        {label}
      </label>
      <div className="relative">
        <select
          value={value ?? ''}
          onChange={e => onChange(Number(e.target.value))}
          className="w-full text-sm rounded-lg px-3 py-2 appearance-none pr-8"
          style={{
            backgroundColor: 'var(--muted)',
            color: 'var(--foreground)',
            border: '1px solid var(--border)',
            cursor: 'pointer',
          }}
        >
          {versions.map(v => (
            <option key={v.id} value={v.id} disabled={v.id === excludeId}>
              v{v.version}
              {v.is_active ? ' (published)' : ''}
              {v.model_used ? ` — ${v.model_used.split('/').pop()}` : ''}
              {v.created_at ? ` · ${formatTs(v.created_at)}` : ''}
            </option>
          ))}
        </select>
        <ChevronDown
          size={14}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
          style={{ color: 'var(--muted-foreground)' }}
        />
      </div>
    </div>
  );
}

function VersionPane({ version }: { version: SynthesisVersion }) {
  const json = version.synthesis_json;

  return (
    <div
      className="rounded-lg p-4 overflow-auto max-h-[60vh]"
      style={{
        backgroundColor: 'var(--muted)',
        border: '1px solid var(--border)',
      }}
    >
      {/* Version badge */}
      <div className="flex items-center gap-2 mb-3">
        <span
          className="text-xs font-semibold px-2 py-0.5 rounded-full"
          style={{
            backgroundColor: version.is_active
              ? 'color-mix(in srgb, var(--success) 12%, transparent)'
              : 'var(--card)',
            color: version.is_active ? 'var(--success)' : 'var(--muted-foreground)',
          }}
        >
          v{version.version}{version.is_active ? ' · Published' : ' · Draft'}
        </span>
        <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
          {version.model_used?.split('/').pop()} · {version.strategy}
        </span>
      </div>

      {/* Narrative */}
      {json?.narrative && (
        <div className="mb-3">
          <h4 className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--muted-foreground)' }}>
            Narrative
          </h4>
          <div className="text-sm prose prose-sm max-w-none" style={{ color: 'var(--foreground)' }}>
            <MarkdownRenderer content={json.narrative} />
          </div>
        </div>
      )}

      {/* Agreements count */}
      {json?.agreements && (
        <div className="mb-2">
          <h4 className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--muted-foreground)' }}>
            Agreements ({json.agreements.length})
          </h4>
          <ul className="space-y-1">
            {json.agreements.map((a: Agreement, i: number) => (
              <li key={i} className="text-xs" style={{ color: 'var(--foreground)' }}>
                • {a.claim || ''}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Disagreements count */}
      {json?.disagreements && json.disagreements.length > 0 && (
        <div className="mb-2">
          <h4 className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--muted-foreground)' }}>
            Disagreements ({json.disagreements.length})
          </h4>
          <ul className="space-y-1">
            {json.disagreements.map((d: Disagreement, i: number) => (
              <li key={i} className="text-xs" style={{ color: 'var(--foreground)' }}>
                • {d.topic || ''}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Fallback: plain synthesis */}
      {!json && version.synthesis && (
        <div className="text-sm prose prose-sm max-w-none" style={{ color: 'var(--foreground)' }}>
          <MarkdownRenderer content={version.synthesis} />
        </div>
      )}

      {!json && !version.synthesis && (
        <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>No synthesis content</p>
      )}
    </div>
  );
}

function StatsDiff({
  left,
  right,
  leftVersion,
  rightVersion,
}: {
  left: SynthesisData;
  right: SynthesisData;
  leftVersion: number;
  rightVersion: number;
}) {
  const lAgree = left.agreements?.length ?? 0;
  const rAgree = right.agreements?.length ?? 0;
  const lDisagree = left.disagreements?.length ?? 0;
  const rDisagree = right.disagreements?.length ?? 0;
  const lNuance = left.nuances?.length ?? 0;
  const rNuance = right.nuances?.length ?? 0;
  const lEmergent = left.emergent_insights?.length ?? 0;
  const rEmergent = right.emergent_insights?.length ?? 0;

  const rows = [
    { label: 'Agreements', l: lAgree, r: rAgree },
    { label: 'Disagreements', l: lDisagree, r: rDisagree },
    { label: 'Nuances', l: lNuance, r: rNuance },
    { label: 'Emergent Insights', l: lEmergent, r: rEmergent },
  ];

  return (
    <div
      className="rounded-lg p-3 text-xs"
      style={{ backgroundColor: 'var(--muted)', border: '1px solid var(--border)' }}
    >
      <h4
        className="font-semibold uppercase tracking-wider mb-2"
        style={{ color: 'var(--muted-foreground)' }}
      >
        Stats Comparison
      </h4>
      <div className="grid grid-cols-3 gap-x-4 gap-y-1">
        <div className="font-medium" style={{ color: 'var(--muted-foreground)' }}></div>
        <div className="text-center font-medium" style={{ color: 'var(--accent)' }}>v{leftVersion}</div>
        <div className="text-center font-medium" style={{ color: 'var(--accent)' }}>v{rightVersion}</div>
        {rows.map(r => (
          <Fragment key={r.label}>
            <div style={{ color: 'var(--foreground)' }}>{r.label}</div>
            <div className="text-center" style={{ color: 'var(--foreground)' }}>{r.l}</div>
            <div className="text-center" style={{ color: r.r !== r.l ? 'var(--warning, #f59e0b)' : 'var(--foreground)' }}>
              {r.r}
              {r.r !== r.l && (
                <span className="ml-1 text-[10px]">
                  ({r.r > r.l ? '+' : ''}{r.r - r.l})
                </span>
              )}
            </div>
          </Fragment>
        ))}
      </div>
    </div>
  );
}

/* end of VersionCompare */
