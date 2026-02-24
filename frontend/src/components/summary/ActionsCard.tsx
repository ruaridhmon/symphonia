import { useState, useCallback } from 'react';
import { LoadingButton, ExportPanel } from '../index';
import type { Round } from '../../types/summary';
import type { SynthesisData } from '../../types/synthesis';

type Props = {
  responsesOpen: boolean;
  onToggleResponses: () => void;
  onDownloadResponses: () => void;
  onSaveSynthesis: () => void;
  onStartNextRound: () => void;
  loading: boolean;
  formTitle: string;
  formId: number;
  rounds: Round[];
  structuredSynthesisData: SynthesisData | null;
  expertLabels: Record<number, string>;
};

export default function ActionsCard({
  responsesOpen,
  onToggleResponses,
  onDownloadResponses,
  onSaveSynthesis,
  onStartNextRound,
  loading,
  formTitle,
  formId,
  rounds,
  structuredSynthesisData,
  expertLabels,
}: Props) {
  const [saving, setSaving] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try { await onSaveSynthesis(); } finally { setSaving(false); }
  }, [onSaveSynthesis]);

  const handleDownload = useCallback(async () => {
    setDownloading(true);
    try { await onDownloadResponses(); } finally { setDownloading(false); }
  }, [onDownloadResponses]);

  return (
    <div className="card p-3">
      <h3
        className="text-[10px] font-semibold uppercase tracking-wider mb-2"
        style={{ color: 'var(--muted-foreground)' }}
      >
        Actions
      </h3>
      <div className="flex flex-col space-y-1.5">
        <LoadingButton
          variant="accent"
          size="sm"
          onClick={onToggleResponses}
          className="w-full text-left justify-start"
        >
          {responsesOpen ? 'Hide Responses' : 'View Responses'}
        </LoadingButton>
        <LoadingButton
          variant="secondary"
          size="sm"
          onClick={handleDownload}
          loading={downloading}
          loadingText="Downloading…"
          className="w-full text-left justify-start"
        >
          Download
        </LoadingButton>
        <LoadingButton
          variant="success"
          size="sm"
          onClick={handleSave}
          loading={saving}
          loadingText="Saving…"
          className="w-full text-left justify-start"
        >
          Save Synthesis
        </LoadingButton>
        <ExportPanel
          formTitle={formTitle}
          formId={formId}
          rounds={rounds}
          structuredSynthesisData={structuredSynthesisData}
          expertLabels={expertLabels}
        />
        <div className="pt-1">
          <LoadingButton
            variant="accent"
            size="sm"
            onClick={onStartNextRound}
            loading={loading}
            loadingText="Starting…"
            className="w-full font-semibold"
            style={{ backgroundColor: 'var(--accent-hover)' }}
          >
            Next Round →
          </LoadingButton>
        </div>
      </div>
    </div>
  );
}
