import { Eye, EyeOff, ArrowRight } from 'lucide-react';
import { LoadingButton } from '../index';

type Props = {
  responsesOpen: boolean;
  onToggleResponses: () => void;
  onStartNextRound: () => void;
  loading: boolean;
};

export default function ActionsCard({
  responsesOpen,
  onToggleResponses,
  onStartNextRound,
  loading,
}: Props) {
  return (
    <div className="card p-3" style={{ backgroundColor: 'color-mix(in srgb, var(--card) 96%, white)' }}>
      <div className="mb-3">
        <h3
          className="text-[10px] font-semibold uppercase tracking-wider"
          style={{ color: 'var(--muted-foreground)' }}
        >
          Actions
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
          {responsesOpen ? 'Hide responses' : 'Show responses'}
        </LoadingButton>

        <LoadingButton
          variant="accent"
          size="sm"
          onClick={onStartNextRound}
          loading={loading}
          loadingText="Starting next round…"
          className="w-full justify-center gap-2 font-semibold mt-3"
          icon={<ArrowRight size={15} aria-hidden="true" />}
        >
          Start Next Round
        </LoadingButton>
      </div>
    </div>
  );
}
