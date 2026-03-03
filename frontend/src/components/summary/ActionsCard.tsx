import { Eye, EyeOff, ArrowRight } from 'lucide-react';
import { LoadingButton } from '../index';

type Props = {
  responsesOpen: boolean;
  aiToolsOpen: boolean;
  onToggleResponses: () => void;
  onToggleAiTools: () => void;
  onStartNextRound: () => void;
  loading: boolean;
};

export default function ActionsCard({
  responsesOpen,
  aiToolsOpen,
  onToggleResponses,
  onToggleAiTools,
  onStartNextRound,
  loading,
}: Props) {
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
          onClick={onToggleAiTools}
          className="w-full justify-start gap-2"
          icon={aiToolsOpen ? <EyeOff size={14} aria-hidden="true" /> : <Eye size={14} aria-hidden="true" />}
          aria-pressed={aiToolsOpen}
        >
          {aiToolsOpen ? 'Hide AI Deliberation Tools' : 'View AI Deliberation Tools'}
        </LoadingButton>

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
