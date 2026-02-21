import { useState } from 'react';
import { CheckCircle2, MessageSquare, BarChart3, HelpCircle } from 'lucide-react';

// ─── Types ──────────────────────────────────────────────

export type Round = {
  id: number;
  round_number: number;
  synthesis: string;
  synthesis_json?: any;
  is_active: boolean;
  questions: string[];
  convergence_score?: number | null;
  response_count?: number;
};

interface RoundTimelineProps {
  rounds: Round[];
  activeRoundId: number | null;
  selectedRoundId: number | null;
  onSelectRound: (round: Round) => void;
}

// ─── Helpers ────────────────────────────────────────────

function convergenceColor(score: number | null | undefined): string {
  if (score == null) return 'var(--muted-foreground)';
  const pct = Math.round(score * 100);
  if (pct >= 80) return 'var(--success)';
  if (pct >= 60) return '#eab308';
  return 'var(--destructive)';
}

function convergenceLabel(score: number | null | undefined): string {
  if (score == null) return '—';
  return `${Math.round(score * 100)}%`;
}

// ─── Component ──────────────────────────────────────────

export default function RoundTimeline({
  rounds,
  activeRoundId,
  selectedRoundId,
  onSelectRound,
}: RoundTimelineProps) {
  const [hoveredId, setHoveredId] = useState<number | null>(null);

  if (rounds.length === 0) return null;

  return (
    <div className="round-timeline-v2">
      <div className="round-timeline-v2-header">
        <h3 className="round-timeline-v2-title">Round Navigation</h3>
        <span className="round-timeline-v2-count">
          {rounds.length} round{rounds.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* ── Horizontal stepper track ── */}
      <div className="round-timeline-v2-stepper">
        {rounds.map((round, index) => {
          const isActive = round.is_active;
          const isSelected = round.id === selectedRoundId;
          const hasSynthesis = !!(round.synthesis && round.synthesis.trim());
          const isLast = index === rounds.length - 1;

          return (
            <div key={round.id} className="round-timeline-v2-step">
              {/* Connector line */}
              {!isLast && (
                <div
                  className={`round-timeline-v2-connector ${
                    hasSynthesis ? 'completed' : ''
                  }`}
                />
              )}

              {/* Node button */}
              <button
                className={[
                  'round-timeline-v2-node',
                  isActive ? 'active' : '',
                  isSelected ? 'selected' : '',
                  hasSynthesis ? 'has-synthesis' : '',
                ].filter(Boolean).join(' ')}
                onClick={() => onSelectRound(round)}
                onMouseEnter={() => setHoveredId(round.id)}
                onMouseLeave={() => setHoveredId(null)}
                aria-label={`Round ${round.round_number}`}
                aria-current={isSelected ? 'step' : undefined}
              >
                {hasSynthesis ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : (
                  <span className="round-timeline-v2-node-number">
                    {round.round_number}
                  </span>
                )}
              </button>

              {/* Label below */}
              <span
                className={`round-timeline-v2-step-label ${
                  isSelected ? 'selected' : ''
                } ${isActive ? 'active' : ''}`}
              >
                R{round.round_number}
              </span>
            </div>
          );
        })}
      </div>

      {/* ── Round cards ── */}
      <div className="round-timeline-v2-cards">
        {rounds.map((round) => {
          const isActive = round.is_active;
          const isSelected = round.id === selectedRoundId;
          const hasSynthesis = !!(round.synthesis && round.synthesis.trim());

          return (
            <button
              key={round.id}
              className={[
                'round-card-v2',
                isSelected ? 'selected' : '',
                isActive ? 'current' : '',
              ].filter(Boolean).join(' ')}
              onClick={() => onSelectRound(round)}
            >
              {/* Card header */}
              <div className="round-card-v2-header">
                <div className="round-card-v2-title-row">
                  <span className="round-card-v2-title">
                    Round {round.round_number}
                  </span>
                  <div className="round-card-v2-badges">
                    {isActive && (
                      <span className="round-card-v2-badge round-card-v2-badge-active">
                        <span className="round-card-v2-badge-dot active" />
                        Live
                      </span>
                    )}
                    {hasSynthesis && !isActive && (
                      <span className="round-card-v2-badge round-card-v2-badge-complete">
                        <CheckCircle2 size={12} style={{ color: 'var(--success)', display: 'inline', verticalAlign: 'text-bottom', marginRight: '3px' }} />
                        Synthesised
                      </span>
                    )}
                    {!hasSynthesis && !isActive && (
                      <span className="round-card-v2-badge round-card-v2-badge-pending">
                        Pending
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Stats row */}
              <div className="round-card-v2-stats">
                <div className="round-card-v2-stat">
                  <span className="round-card-v2-stat-icon"><MessageSquare size={14} style={{ color: 'var(--muted-foreground)' }} /></span>
                  <span className="round-card-v2-stat-value">
                    {round.response_count ?? 0}
                  </span>
                  <span className="round-card-v2-stat-label">responses</span>
                </div>

                <div className="round-card-v2-stat">
                  <span className="round-card-v2-stat-icon"><BarChart3 size={14} style={{ color: 'var(--accent)' }} /></span>
                  <span
                    className="round-card-v2-stat-value"
                    style={{ color: convergenceColor(round.convergence_score) }}
                  >
                    {convergenceLabel(round.convergence_score)}
                  </span>
                  <span className="round-card-v2-stat-label">convergence</span>
                </div>

                <div className="round-card-v2-stat">
                  <span className="round-card-v2-stat-icon"><HelpCircle size={14} style={{ color: 'var(--muted-foreground)' }} /></span>
                  <span className="round-card-v2-stat-value">
                    {round.questions?.length ?? 0}
                  </span>
                  <span className="round-card-v2-stat-label">questions</span>
                </div>
              </div>

              {/* Selection indicator */}
              {isSelected && (
                <div className="round-card-v2-selected-indicator" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
