import { useState } from 'react';
import { VolumeX } from 'lucide-react';

// ─── Types ──────────────────────────────────────────────

interface MinorityReportItem {
  claim: string;
  expert_ids: number[];
  agreement_level: string; // "minority" | "divided"
  counterpoint: string;
  original_evidence: string;
}

interface MinorityReportProps {
  reports: MinorityReportItem[];
  expertLabels?: Record<number, string>;
  totalExperts?: number;
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

function getAgreementBadge(level: string): { label: string; className: string } {
  switch (level) {
    case 'minority':
      return { label: 'Minority', className: 'minority-badge-minority' };
    case 'divided':
      return { label: 'Divided', className: 'minority-badge-divided' };
    default:
      return { label: level, className: '' };
  }
}

// ─── Component ───────────────────────────────────────────

export default function MinorityReport({ reports, expertLabels, totalExperts }: MinorityReportProps) {
  const [expanded, setExpanded] = useState(false);
  const [expandedEvidence, setExpandedEvidence] = useState<Record<number, boolean>>({});

  if (!reports || reports.length === 0) return null;

  const toggleEvidence = (index: number) => {
    setExpandedEvidence(prev => ({ ...prev, [index]: !prev[index] }));
  };

  // Compute total experts for the "X vs Y" display
  const effectiveTotal = totalExperts || Math.max(
    ...reports.flatMap(r => r.expert_ids),
    3
  );

  return (
    <div className="minority-section fade-in">
      <button className="structured-section-header" onClick={() => setExpanded(!expanded)}>
        <div className="structured-section-left">
          <span className="structured-section-emoji"><VolumeX size={16} style={{ color: 'var(--warning)' }} /></span>
          <span className="structured-section-title">Minority Report</span>
          <span className="structured-section-badge" style={{ backgroundColor: 'var(--warning)' }}>
            {reports.length}
          </span>
        </div>
        <span className={`structured-section-chevron ${expanded ? 'expanded' : ''}`}>
          ▸
        </span>
      </button>

      {expanded && (
        <div className="structured-section-body slide-down">
          {reports.map((report, i) => {
            const badge = getAgreementBadge(report.agreement_level);
            const minorityCount = report.expert_ids.length;
            const majorityCount = effectiveTotal - minorityCount;

            return (
              <div key={i} className="minority-card">
                {/* Header: claim + badge + vote count */}
                <div className="minority-card-header">
                  <p className="minority-claim">{report.claim}</p>
                  <div className="minority-card-meta">
                    <span className={`minority-agreement-badge ${badge.className}`}>
                      {badge.label}
                    </span>
                    <span className="minority-vote-count">
                      {minorityCount} vs {majorityCount}
                    </span>
                  </div>
                </div>

                {/* Expert chips */}
                {report.expert_ids.length > 0 && (
                  <div className="structured-card-experts">
                    <span className="minority-held-by">Held by:</span>
                    {report.expert_ids.map(id => (
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

                {/* Counterpoint — the majority view */}
                <div className="minority-counterpoint-block">
                  <span className="minority-vs">↕ Majority view</span>
                  <p className="minority-counterpoint">{report.counterpoint}</p>
                </div>

                {/* Collapsible evidence */}
                {report.original_evidence && (
                  <div className="minority-evidence-section">
                    <button
                      className="minority-evidence-toggle"
                      onClick={() => toggleEvidence(i)}
                    >
                      <span className={`minority-evidence-chevron ${expandedEvidence[i] ? 'expanded' : ''}`}>
                        ▸
                      </span>
                      Supporting evidence
                    </button>
                    {expandedEvidence[i] && (
                      <p className="minority-evidence slide-down">{report.original_evidence}</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
