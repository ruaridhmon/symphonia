import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { Round } from '../../types/summary';

type Props = {
  rounds: Round[];
  selectedRoundId: number | null;
  onSelectRound: (round: Round) => void;
};

export default function RoundHistoryCard({ rounds, selectedRoundId, onSelectRound }: Props) {
  if (rounds.length === 0) return null;
  const ordered = [...rounds].sort((a, b) => a.round_number - b.round_number);
  const currentIndex = Math.max(0, ordered.findIndex(r => r.id === selectedRoundId));
  const current = ordered[currentIndex] || ordered[0];
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < ordered.length - 1;

  function goPrevious() {
    if (!hasPrev) return;
    onSelectRound(ordered[currentIndex - 1]);
  }

  function goNext() {
    if (!hasNext) return;
    onSelectRound(ordered[currentIndex + 1]);
  }

  return (
    <div className="card px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div
            className="text-[10px] font-semibold uppercase tracking-wider"
            style={{ color: 'var(--muted-foreground)' }}
          >
            Viewing
          </div>
          <div className="text-sm font-semibold text-foreground">
            Round {current.round_number} of {ordered.length}
          </div>
          <div className="text-[11px]" style={{ color: current.is_active ? 'var(--success)' : 'var(--muted-foreground)' }}>
            {current.is_active ? 'Live round' : 'Previous round'}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={goPrevious}
            disabled={!hasPrev}
            aria-label="Previous round"
            className="h-8 w-8 rounded-full border border-border flex items-center justify-center"
            style={{ opacity: hasPrev ? 1 : 0.4, cursor: hasPrev ? 'pointer' : 'not-allowed' }}
          >
            <ChevronLeft size={15} />
          </button>
          <button
            type="button"
            onClick={goNext}
            disabled={!hasNext}
            aria-label="Next round"
            className="h-8 w-8 rounded-full border border-border flex items-center justify-center"
            style={{ opacity: hasNext ? 1 : 0.4, cursor: hasNext ? 'pointer' : 'not-allowed' }}
          >
            <ChevronRight size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}
