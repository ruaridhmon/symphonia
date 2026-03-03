import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { FileText, MessageSquare, ChartNoAxesColumn, HelpCircle } from 'lucide-react';
import MarkdownRenderer from './MarkdownRenderer';
import type { Round } from './RoundTimeline';
import { extractQuestionText } from '../utils/questions';

interface RoundCardProps {
  round: Round;
  isCurrentRound: boolean;
}

const RoundCard = memo(function RoundCard({ round, isCurrentRound }: RoundCardProps) {
  const { t } = useTranslation();
  const hasSynthesis = !!(round.synthesis && round.synthesis.trim());

  return (
    <div
      className={`round-detail-card fade-in ${isCurrentRound ? 'current' : ''}`}
    >
      {/* Header */}
      <div className="round-detail-card-header">
        <div className="round-detail-card-title-group">
          <h3 className="round-detail-card-title">
            {t('rounds.roundNumber', { number: round.round_number })}
            {isCurrentRound && (
              <span className="round-detail-card-live-badge">
                <span className="round-detail-card-live-dot" />
                {t('roundCard.currentRound')}
              </span>
            )}
          </h3>
          <div className="round-detail-card-meta">
            <span className="round-detail-card-meta-item">
              <MessageSquare size={14} style={{ color: 'var(--muted-foreground)', display: 'inline', verticalAlign: 'text-bottom', marginRight: '4px' }} />
              {round.response_count ?? 0} {t('rounds.responses')}
            </span>
            {round.convergence_score != null && (
              <span className="round-detail-card-meta-item">
                <ChartNoAxesColumn size={14} style={{ color: 'var(--accent)', display: 'inline', verticalAlign: 'text-bottom', marginRight: '4px' }} />
                {Math.round(round.convergence_score * 100)}% {t('rounds.convergence')}
              </span>
            )}
            <span className="round-detail-card-meta-item">
              <HelpCircle size={14} style={{ color: 'var(--muted-foreground)', display: 'inline', verticalAlign: 'text-bottom', marginRight: '4px' }} />
              {round.questions?.length ?? 0} {t('rounds.questions')}
            </span>
          </div>
        </div>
      </div>

      {/* Convergence progress bar */}
      {round.convergence_score != null && (
        <div className="round-detail-convergence">
          <div className="round-detail-convergence-header">
            <span className="round-detail-convergence-label">{t('roundCard.convergenceScore')}</span>
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
          <h4 className="round-detail-questions-title">{t('rounds.questions')}</h4>
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
          <h4 className="round-detail-synthesis-title">{t('rounds.synthesisRound', { number: round.round_number })}</h4>
          <div className="round-detail-synthesis-body">
            <MarkdownRenderer content={round.synthesis} />
          </div>
        </div>
      )}

      {!hasSynthesis && (
        <div className="round-detail-empty">
          <div className="round-detail-empty-icon"><FileText size={24} style={{ color: 'var(--muted-foreground)' }} /></div>
          <p className="round-detail-empty-text">
            {isCurrentRound
              ? t('roundCard.noSynthesisCurrent')
              : t('roundCard.noSynthesisHistoric')}
          </p>
        </div>
      )}
    </div>
  );
});

export default RoundCard;
