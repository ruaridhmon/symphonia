import type { Round } from '../../types/summary';

type Props = {
  rounds: Round[];
  selectedRoundId: number | null;
  onSelectRound: (round: Round) => void;
};

export default function RoundHistoryCard({ rounds, selectedRoundId, onSelectRound }: Props) {
  if (rounds.length === 0) return null;

  return (
    <div className="card p-3">
      <h3
        className="text-[10px] font-semibold uppercase tracking-wider mb-2"
        style={{ color: 'var(--muted-foreground)' }}
      >
        Rounds
      </h3>
      <ul className="text-xs space-y-0.5">
        {rounds.map(r => (
          <li
            key={r.id}
            className={`flex justify-between items-center border-b border-border last:border-b-0 py-1 cursor-pointer hover:bg-muted/50 rounded px-1 ${
              selectedRoundId === r.id ? 'bg-accent/10' : ''
            }`}
            onClick={() => onSelectRound(r)}
          >
            <span className="text-foreground text-xs">
              R{r.round_number}{' '}
              {r.is_active && (
                <span className="text-success font-semibold text-[10px]">(live)</span>
              )}
            </span>
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded-full flex-shrink-0 ${
                r.synthesis
                  ? 'bg-success/10 text-success'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              {r.synthesis ? '✓' : '—'}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
