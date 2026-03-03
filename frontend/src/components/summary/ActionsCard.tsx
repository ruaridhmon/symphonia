import { useState, useCallback } from 'react';
import { Eye, EyeOff, FileDown, ArrowRight } from 'lucide-react';
import { LoadingButton, ExportPanel } from '../index';

type Props = {
  responsesOpen: boolean;
  onToggleResponses: () => void;
  onDownloadResponses: () => void;
  onStartNextRound: () => void;
  loading: boolean;
  formId: number;
};

export default function ActionsCard({
  responsesOpen,
  onToggleResponses,
  onDownloadResponses,
  onStartNextRound,
  loading,
  formId,
}: Props) {
  const [downloading, setDownloading] = useState(false);

  const handleDownload = useCallback(async () => {
    setDownloading(true);
    try { await onDownloadResponses(); } finally { setDownloading(false); }
  }, [onDownloadResponses]);

  return (
    <div className="card p-3">
      <div className="mb-2">
        <h3
          className="text-[10px] font-semibold uppercase tracking-wider"
          style={{ color: 'var(--muted-foreground)' }}
        >
          Workflow Actions
        </h3>
      </div>

      <div className="space-y-2">
        <LoadingButton
          variant="ghost"
          size="sm"
          onClick={onToggleResponses}
          className="w-full justify-start gap-2"
          icon={responsesOpen ? <EyeOff size={14} aria-hidden="true" /> : <Eye size={14} aria-hidden="true" />}
          aria-pressed={responsesOpen}
        >
          {responsesOpen ? 'Hide Responses Panel' : 'View Responses Panel'}
        </LoadingButton>

        <LoadingButton
          variant="ghost"
          size="sm"
          loading={downloading}
          loadingText="Exporting responses…"
          onClick={handleDownload}
          className="w-full justify-start gap-2"
          icon={<FileDown size={14} aria-hidden="true" />}
        >
          Open Responses (.docx)
        </LoadingButton>

        <ExportPanel formId={formId} />

        <LoadingButton
          variant="accent"
          size="sm"
          onClick={onStartNextRound}
          loading={loading}
          loadingText="Starting next round…"
          className="w-full justify-center gap-2 font-semibold"
          icon={<ArrowRight size={15} aria-hidden="true" />}
        >
          Start Next Round
        </LoadingButton>
      </div>
    </div>
  );
}
