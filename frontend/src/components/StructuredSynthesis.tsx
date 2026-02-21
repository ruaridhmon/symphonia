import { useState } from 'react';
import { CheckCircle2, Zap, Lightbulb, Target, FileText, Quote, ChevronDown } from 'lucide-react';
import CommentThread from './CommentThread';
import type { SynthesisData, EvidenceExcerpt } from '../types/synthesis';

interface StructuredSynthesisProps {
  data: SynthesisData;
  convergenceScore?: number;
  expertLabels?: Record<number, string>;
  formId?: number;
  roundId?: number;
  token?: string;
  currentUserEmail?: string;
}

// ─── Sub-components ──────────────────────────────────────

function SectionHeader({
  title,
  count,
  icon,
  color,
  expanded,
  onToggle,
  sectionId,
  headerId,
}: {
  title: string;
  count: number;
  icon: React.ReactNode;
  color: string;
  expanded: boolean;
  onToggle: () => void;
  sectionId: string;
  headerId: string;
}) {
  return (
    <button
      className="structured-section-header"
      onClick={onToggle}
      id={headerId}
      aria-expanded={expanded}
      aria-controls={sectionId}
    >
      <div className="structured-section-left">
        <span className="structured-section-emoji" aria-hidden="true">{icon}</span>
        <span className="structured-section-title">{title}</span>
        <span className="structured-section-badge" style={{ backgroundColor: color }}>
          {count}
        </span>
      </div>
      <span className={`structured-section-chevron ${expanded ? 'expanded' : ''}`} aria-hidden="true">
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

function EvidenceDrawer({
  excerpts,
  expertLabels,
  isOpen,
  onToggle,
}: {
  excerpts: EvidenceExcerpt[];
  expertLabels?: Record<number, string>;
  isOpen: boolean;
  onToggle: () => void;
}) {
  if (!excerpts || excerpts.length === 0) return null;

  return (
    <div className="evidence-drawer">
      <button
        className="evidence-drawer-toggle"
        onClick={onToggle}
        aria-expanded={isOpen}
      >
        <Quote size={14} style={{ color: 'var(--accent)', flexShrink: 0 }} />
        <span className="evidence-drawer-label">
          {excerpts.length} supporting excerpt{excerpts.length !== 1 ? 's' : ''}
        </span>
        <ChevronDown
          size={14}
          className={`evidence-drawer-chevron ${isOpen ? 'open' : ''}`}
        />
      </button>
      {isOpen && (
        <div className="evidence-drawer-body slide-down">
          {excerpts.map((ex, idx) => {
            const label = expertLabels?.[ex.expert_id] || ex.expert_label || `E${ex.expert_id}`;
            return (
              <div key={idx} className="evidence-excerpt">
                <div className="evidence-excerpt-header">
                  <span className={`expert-chip ${getDimensionClass(expertLabels?.[ex.expert_id])}`}>
                    {label}
                  </span>
                </div>
                <blockquote className="evidence-excerpt-quote">
                  "{ex.quote}"
                </blockquote>
              </div>
            );
          })}
        </div>
      )}
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

export default function StructuredSynthesis({ data, convergenceScore, expertLabels, formId, roundId, token, currentUserEmail }: StructuredSynthesisProps) {
  const commentsEnabled = !!(formId && roundId && token);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    agreements: true,
    disagreements: true,
    nuances: false,
    probes: true,
    narrative: false,
  });
  const [openEvidence, setOpenEvidence] = useState<Record<number, boolean>>({});

  const toggleEvidence = (index: number) =>
    setOpenEvidence(prev => ({ ...prev, [index]: !prev[index] }));

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
            icon={<FileText size={16} style={{ color: 'var(--accent)' }} />}
            color="var(--accent)"
            expanded={expandedSections.narrative}
            onToggle={() => toggle('narrative')}
            sectionId="synthesis-section-narrative"
            headerId="synthesis-header-narrative"
          />
          {expandedSections.narrative && (
            <div
              className="structured-section-body slide-down"
              id="synthesis-section-narrative"
              role="region"
              aria-labelledby="synthesis-header-narrative"
            >
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
            icon={<CheckCircle2 size={16} style={{ color: 'var(--success)' }} />}
            color="var(--success)"
            expanded={expandedSections.agreements}
            onToggle={() => toggle('agreements')}
            sectionId="synthesis-section-agreements"
            headerId="synthesis-header-agreements"
          />
          {expandedSections.agreements && (
            <div
              className="structured-section-body slide-down"
              id="synthesis-section-agreements"
              role="region"
              aria-labelledby="synthesis-header-agreements"
            >
              {agreements.map((a, i) => (
                <div key={i} className="structured-card agreement-card">
                  <div className="structured-card-header">
                    <p className="structured-card-claim">{a.claim}</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <ConfidenceBar value={a.confidence} />
                      {commentsEnabled && (
                        <CommentThread
                          formId={formId!}
                          roundId={roundId!}
                          sectionType="agreement"
                          sectionIndex={i}
                          token={token!}
                          currentUserEmail={currentUserEmail}
                        />
                      )}
                    </div>
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
                  {a.evidence_excerpts && a.evidence_excerpts.length > 0 && (
                    <EvidenceDrawer
                      excerpts={a.evidence_excerpts}
                      expertLabels={expertLabels}
                      isOpen={!!openEvidence[i]}
                      onToggle={() => toggleEvidence(i)}
                    />
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
            icon={<Zap size={16} style={{ color: '#eab308' }} />}
            color="#eab308"
            expanded={expandedSections.disagreements}
            onToggle={() => toggle('disagreements')}
            sectionId="synthesis-section-disagreements"
            headerId="synthesis-header-disagreements"
          />
          {expandedSections.disagreements && (
            <div
              className="structured-section-body slide-down"
              id="synthesis-section-disagreements"
              role="region"
              aria-labelledby="synthesis-header-disagreements"
            >
              {disagreements.map((d, i) => (
                <div key={i} className="structured-card disagreement-card">
                  <div className="structured-card-header">
                    <p className="structured-card-claim">{d.topic}</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <SeverityBadge severity={d.severity} />
                      {commentsEnabled && (
                        <CommentThread
                          formId={formId!}
                          roundId={roundId!}
                          sectionType="disagreement"
                          sectionIndex={i}
                          token={token!}
                          currentUserEmail={currentUserEmail}
                        />
                      )}
                    </div>
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
            icon={<Lightbulb size={16} style={{ color: '#a855f7' }} />}
            color="#a855f7"
            expanded={expandedSections.nuances}
            onToggle={() => toggle('nuances')}
            sectionId="synthesis-section-nuances"
            headerId="synthesis-header-nuances"
          />
          {expandedSections.nuances && (
            <div
              className="structured-section-body slide-down"
              id="synthesis-section-nuances"
              role="region"
              aria-labelledby="synthesis-header-nuances"
            >
              {nuances.map((n, i) => (
                <div key={i} className="structured-card nuance-card">
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
                    <p className="structured-card-claim">{n.claim}</p>
                    {commentsEnabled && (
                      <CommentThread
                        formId={formId!}
                        roundId={roundId!}
                        sectionType="nuance"
                        sectionIndex={i}
                        token={token!}
                        currentUserEmail={currentUserEmail}
                      />
                    )}
                  </div>
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
            icon={<Target size={16} style={{ color: 'var(--accent)' }} />}
            color="var(--accent)"
            expanded={expandedSections.probes}
            onToggle={() => toggle('probes')}
            sectionId="synthesis-section-probes"
            headerId="synthesis-header-probes"
          />
          {expandedSections.probes && (
            <div
              className="structured-section-body slide-down"
              id="synthesis-section-probes"
              role="region"
              aria-labelledby="synthesis-header-probes"
            >
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
