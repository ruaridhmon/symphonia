import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import CommentThread from './CommentThread';
import type { EmergentInsight } from '../types/synthesis';

interface EmergenceHighlightsProps {
  insights: EmergentInsight[];
  expertLabels?: Record<number, string>;
  formId?: number;
  roundId?: number;
  token?: string;
  currentUserEmail?: string;
}

// ─── Helpers ─────────────────────────────────────────────

function getDimensionClass(label?: string): string {
  if (!label) return '';
  const lower = label.toLowerCase();
  if (lower.includes('past') || lower.includes('urðr') || lower.includes('urd')) return 'dimension-past';
  if (lower.includes('present') || lower.includes('verðandi') || lower.includes('verdandi')) return 'dimension-present';
  if (lower.includes('future') || lower.includes('skuld')) return 'dimension-future';
  if (lower.includes('quantitative')) return 'dimension-quantitative';
  if (lower.includes('qualitative')) return 'dimension-qualitative';
  if (lower.includes('mixed')) return 'dimension-mixed';
  if (lower.includes('industry')) return 'dimension-industry';
  if (lower.includes('academia')) return 'dimension-academia';
  if (lower.includes('policy')) return 'dimension-policy';
  return '';
}

function getEmergenceTypeLabel(type: string): string {
  switch (type) {
    case 'cross-pollination': return 'Cross-pollination';
    case 'synthesis': return 'Synthesis';
    case 'implicit': return 'Implicit';
    default: return type;
  }
}

function getEmergenceTypeClass(type: string): string {
  switch (type) {
    case 'cross-pollination': return 'emergence-type-cross-pollination';
    case 'synthesis': return 'emergence-type-synthesis';
    case 'implicit': return 'emergence-type-implicit';
    default: return '';
  }
}

// ─── Component ───────────────────────────────────────────

export default function EmergenceHighlights({ insights, expertLabels, formId, roundId, token, currentUserEmail }: EmergenceHighlightsProps) {
  const commentsEnabled = !!(formId && roundId && token);
  const [expanded, setExpanded] = useState(true);

  if (!insights || insights.length === 0) return null;

  return (
    <div className="emergence-section fade-in">
      <button
        className="structured-section-header"
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
        aria-controls="emergence-highlights-body"
        aria-label={`Emergent Insights — ${insights.length} item${insights.length !== 1 ? 's' : ''}`}
      >
        <div className="structured-section-left">
          <span className="structured-section-emoji" aria-hidden="true"><Sparkles size={16} style={{ color: 'var(--accent)' }} /></span>
          <span className="structured-section-title">Emergent Insights</span>
          <span className="structured-section-badge" style={{ backgroundColor: 'var(--accent)' }}>
            {insights.length}
          </span>
        </div>
        <span className={`structured-section-chevron ${expanded ? 'expanded' : ''}`} aria-hidden="true">
          ▸
        </span>
      </button>

      {expanded && (
        <div className="structured-section-body slide-down" id="emergence-highlights-body" role="region" aria-label="Emergent Insights">
          {insights.map((insight, i) => (
            <div key={i} className="emergence-card">
              <div className="emergence-card-top">
                <p className="emergence-card-insight">{insight.insight}</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                  <span className={`emergence-type-badge ${getEmergenceTypeClass(insight.emergence_type)}`}>
                    {getEmergenceTypeLabel(insight.emergence_type)}
                  </span>
                  {commentsEnabled && (
                    <CommentThread
                      formId={formId!}
                      roundId={roundId!}
                      sectionType="emergence"
                      sectionIndex={i}
                      token={token!}
                      currentUserEmail={currentUserEmail}
                    />
                  )}
                </div>
              </div>
              {(insight.contributing_experts || []).length > 0 && (
                <div className="structured-card-experts">
                  {(insight.contributing_experts || []).map(id => (
                    <span
                      key={id}
                      className={`expert-chip ${getDimensionClass(expertLabels?.[id])}`}
                      title={`Expert ${id}`}
                    >
                      {expertLabels?.[id] || `E${id}`}
                    </span>
                  ))}
                </div>
              )}
              <p className="emergence-explanation">{insight.explanation}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
