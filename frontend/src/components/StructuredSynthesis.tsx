import { useState } from 'react';

// ─── Types ──────────────────────────────────────────────

interface Agreement {
  claim: string;
  supporting_experts: number[];
  confidence: number;
  evidence_summary: string;
}

interface DisagreementPosition {
  position: string;
  experts: number[];
  evidence: string;
}

interface Disagreement {
  topic: string;
  positions: DisagreementPosition[];
  severity: string;
}

interface Nuance {
  claim: string;
  context: string;
  relevant_experts: number[];
}

interface Probe {
  question: string;
  target_experts: number[];
  rationale: string;
}

interface SynthesisData {
  agreements: Agreement[];
  disagreements: Disagreement[];
  nuances: Nuance[];
  confidence_map: Record<string, number>;
  follow_up_probes: Probe[];
  meta_synthesis_reasoning: string;
  narrative?: string;
  areas_of_agreement?: string[];
  areas_of_disagreement?: string[];
  uncertainties?: string[];
  emergent_insights?: any[];
}

interface StructuredSynthesisProps {
  data: SynthesisData;
  convergenceScore?: number;
  expertLabels?: Record<number, string>;
}

// ─── Sub-components ──────────────────────────────────────

function SectionHeader({
  title,
  count,
  emoji,
  color,
  expanded,
  onToggle,
}: {
  title: string;
  count: number;
  emoji: string;
  color: string;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <button className="structured-section-header" onClick={onToggle}>
      <div className="structured-section-left">
        <span className="structured-section-emoji">{emoji}</span>
        <span className="structured-section-title">{title}</span>
        <span className="structured-section-badge" style={{ backgroundColor: color }}>
          {count}
        </span>
      </div>
      <span className={`structured-section-chevron ${expanded ? 'expanded' : ''}`}>
        ▸
      </span>
    </button>
  );
}

function ConfidenceBar({ value, label }: { value: number; label?: string }) {
  const pct = Math.round(value * 100);
  const color =
    pct >= 80 ? 'var(--success)' :
    pct >= 60 ? '#eab308' :
    'var(--destructive)';

  return (
    <div className="confidence-bar">
      {label && <span className="confidence-label">{label}</span>}
      <div className="confidence-track">
        <div className="confidence-fill" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <span className="confidence-value">{pct}%</span>
    </div>
  );
}

function SeverityBadge({ severity }: { severity: string }) {
  const colors: Record<string, { bg: string; text: string }> = {
    low: { bg: 'rgba(34,197,94,0.15)', text: 'var(--success)' },
    moderate: { bg: 'rgba(234,179,8,0.15)', text: '#eab308' },
    high: { bg: 'rgba(239,68,68,0.15)', text: 'var(--destructive)' },
  };
  const c = colors[severity] || colors.moderate;
  return (
    <span
      className="severity-badge"
      style={{ backgroundColor: c.bg, color: c.text }}
    >
      {severity}
    </span>
  );
}

// ─── Main Component ──────────────────────────────────────

// Helper to derive a dimension CSS class from an expert label
function getDimensionClass(label?: string): string {
  if (!label) return '';
  const lower = label.toLowerCase();
  // Temporal dimensions
  if (lower.includes('past') || lower.includes('urðr') || lower.includes('urd')) return 'dimension-past';
  if (lower.includes('present') || lower.includes('verðandi') || lower.includes('verdandi')) return 'dimension-present';
  if (lower.includes('future') || lower.includes('skuld')) return 'dimension-future';
  // Methodological dimensions
  if (lower.includes('quantitative')) return 'dimension-quantitative';
  if (lower.includes('qualitative')) return 'dimension-qualitative';
  if (lower.includes('mixed')) return 'dimension-mixed';
  // Stakeholder dimensions
  if (lower.includes('industry')) return 'dimension-industry';
  if (lower.includes('academia')) return 'dimension-academia';
  if (lower.includes('policy')) return 'dimension-policy';
  return '';
}

export default function StructuredSynthesis({ data, convergenceScore, expertLabels }: StructuredSynthesisProps) {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    agreements: true,
    disagreements: true,
    nuances: false,
    probes: true,
    narrative: false,
  });

  const toggle = (section: string) =>
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));

  const {
    agreements,
    disagreements,
    nuances,
    follow_up_probes: probes,
    confidence_map: confidence,
    narrative,
  } = data;

  return (
    <div className="structured-synthesis fade-in">
      {/* ── Overview Bar ── */}
      <div className="structured-overview">
        <div className="structured-overview-stats">
          <div className="structured-stat">
            <span className="structured-stat-value">{agreements.length}</span>
            <span className="structured-stat-label">Agreements</span>
          </div>
          <div className="structured-stat">
            <span className="structured-stat-value">{disagreements.length}</span>
            <span className="structured-stat-label">Disagreements</span>
          </div>
          <div className="structured-stat">
            <span className="structured-stat-value">{nuances.length}</span>
            <span className="structured-stat-label">Nuances</span>
          </div>
          <div className="structured-stat">
            <span className="structured-stat-value">{probes.length}</span>
            <span className="structured-stat-label">Probes</span>
          </div>
        </div>
        {convergenceScore != null && (
          <div className="structured-convergence">
            <ConfidenceBar value={convergenceScore} label="Convergence" />
          </div>
        )}
        {confidence.overall != null && (
          <div className="structured-convergence">
            <ConfidenceBar value={confidence.overall} label="Overall confidence" />
          </div>
        )}
      </div>

      {/* ── Narrative ── */}
      {narrative && (
        <div className="structured-section">
          <SectionHeader
            title="Narrative Summary"
            count={0}
            emoji="📝"
            color="var(--accent)"
            expanded={expandedSections.narrative}
            onToggle={() => toggle('narrative')}
          />
          {expandedSections.narrative && (
            <div className="structured-section-body slide-down">
              <div className="structured-narrative">{narrative}</div>
            </div>
          )}
        </div>
      )}

      {/* ── Agreements ── */}
      {agreements.length > 0 && (
        <div className="structured-section">
          <SectionHeader
            title="Agreements"
            count={agreements.length}
            emoji="✅"
            color="var(--success)"
            expanded={expandedSections.agreements}
            onToggle={() => toggle('agreements')}
          />
          {expandedSections.agreements && (
            <div className="structured-section-body slide-down">
              {agreements.map((a, i) => (
                <div key={i} className="structured-card agreement-card">
                  <div className="structured-card-header">
                    <p className="structured-card-claim">{a.claim}</p>
                    <ConfidenceBar value={a.confidence} />
                  </div>
                  <p className="structured-card-evidence">{a.evidence_summary}</p>
                  {a.supporting_experts.length > 0 && (
                    <div className="structured-card-experts">
                      {a.supporting_experts.map(id => (
                        <span key={id} className={`expert-chip ${getDimensionClass(expertLabels?.[id])}`} title={`Expert ${id}`}>
                          {expertLabels?.[id] || `E${id}`}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Disagreements ── */}
      {disagreements.length > 0 && (
        <div className="structured-section">
          <SectionHeader
            title="Disagreements"
            count={disagreements.length}
            emoji="⚡"
            color="#eab308"
            expanded={expandedSections.disagreements}
            onToggle={() => toggle('disagreements')}
          />
          {expandedSections.disagreements && (
            <div className="structured-section-body slide-down">
              {disagreements.map((d, i) => (
                <div key={i} className="structured-card disagreement-card">
                  <div className="structured-card-header">
                    <p className="structured-card-claim">{d.topic}</p>
                    <SeverityBadge severity={d.severity} />
                  </div>
                  <div className="disagreement-positions">
                    {d.positions.map((pos, j) => (
                      <div key={j} className="disagreement-position">
                        <div className="disagreement-position-marker" />
                        <div>
                          <p className="disagreement-position-text">{pos.position}</p>
                          {pos.evidence && (
                            <p className="disagreement-position-evidence">{pos.evidence}</p>
                          )}
                          {pos.experts.length > 0 && (
                            <div className="structured-card-experts">
                              {pos.experts.map(id => (
                                <span key={id} className={`expert-chip ${getDimensionClass(expertLabels?.[id])}`} title={`Expert ${id}`}>
                                  {expertLabels?.[id] || `E${id}`}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Nuances ── */}
      {nuances.length > 0 && (
        <div className="structured-section">
          <SectionHeader
            title="Nuances & Uncertainties"
            count={nuances.length}
            emoji="🔮"
            color="#a855f7"
            expanded={expandedSections.nuances}
            onToggle={() => toggle('nuances')}
          />
          {expandedSections.nuances && (
            <div className="structured-section-body slide-down">
              {nuances.map((n, i) => (
                <div key={i} className="structured-card nuance-card">
                  <p className="structured-card-claim">{n.claim}</p>
                  <p className="structured-card-evidence">{n.context}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Follow-up Probes ── */}
      {probes.length > 0 && (
        <div className="structured-section">
          <SectionHeader
            title="Follow-up Probes"
            count={probes.length}
            emoji="🎯"
            color="var(--accent)"
            expanded={expandedSections.probes}
            onToggle={() => toggle('probes')}
          />
          {expandedSections.probes && (
            <div className="structured-section-body slide-down">
              {probes.map((p, i) => (
                <div key={i} className="structured-card probe-card">
                  <p className="structured-card-claim">{p.question}</p>
                  <p className="structured-card-evidence">{p.rationale}</p>
                  {p.target_experts.length > 0 && (
                    <div className="structured-card-experts">
                      <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
                        Targets:
                      </span>
                      {p.target_experts.map(id => (
                        <span key={id} className={`expert-chip ${getDimensionClass(expertLabels?.[id])}`} title={`Expert ${id}`}>
                          {expertLabels?.[id] || `E${id}`}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
