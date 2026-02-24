import { memo } from 'react';
import { Users, TrendingUp, ClipboardList, FileText, MessageSquare, ChartNoAxesColumn, HelpCircle } from 'lucide-react';
import MarkdownRenderer from './MarkdownRenderer';
import StructuredSynthesis from './StructuredSynthesis';
import type { Round } from './RoundTimeline';
import { extractQuestionText } from '../utils/questions';

interface RoundCardProps {
  round: Round;
  isCurrentRound: boolean;
  expertLabels?: Record<number, string>;
  formId?: number;
  token?: string;
  currentUserEmail?: string;
}

const RoundCard = memo(function RoundCard({ round, isCurrentRound, expertLabels, formId, token, currentUserEmail }: RoundCardProps) {
  const hasSynthesis = !!(round.synthesis && round.synthesis.trim());
  const hasStructured = !!(round.synthesis_json && typeof round.synthesis_json === 'object');

  return (
    <div
      className={`round-detail-card fade-in ${isCurrentRound ? 'current' : ''}`}
    >
      {/* Header */}
      <div className="round-detail-card-header">
        <div className="round-detail-card-title-group">
          <h3 className="round-detail-card-title">
            Round {round.round_number}
            {isCurrentRound && (
              <span className="round-detail-card-live-badge">
                <span className="round-detail-card-live-dot" />
                Current Round
              </span>
            )}
          </h3>
          <div className="round-detail-card-meta">
            <span className="round-detail-card-meta-item">
              <MessageSquare size={14} style={{ color: 'var(--muted-foreground)', display: 'inline', verticalAlign: 'text-bottom', marginRight: '4px' }} />
              {round.response_count ?? 0} responses
            </span>
            {round.convergence_score != null && (
              <span className="round-detail-card-meta-item">
                <ChartNoAxesColumn size={14} style={{ color: 'var(--accent)', display: 'inline', verticalAlign: 'text-bottom', marginRight: '4px' }} />
                {Math.round(round.convergence_score * 100)}% convergence
              </span>
            )}
            <span className="round-detail-card-meta-item">
              <HelpCircle size={14} style={{ color: 'var(--muted-foreground)', display: 'inline', verticalAlign: 'text-bottom', marginRight: '4px' }} />
              {round.questions?.length ?? 0} questions
            </span>
          </div>
        </div>
      </div>

      {/* Convergence progress bar */}
      {round.convergence_score != null && (
        <div className="round-detail-convergence">
          <div className="round-detail-convergence-header">
            <span className="round-detail-convergence-label">Convergence Score</span>
            <span
              className="round-detail-convergence-value"
              style={{
                color:
                  round.convergence_score >= 0.8
                    ? 'var(--success)'
                    : round.convergence_score >= 0.6
                    ? 'var(--warning)'
                    : 'var(--destructive)',
              }}
            >
              {Math.round(round.convergence_score * 100)}%
            </span>
          </div>
          <div className="round-detail-convergence-track">
            <div
              className="round-detail-convergence-fill"
              style={{
                width: `${Math.round(round.convergence_score * 100)}%`,
                backgroundColor:
                  round.convergence_score >= 0.8
                    ? 'var(--success)'
                    : round.convergence_score >= 0.6
                    ? 'var(--warning)'
                    : 'var(--destructive)',
              }}
            />
          </div>
        </div>
      )}

      {/* Questions for this round */}
      {round.questions && round.questions.length > 0 && (
        <div className="round-detail-questions">
          <h4 className="round-detail-questions-title">Questions</h4>
          <ol className="round-detail-questions-list">
            {round.questions.map((q, i) => (
              <li key={i} className="round-detail-question-item">
                {extractQuestionText(q)}
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* Synthesis content */}
      {hasSynthesis && (
        <div className="round-detail-synthesis">
          <h4 className="round-detail-synthesis-title">Synthesis</h4>
          {hasStructured ? (
            <StructuredSynthesis
              data={round.synthesis_json!}
              convergenceScore={round.convergence_score ?? undefined}
              expertLabels={expertLabels}
              formId={formId}
              roundId={round.id}
              token={token}
              currentUserEmail={currentUserEmail}
            />
          ) : (
            <div className="round-detail-synthesis-body">
              <MarkdownRenderer content={round.synthesis} />
            </div>
          )}
        </div>
      )}

      {!hasSynthesis && (
        <div className="round-detail-empty">
          <div className="round-detail-empty-icon"><FileText size={24} style={{ color: 'var(--muted-foreground)' }} /></div>
          <p className="round-detail-empty-text">
            {isCurrentRound
              ? 'No synthesis generated yet for this round. Use the editor above to write or generate one.'
              : 'No synthesis was recorded for this round.'}
          </p>
        </div>
      )}
    </div>
  );
});

export default RoundCard;
