import { useState, useCallback } from 'react';
import { Eye, EyeOff, FileDown, Save, ArrowRight } from 'lucide-react';
import { LoadingButton, ExportPanel } from '../index';

type Props = {
  responsesOpen: boolean;
  onToggleResponses: () => void;
  onDownloadResponses: () => void;
  onSaveSynthesis: () => void;
  onStartNextRound: () => void;
  loading: boolean;
  formId: number;
};

export default function ActionsCard({
  responsesOpen,
  onToggleResponses,
  onDownloadResponses,
  onSaveSynthesis,
  onStartNextRound,
  loading,
  formId,
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
          aria-label={responsesOpen ? 'Hide Responses' : 'View Responses'}
          aria-pressed={responsesOpen}
          onClick={onToggleResponses}
          className="inline-flex items-center justify-center rounded-md p-1.5 transition-colors hover:bg-accent/10"
          style={{ color: responsesOpen ? 'var(--accent)' : 'var(--muted-foreground)' }}
        >
          {responsesOpen ? <EyeOff size={15} aria-hidden="true" /> : <Eye size={15} aria-hidden="true" />}
        </button>

        <button
          type="button"
          title={downloading ? 'Downloading…' : 'Download Responses'}
          aria-label={downloading ? 'Downloading responses' : 'Download Responses'}
          onClick={handleDownload}
          disabled={downloading}
          className="inline-flex items-center justify-center rounded-md p-1.5 transition-colors hover:bg-accent/10 disabled:opacity-50"
          style={{ color: 'var(--muted-foreground)' }}
        >
          <FileDown size={15} aria-hidden="true" />
        </button>

        <button
          type="button"
          title={saving ? 'Saving…' : 'Save Synthesis'}
          aria-label={saving ? 'Saving synthesis' : 'Save Synthesis'}
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center justify-center rounded-md p-1.5 transition-colors hover:bg-accent/10 disabled:opacity-50"
          style={{ color: 'var(--muted-foreground)' }}
        >
          <Save size={15} aria-hidden="true" />
        </button>

        <LoadingButton
          variant="accent"
          size="sm"
          onClick={onStartNextRound}
          loading={loading}
          loadingText=""
          title="Start Next Round"
          aria-label="Start Next Round"
          className="inline-flex items-center justify-center rounded-md p-1.5 font-semibold"
          style={{ minWidth: 0, padding: '0.375rem' }}
        >
          <ArrowRight size={15} aria-hidden="true" />
        </LoadingButton>
      </div>

      {/* Export panel — full width below icons */}
      <div className="mt-1.5">
        <ExportPanel formId={formId} />
      </div>
    </div>
  );
}
