import { useState } from 'react';
import { Clock, CheckCircle, FileText, ChevronDown, ChevronUp, Cpu, Zap } from 'lucide-react';
import type { SynthesisVersion } from '../../types/summary';

type Props = {
  versions: SynthesisVersion[];
  selectedVersionId: number | null;
  onSelectVersion: (id: number) => void;
};

function formatTimestamp(iso: string | null): string {
  if (!iso) return 'Unknown';
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function relativeTime(iso: string | null): string {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function modelShortName(model: string | null): string {
  if (!model) return 'Unknown';
  const parts = model.split('/');
  return parts[parts.length - 1] || model;
}

function strategyLabel(strategy: string | null): string {
  if (!strategy) return '';
  const labels: Record<string, string> = {
    single: 'Single Analyst',
    ensemble: 'Ensemble',
    structured: 'Structured',
  };
  return labels[strategy] || strategy;
}

/**
 * Visual timeline of synthesis versions.
 * Shows a vertical timeline with dots, connecting lines, and metadata.
 * Click a version to select it in the main panel.
 */
export default function VersionTimeline({
  versions,
  selectedVersionId,
  onSelectVersion,
}: Props) {
  const [expanded, setExpanded] = useState(false);

  if (versions.length === 0) return null;

  // Sort newest first
  const sorted = [...versions].sort((a, b) => b.version - a.version);

  // Show max 3 collapsed, all when expanded
  const displayCount = expanded ? sorted.length : Math.min(3, sorted.length);
  const displayed = sorted.slice(0, displayCount);
  const hasMore = sorted.length > 3;

  return (
    <div className="card p-4 sm:p-5">
      <div className="flex items-center justify-between mb-4">
        <h3
          className="text-sm font-semibold flex items-center gap-2"
          style={{ color: 'var(--foreground)' }}
        >
          <Clock size={15} style={{ color: 'var(--accent)' }} />
          Version History
        </h3>
        <span
          className="text-xs px-2 py-0.5 rounded-full"
          style={{
            backgroundColor: 'var(--muted)',
            color: 'var(--muted-foreground)',
          }}
        >
          {versions.length} version{versions.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Timeline */}
      <div className="relative pl-6">
        {/* Vertical line */}
        <div
          className="absolute left-[9px] top-2 bottom-2 w-[2px]"
          style={{ backgroundColor: 'var(--border)' }}
        />

        <div className="space-y-0">
          {displayed.map((v, idx) => {
            const isSelected = v.id === selectedVersionId;
            const isFirst = idx === 0;

            return (
              <button
                key={v.id}
                type="button"
                onClick={() => onSelectVersion(v.id)}
                className="relative w-full text-left group transition-all"
                aria-pressed={isSelected}
                aria-label={`Version ${v.version}${v.is_active ? ' (published)' : ''} — ${formatTimestamp(v.created_at)}`}
                style={{
                  padding: '0.625rem 0.75rem 0.625rem 1.25rem',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  borderRadius: 'var(--radius)',
                  fontFamily: 'var(--font-family)',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.backgroundColor =
                    'color-mix(in srgb, var(--accent) 5%, transparent)';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.backgroundColor = isSelected
                    ? 'color-mix(in srgb, var(--accent) 8%, transparent)'
                    : 'transparent';
                }}
              >
                {/* Timeline dot */}
                <div
                  className="absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center"
                  style={{ left: '-14.5px' }}
                >
                  <div
                    className="rounded-full transition-all"
                    style={{
                      width: isSelected || v.is_active ? '14px' : '10px',
                      height: isSelected || v.is_active ? '14px' : '10px',
                      backgroundColor: v.is_active
                        ? 'var(--success)'
                        : isSelected
                          ? 'var(--accent)'
                          : 'var(--muted-foreground)',
                      border: `2px solid ${v.is_active ? 'color-mix(in srgb, var(--success) 30%, transparent)' : isSelected ? 'color-mix(in srgb, var(--accent) 30%, transparent)' : 'var(--card)'}`,
                      boxShadow: v.is_active || isSelected
                        ? `0 0 0 3px ${v.is_active ? 'color-mix(in srgb, var(--success) 15%, transparent)' : 'color-mix(in srgb, var(--accent) 15%, transparent)'}`
                        : 'none',
                    }}
                  />
                </div>

                {/* Content */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span
                        className="text-sm font-semibold"
                        style={{
                          color: isSelected
                            ? 'var(--accent)'
                            : 'var(--foreground)',
                        }}
                      >
                        v{v.version}
                      </span>
                      {v.is_active && (
                        <span
                          className="inline-flex items-center gap-0.5 px-1.5 py-0 rounded-full text-[10px] font-semibold"
                          style={{
                            backgroundColor: 'color-mix(in srgb, var(--success) 12%, transparent)',
                            color: 'var(--success)',
                          }}
                        >
                          <CheckCircle size={9} /> Published
                        </span>
                      )}
                      {isFirst && !v.is_active && (
                        <span
                          className="inline-flex items-center gap-0.5 px-1.5 py-0 rounded-full text-[10px] font-medium"
                          style={{
                            backgroundColor: 'color-mix(in srgb, var(--accent) 10%, transparent)',
                            color: 'var(--accent)',
                          }}
                        >
                          Latest
                        </span>
                      )}
                    </div>

                    {/* Metadata row */}
                    <div
                      className="flex items-center gap-3 text-[11px]"
                      style={{ color: 'var(--muted-foreground)' }}
                    >
                      {v.model_used && (
                        <span className="inline-flex items-center gap-1">
                          <Cpu size={10} />
                          {modelShortName(v.model_used)}
                        </span>
                      )}
                      {v.strategy && (
                        <span className="inline-flex items-center gap-1">
                          <Zap size={10} />
                          {strategyLabel(v.strategy)}
                        </span>
                      )}
                      {v.synthesis_json && (
                        <span className="inline-flex items-center gap-1">
                          <FileText size={10} />
                          Structured
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Timestamp */}
                  <div
                    className="flex-shrink-0 text-right"
                    style={{ minWidth: '5rem' }}
                  >
                    <div
                      className="text-[11px] font-medium"
                      style={{ color: 'var(--muted-foreground)' }}
                    >
                      {relativeTime(v.created_at)}
                    </div>
                    <div
                      className="text-[10px]"
                      style={{ color: 'var(--muted-foreground)', opacity: 0.7 }}
                    >
                      {formatTimestamp(v.created_at)}
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Show more / less */}
      {hasMore && (
        <button
          onClick={() => setExpanded(prev => !prev)}
          className="w-full flex items-center justify-center gap-1.5 text-xs font-medium mt-3 py-1.5 rounded-md transition-colors"
          style={{
            backgroundColor: 'var(--muted)',
            color: 'var(--muted-foreground)',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          {expanded ? (
            <>
              <ChevronUp size={12} />
              Show Less
            </>
          ) : (
            <>
              <ChevronDown size={12} />
              Show {sorted.length - 3} More
            </>
          )}
        </button>
      )}
    </div>
  );
}
