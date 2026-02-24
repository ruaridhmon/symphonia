import { useState, useCallback } from 'react';
import { Eye, EyeOff, FileDown, Save, ArrowRight } from 'lucide-react';
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
    <div className="card p-2">
      {/* Icon row: responses · download · save · next */}
      <div className="flex items-center gap-1 flex-wrap">
        <button
          type="button"
          title={responsesOpen ? 'Hide Responses' : 'View Responses'}
          onClick={onToggleResponses}
          className="inline-flex items-center justify-center rounded-md p-1.5 transition-colors hover:bg-accent/10"
          style={{ color: responsesOpen ? 'var(--accent)' : 'var(--muted-foreground)' }}
        >
          {responsesOpen ? <EyeOff size={15} /> : <Eye size={15} />}
        </button>

        <button
          type="button"
          title={downloading ? 'Downloading…' : 'Download Responses'}
          onClick={handleDownload}
          disabled={downloading}
          className="inline-flex items-center justify-center rounded-md p-1.5 transition-colors hover:bg-accent/10 disabled:opacity-50"
          style={{ color: 'var(--muted-foreground)' }}
        >
          <FileDown size={15} />
        </button>

        <button
          type="button"
          title={saving ? 'Saving…' : 'Save Synthesis'}
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center justify-center rounded-md p-1.5 transition-colors hover:bg-accent/10 disabled:opacity-50"
          style={{ color: 'var(--muted-foreground)' }}
        >
          <Save size={15} />
        </button>

        <LoadingButton
          variant="accent"
          size="sm"
          onClick={onStartNextRound}
          loading={loading}
          loadingText=""
          title="Start Next Round"
          className="inline-flex items-center justify-center rounded-md p-1.5 font-semibold"
          style={{ minWidth: 0, padding: '0.375rem' }}
        >
          <ArrowRight size={15} />
        </LoadingButton>
      </div>

      {/* Export panel — full width below icons */}
      <div className="mt-1.5">
        <ExportPanel
          formTitle={formTitle}
          formId={formId}
          rounds={rounds}
          structuredSynthesisData={structuredSynthesisData}
          expertLabels={expertLabels}
        />
      </div>
    </div>
  );
}
