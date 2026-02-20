export type Round = {
  id: number;
  round_number: number;
  synthesis: string;
  is_active: boolean;
  questions: string[];
  // Extended fields (populated when available)
  synthesis_json?: any;
  convergence_score?: number | null;
  response_count?: number;
};

interface RoundTimelineProps {
  rounds: Round[];
  /** The round that is active (Delphi-active, server-side) */
  activeRoundId: number | null;
  /** The round currently being viewed/selected in the UI */
  selectedRoundId?: number | null;
  onSelectRound: (round: Round) => void;
}

export default function RoundTimeline({
  rounds,
  activeRoundId,
  selectedRoundId,
  onSelectRound,
}: RoundTimelineProps) {
  if (rounds.length === 0) return null;

  // If selectedRoundId isn't provided, fall back to activeRoundId
  const viewingId = selectedRoundId ?? activeRoundId;

  return (
    <div className="round-timeline">
      <h3 className="round-timeline-title">Round History</h3>
      <div className="round-timeline-track">
        {rounds.map((round, index) => {
          const isActive = round.is_active;
          const isSelected = round.id === viewingId;
          const hasSynthesis = !!(round.synthesis && round.synthesis.trim());
          const isLast = index === rounds.length - 1;

          return (
            <div key={round.id} className="round-timeline-item">
              {/* Connector line */}
              {!isLast && <div className="round-timeline-connector" />}

              {/* Node */}
              <button
                className={`round-timeline-node ${isSelected ? 'selected' : ''} ${isActive ? 'active' : ''} ${hasSynthesis ? 'has-synthesis' : ''}`}
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
