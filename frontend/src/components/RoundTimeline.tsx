import { useState, useRef, useCallback } from 'react';
import { CheckCircle2, MessageSquare, BarChart3, HelpCircle } from 'lucide-react';
import type { Round } from '../types/summary';

export type { Round };

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
  const stepperRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const cardRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Roving tabindex: arrow key handler for stepper (Left/Right)
  const handleStepperKeyDown = useCallback(
    (e: React.KeyboardEvent, index: number) => {
      let nextIndex = -1;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        nextIndex = (index + 1) % rounds.length;
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        nextIndex = (index - 1 + rounds.length) % rounds.length;
      } else if (e.key === 'Home') {
        e.preventDefault();
        nextIndex = 0;
      } else if (e.key === 'End') {
        e.preventDefault();
        nextIndex = rounds.length - 1;
      }
      if (nextIndex >= 0) {
        stepperRefs.current[nextIndex]?.focus();
        onSelectRound(rounds[nextIndex]);
      }
    },
    [rounds, onSelectRound],
  );

  // Arrow key handler for card list (Up/Down)
  const handleCardKeyDown = useCallback(
    (e: React.KeyboardEvent, index: number) => {
      let nextIndex = -1;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        nextIndex = (index + 1) % rounds.length;
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        nextIndex = (index - 1 + rounds.length) % rounds.length;
      } else if (e.key === 'Home') {
        e.preventDefault();
        nextIndex = 0;
      } else if (e.key === 'End') {
        e.preventDefault();
        nextIndex = rounds.length - 1;
      }
      if (nextIndex >= 0) {
        cardRefs.current[nextIndex]?.focus();
        onSelectRound(rounds[nextIndex]);
      }
    },
    [rounds, onSelectRound],
  );

  if (rounds.length === 0) return null;

  const selectedIndex = rounds.findIndex(r => r.id === selectedRoundId);

  return (
    <div className="round-timeline-v2">
      <div className="round-timeline-v2-header">
        <h3 className="round-timeline-v2-title">Round Navigation</h3>
        <span className="round-timeline-v2-count">
          {rounds.length} round{rounds.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* ── Horizontal stepper track ── */}
      <div
        className="round-timeline-v2-stepper"
        role="tablist"
        aria-label="Round stepper"
      >
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
                ref={el => { stepperRefs.current[index] = el; }}
                className={[
                  'round-timeline-v2-node',
                  isActive ? 'active' : '',
                  isSelected ? 'selected' : '',
                  hasSynthesis ? 'has-synthesis' : '',
                ].filter(Boolean).join(' ')}
                role="tab"
                aria-selected={isSelected}
                tabIndex={isSelected || (selectedIndex === -1 && index === 0) ? 0 : -1}
                onClick={() => onSelectRound(round)}
                onKeyDown={e => handleStepperKeyDown(e, index)}
                onMouseEnter={() => setHoveredId(round.id)}
                onMouseLeave={() => setHoveredId(null)}
                aria-label={`Round ${round.round_number}${isActive ? ' (active)' : ''}${hasSynthesis ? ' (synthesised)' : ''}`}
              >
                {hasSynthesis ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
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
                aria-hidden="true"
              >
                R{round.round_number}
              </span>
            </div>
          );
        })}
      </div>

      {/* ── Round cards ── */}
      <div
        className="round-timeline-v2-cards"
        role="listbox"
        aria-label="Round cards"
      >
        {rounds.map((round, index) => {
          const isActive = round.is_active;
          const isSelected = round.id === selectedRoundId;
          const hasSynthesis = !!(round.synthesis && round.synthesis.trim());

          return (
            <button
              key={round.id}
              ref={el => { cardRefs.current[index] = el; }}
              className={[
                'round-card-v2',
                isSelected ? 'selected' : '',
                isActive ? 'current' : '',
              ].filter(Boolean).join(' ')}
              role="option"
              aria-selected={isSelected}
              tabIndex={isSelected || (selectedIndex === -1 && index === 0) ? 0 : -1}
              onClick={() => onSelectRound(round)}
              onKeyDown={e => handleCardKeyDown(e, index)}
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
