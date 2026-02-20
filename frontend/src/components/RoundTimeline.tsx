type Round = {
  id: number;
  round_number: number;
  synthesis: string;
  is_active: boolean;
  questions: string[];
};

interface RoundTimelineProps {
  rounds: Round[];
  activeRoundId: number | null;
  onSelectRound: (round: Round) => void;
}

export default function RoundTimeline({ rounds, activeRoundId, onSelectRound }: RoundTimelineProps) {
  if (rounds.length === 0) return null;

  return (
    <div className="round-timeline">
      <h3 className="round-timeline-title">Round History</h3>
      <div className="round-timeline-track">
        {rounds.map((round, index) => {
          const isActive = round.id === activeRoundId;
          const hasSynthesis = !!(round.synthesis && round.synthesis.trim());
          const isLast = index === rounds.length - 1;

          return (
            <div key={round.id} className="round-timeline-item">
              {/* Connector line */}
              {!isLast && <div className="round-timeline-connector" />}

              {/* Node */}
              <button
                className={`round-timeline-node ${isActive ? 'active' : ''} ${hasSynthesis ? 'has-synthesis' : ''}`}
                onClick={() => onSelectRound(round)}
                title={`Round ${round.round_number}${isActive ? ' (active)' : ''}${hasSynthesis ? ' — has synthesis' : ''}`}
              >
                <span className="round-timeline-number">{round.round_number}</span>
              </button>

              {/* Label */}
              <div className="round-timeline-label">
                <span className="round-timeline-round-name">
                  Round {round.round_number}
                </span>
                <div className="round-timeline-badges">
                  {isActive && (
                    <span className="badge badge-active">Active</span>
                  )}
                  {hasSynthesis && (
                    <span className="badge badge-synthesis">Synthesised</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
