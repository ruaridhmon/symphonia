import { LoadingButton, MarkdownRenderer, StructuredSynthesis } from '../index';
import type { Round, SynthesisVersion } from '../../types/summary';

type Props = {
  displayRound: Round | null;
  synthesisVersions: SynthesisVersion[];
  selectedVersionId: number | null;
  onSelectVersion: (id: number) => void;
  selectedVersion: SynthesisVersion | null;
  onActivateVersion: (id: number) => void;
  isGeneratingVersion: boolean;
  onGenerateNewVersion: () => void;
  resolvedExpertLabels: Record<number, string>;
  formId: number;
  token: string;
  currentUserEmail: string;
};

export default function SynthesisVersionPanel({
  displayRound,
  synthesisVersions,
  selectedVersionId,
  onSelectVersion,
  selectedVersion,
  onActivateVersion,
  isGeneratingVersion,
  onGenerateNewVersion,
}: Props) {
  if (!displayRound) return null;

  return (
    <div className="card p-4">
      <h3
        className="text-xs font-semibold uppercase tracking-wider mb-3"
        style={{ color: 'var(--muted-foreground)' }}
      >
        Synthesis Versions
        <span className="ml-2 font-normal normal-case tracking-normal">
          · Round {displayRound.round_number}
        </span>
      </h3>

      {synthesisVersions.length === 0 ? (
        <p className="text-sm text-muted-foreground mb-3">
          No versions yet. Generate one below.
        </p>
      ) : (
        <div className="space-y-2 mb-3">
          <label
            htmlFor="version-select"
            className="block text-sm font-medium text-muted-foreground mb-1"
          >
            Select version
          </label>
          <select
            id="version-select"
            className="w-full rounded-lg px-3 py-2 text-sm"
            value={selectedVersionId ?? ''}
            onChange={e => onSelectVersion(Number(e.target.value))}
          >
            {synthesisVersions.map(v => (
              <option key={v.id} value={v.id}>
                v{v.version}
                {v.is_active ? ' ★ active' : ''}
                {v.strategy ? ` (${v.strategy})` : ''}
                {v.created_at
                  ? ` — ${new Date(v.created_at).toLocaleString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}`
                  : ''}
              </option>
            ))}
          </select>

          {selectedVersion && (
            <div
              className="text-xs text-muted-foreground space-y-1 mt-2 p-2 rounded-lg"
              style={{ background: 'var(--muted)' }}
            >
              <div>
                <strong>Model:</strong> {selectedVersion.model_used || 'N/A'}
              </div>
              <div>
                <strong>Strategy:</strong> {selectedVersion.strategy || 'N/A'}
              </div>
              <div>
                <strong>Status:</strong>{' '}
                {selectedVersion.is_active ? (
                  <span className="text-success font-semibold">Active (published)</span>
                ) : (
                  <span>Draft</span>
                )}
              </div>
            </div>
          )}

          {selectedVersion && !selectedVersion.is_active && (
            <LoadingButton
              variant="success"
              size="sm"
              onClick={() => onActivateVersion(selectedVersion.id)}
              className="w-full mt-1"
            >
              Publish v{selectedVersion.version}
            </LoadingButton>
          )}
        </div>
      )}

      <LoadingButton
        variant="accent"
        size="sm"
        loading={isGeneratingVersion}
        loadingText="Generating…"
        onClick={onGenerateNewVersion}
        className="w-full"
      >
        Generate New Version
      </LoadingButton>
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
        <div className="card p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 mb-3">
            <h2 className="text-lg font-semibold text-foreground">
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
        <div className="card p-4 sm:p-6">
          <h2 className="text-lg font-semibold mb-3 text-foreground">
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
