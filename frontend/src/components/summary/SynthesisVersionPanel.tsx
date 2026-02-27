import { LoadingButton, MarkdownRenderer, StructuredSynthesis } from '../index';
import { CheckCircle, GitCompareArrows } from 'lucide-react';
import type { Round, SynthesisVersion } from '../../types/summary';

type Props = {
  displayRound: Round | null;
  synthesisVersions: SynthesisVersion[];
  selectedVersionId: number | null;
  onSelectVersion: (id: number) => void;
  selectedVersion: SynthesisVersion | null;
  onActivateVersion: (id: number) => void;
  resolvedExpertLabels: Record<number, string>;
  formId: number;
  token: string;
  currentUserEmail: string;
  showCompare?: boolean;
  onToggleCompare?: () => void;
};

function formatTimestamp(iso: string | null): string {
  if (!iso) return '';
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function SynthesisVersionPanel({
  displayRound,
  synthesisVersions,
  selectedVersionId,
  onSelectVersion,
  selectedVersion,
  onActivateVersion,
  showCompare,
  onToggleCompare,
}: Props) {
  if (!displayRound) return null;

  return (
    <div className="card p-3">
      <h3
        className="text-[10px] font-semibold uppercase tracking-wider mb-2"
        style={{ color: 'var(--muted-foreground)' }}
      >
        Versions
        <span className="ml-1.5 font-normal normal-case tracking-normal">
          · R{displayRound.round_number}
        </span>
      </h3>

      {synthesisVersions.length === 0 ? (
        <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
          No versions yet. Use <strong>Generate Summary</strong> above to create one.
        </p>
      ) : (
        <div className="space-y-3">
          {/* Version pills */}
          <div className="flex flex-wrap gap-2">
            {synthesisVersions.map(v => {
              const isSelected = v.id === selectedVersionId;
              return (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => onSelectVersion(v.id)}
                  className="relative inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all"
                  style={{
                    backgroundColor: isSelected
                      ? 'color-mix(in srgb, var(--accent) 15%, var(--card))'
                      : 'var(--muted)',
                    color: isSelected ? 'var(--accent)' : 'var(--muted-foreground)',
                    border: isSelected
                      ? '1.5px solid var(--accent)'
                      : '1.5px solid transparent',
                    cursor: 'pointer',
                  }}
                  title={`v${v.version}${v.is_active ? ' (published)' : ''} — ${formatTimestamp(v.created_at)}`}
                  aria-pressed={isSelected}
                  aria-label={`Version ${v.version}${v.is_active ? ' (published)' : ''}`}
                >
                  v{v.version}
                  {v.is_active && (
                    <CheckCircle size={12} style={{ color: 'var(--success)' }} aria-hidden="true" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Selected version details */}
          {selectedVersion && (
            <div
              className="text-xs space-y-1.5 p-3 rounded-lg"
              style={{ background: 'var(--muted)', color: 'var(--muted-foreground)' }}
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold" style={{ color: 'var(--foreground)' }}>
                  v{selectedVersion.version}
                </span>
                {selectedVersion.is_active ? (
                  <span
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold"
                    style={{
                      backgroundColor: 'color-mix(in srgb, var(--success) 12%, transparent)',
                      color: 'var(--success)',
                    }}
                  >
                    <CheckCircle size={10} /> Published
                  </span>
                ) : (
                  <span
                    className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium"
                    style={{
                      backgroundColor: 'var(--card)',
                      color: 'var(--muted-foreground)',
                    }}
                  >
                    Draft
                  </span>
                )}
              </div>
              {selectedVersion.created_at && (
                <div>{formatTimestamp(selectedVersion.created_at)}</div>
              )}
              <div>
                <strong>Model:</strong> {selectedVersion.model_used || 'N/A'}
              </div>
              <div>
                <strong>Strategy:</strong> {selectedVersion.strategy || 'N/A'}
              </div>
            </div>
          )}

          {/* Publish button for non-active versions */}
          {selectedVersion && !selectedVersion.is_active && (
            <LoadingButton
              variant="success"
              size="sm"
              onClick={() => onActivateVersion(selectedVersion.id)}
              className="w-full"
            >
              Publish v{selectedVersion.version}
            </LoadingButton>
          )}

          {/* Compare button — only when 2+ versions exist */}
          {synthesisVersions.length >= 2 && onToggleCompare && (
            <button
              onClick={onToggleCompare}
              className="w-full flex items-center justify-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg transition-colors"
              style={{
                backgroundColor: showCompare
                  ? 'color-mix(in srgb, var(--accent) 15%, var(--card))'
                  : 'var(--card)',
                color: showCompare ? 'var(--accent)' : 'var(--muted-foreground)',
                border: showCompare
                  ? '1.5px solid var(--accent)'
                  : '1.5px solid var(--border)',
                cursor: 'pointer',
              }}
            >
              <GitCompareArrows size={14} />
              {showCompare ? 'Hide Comparison' : 'Compare Versions'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/** Renders the expanded synthesis content for a selected version (main area cards) */
export function SelectedVersionContent({
  selectedVersion,
  displayRound,
  resolvedExpertLabels,
  formId,
  token,
  currentUserEmail,
}: {
  selectedVersion: SynthesisVersion | null;
  displayRound: Round | null;
  resolvedExpertLabels: Record<number, string>;
  formId: number;
  token: string;
  currentUserEmail: string;
}) {
  if (!selectedVersion) return null;

  return (
    <>
      {selectedVersion.synthesis && (
        <div className="card p-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 mb-3">
            <h2 className="text-base font-semibold text-foreground">
              Synthesis v{selectedVersion.version}
              {selectedVersion.is_active && (
                <span className="ml-2 text-xs font-normal px-2 py-0.5 rounded-full bg-success/10 text-success">
                  active
                </span>
              )}
            </h2>
            <span className="text-xs text-muted-foreground">
              {selectedVersion.model_used || ''} · {selectedVersion.strategy || ''}
              {selectedVersion.created_at &&
                ` · ${new Date(selectedVersion.created_at).toLocaleString()}`}
            </span>
          </div>
          <MarkdownRenderer content={selectedVersion.synthesis} />
        </div>
      )}

      {selectedVersion.synthesis_json && (
        <div className="card p-4">
          <h2 className="text-base font-semibold mb-2 text-foreground">
            Structured Analysis (v{selectedVersion.version})
          </h2>
          <StructuredSynthesis
            data={selectedVersion.synthesis_json}
            convergenceScore={displayRound?.convergence_score ?? undefined}
            expertLabels={resolvedExpertLabels}
            formId={formId}
            roundId={displayRound?.id}
            token={token}
            currentUserEmail={currentUserEmail}
          />
        </div>
      )}
    </>
  );
}
