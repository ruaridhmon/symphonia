import type { Round } from '../../types/summary';

type Props = {
  rounds: Round[];
  selectedRoundId: number | null;
  onSelectRound: (round: Round) => void;
};

export default function RoundHistoryCard({ rounds, selectedRoundId, onSelectRound }: Props) {
  if (rounds.length === 0) return null;

  return (
    <div className="card p-4">
      <h3
        className="text-xs font-semibold uppercase tracking-wider mb-3"
        style={{ color: 'var(--muted-foreground)' }}
      >
        Round History
      </h3>
      <ul className="text-sm space-y-1">
        {rounds.map(r => (
          <li
            key={r.id}
            className={`flex justify-between items-center border-b border-border last:border-b-0 py-1.5 cursor-pointer hover:bg-muted/50 rounded px-1 ${
              selectedRoundId === r.id ? 'bg-accent/10' : ''
            }`}
            onClick={() => onSelectRound(r)}
          >
            <span className="text-foreground">
              Round {r.round_number}{' '}
              {r.is_active && (
                <span className="text-success font-semibold">(active)</span>
              )}
            </span>
            <span
              className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${
                r.synthesis
                  ? 'bg-success/10 text-success'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              {r.synthesis ? 'Synthesis' : 'No Synthesis'}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
