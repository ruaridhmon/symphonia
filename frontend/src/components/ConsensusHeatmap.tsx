import { memo, useMemo, useState, useRef, useEffect } from 'react';
import { Grid3x3, Users, HelpCircle } from 'lucide-react';

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

interface SynthesisData {
  agreements: Agreement[];
  disagreements: Disagreement[];
  nuances: Nuance[];
  confidence_map?: Record<string, number>;
  [key: string]: any;
}

interface HeatmapCell {
  expertId: number;
  topicIndex: number;
  /** -1 (strong disagreement) to +1 (strong agreement), 0 = uncertain/not involved */
  value: number;
  /** Describes why this cell has its value */
  reasons: string[];
  type: 'agreement' | 'disagreement' | 'mixed' | 'absent';
}

interface Topic {
  label: string;
  type: 'agreement' | 'disagreement' | 'nuance';
  index: number;
}

interface ConsensusHeatmapProps {
  structuredData: SynthesisData;
  resolvedExpertLabels: Record<number, string>;
  questions?: (string | Record<string, unknown>)[];
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

function truncate(s: string, max: number): string {
  return s.length > max ? s.slice(0, max - 1) + '…' : s;
}

// ─── Component ───────────────────────────────────────────

const ConsensusHeatmap = memo(function ConsensusHeatmap({
  structuredData,
  resolvedExpertLabels,
  questions,
}: ConsensusHeatmapProps) {
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    cell: HeatmapCell;
    topicLabel: string;
    expertLabel: string;
  } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  // Close tooltip on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        tooltipRef.current &&
        !tooltipRef.current.contains(e.target as Node) &&
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setTooltip(null);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Collect all expert IDs
  const expertIds = useMemo(() => {
    const ids = new Set<number>();
    for (const a of structuredData.agreements || []) {
      for (const id of a.supporting_experts) ids.add(id);
    }
    for (const d of structuredData.disagreements || []) {
      for (const pos of d.positions) {
        for (const id of pos.experts) ids.add(id);
      }
    }
    for (const n of structuredData.nuances || []) {
      for (const id of n.relevant_experts || []) ids.add(id);
    }
    for (const idStr of Object.keys(resolvedExpertLabels)) {
      const id = Number(idStr);
      if (id > 0) ids.add(id);
    }
    return Array.from(ids).sort((a, b) => a - b);
  }, [structuredData, resolvedExpertLabels]);

  // Build topics from agreements + disagreements
  const topics: Topic[] = useMemo(() => {
    const result: Topic[] = [];
    (structuredData.agreements || []).forEach((a, i) => {
      result.push({ label: a.claim, type: 'agreement', index: i });
    });
    (structuredData.disagreements || []).forEach((d, i) => {
      result.push({ label: d.topic, type: 'disagreement', index: i });
    });
    return result;
  }, [structuredData]);

  // Build the heatmap matrix
  const { cells, topicConsensus, expertEngagement } = useMemo(() => {
    const cellMap: Record<string, HeatmapCell> = {};

    // Initialize all cells as absent
    topics.forEach((topic, ti) => {
      expertIds.forEach((eid) => {
        const key = `${ti}:${eid}`;
        cellMap[key] = {
          expertId: eid,
          topicIndex: ti,
          value: 0,
          reasons: [],
          type: 'absent',
        };
      });
    });

    // Fill in agreements: experts who supported an agreement get positive values
    (structuredData.agreements || []).forEach((a, aIdx) => {
      const topicIdx = aIdx; // agreements come first in topics
      const confidence = a.confidence ?? 0.75;
      for (const eid of a.supporting_experts) {
        const key = `${topicIdx}:${eid}`;
        if (cellMap[key]) {
          cellMap[key].value = confidence;
          cellMap[key].type = 'agreement';
          cellMap[key].reasons.push(`Supports: "${truncate(a.claim, 60)}"`);
          cellMap[key].reasons.push(`Confidence: ${Math.round(confidence * 100)}%`);
        }
      }
      // Experts NOT in supporting_experts but present in disagreements about
      // the same area get a slightly negative mark (if we can detect overlap)
    });

    // Fill in disagreements
    const numAgreements = (structuredData.agreements || []).length;
    (structuredData.disagreements || []).forEach((d, dIdx) => {
      const topicIdx = numAgreements + dIdx;
      const severityMap: Record<string, number> = {
        low: -0.3,
        moderate: -0.6,
        high: -0.9,
      };
      const baseValue = severityMap[d.severity] ?? -0.5;

      for (const pos of d.positions) {
        for (const eid of pos.experts) {
          const key = `${topicIdx}:${eid}`;
          if (cellMap[key]) {
            // Experts on opposing sides of the same topic
            cellMap[key].value = baseValue;
            cellMap[key].type = 'disagreement';
            cellMap[key].reasons.push(`Position: "${truncate(pos.position, 60)}"`);
            if (pos.evidence) {
              cellMap[key].reasons.push(`Evidence: ${truncate(pos.evidence, 60)}`);
            }
          }
        }
      }
    });

    // Nuances mark uncertainty for involved experts on their closest topic
    // (lightweight — just add a nuance indicator)

    const allCells = Object.values(cellMap);

    // Compute per-topic consensus scores
    const topicConsensusMap: Record<number, number> = {};
    topics.forEach((_, ti) => {
      const topicCells = allCells.filter((c) => c.topicIndex === ti && c.type !== 'absent');
      if (topicCells.length === 0) {
        topicConsensusMap[ti] = 0;
        return;
      }
      const avg = topicCells.reduce((sum, c) => sum + c.value, 0) / topicCells.length;
      topicConsensusMap[ti] = avg;
    });

    // Compute per-expert engagement
    const expertEngagementMap: Record<number, number> = {};
    expertIds.forEach((eid) => {
      const expertCells = allCells.filter((c) => c.expertId === eid && c.type !== 'absent');
      expertEngagementMap[eid] = expertCells.length;
    });

    return {
      cells: cellMap,
      topicConsensus: topicConsensusMap,
      expertEngagement: expertEngagementMap,
    };
  }, [structuredData, topics, expertIds]);

  // Don't render if insufficient data
  if (expertIds.length < 2 || topics.length < 1) return null;

  function getCellColor(value: number, type: string): string {
    if (type === 'absent') return 'var(--muted)';
    if (value > 0.6) return `rgba(34, 197, 94, ${0.3 + value * 0.5})`;
    if (value > 0.3) return `rgba(34, 197, 94, ${0.15 + value * 0.35})`;
    if (value > 0) return `rgba(234, 179, 8, ${0.15 + value * 0.4})`;
    if (value > -0.3) return `rgba(234, 179, 8, ${0.15 + Math.abs(value) * 0.4})`;
    if (value > -0.6) return `rgba(239, 68, 68, ${0.15 + Math.abs(value) * 0.45})`;
    return `rgba(239, 68, 68, ${0.3 + Math.abs(value) * 0.5})`;
  }

  function getCellTextColor(value: number, type: string): string {
    if (type === 'absent') return 'var(--muted-foreground)';
    if (Math.abs(value) > 0.6) return '#ffffff';
    return 'var(--foreground)';
  }

  function getCellIcon(type: string): string {
    switch (type) {
      case 'agreement': return '✓';
      case 'disagreement': return '✗';
      case 'mixed': return '~';
      default: return '·';
    }
  }

  function getConsensusLabel(value: number): string {
    if (value > 0.6) return 'Strong consensus';
    if (value > 0.3) return 'Moderate consensus';
    if (value > 0) return 'Weak consensus';
    if (value > -0.3) return 'Minor divergence';
    if (value > -0.6) return 'Moderate divergence';
    return 'Strong divergence';
  }

  function getConsensusBgColor(value: number): string {
    if (value > 0.3) return 'rgba(34, 197, 94, 0.12)';
    if (value > 0) return 'rgba(234, 179, 8, 0.12)';
    if (value > -0.3) return 'rgba(234, 179, 8, 0.12)';
    return 'rgba(239, 68, 68, 0.12)';
  }

  function handleCellHover(
    e: React.MouseEvent,
    cell: HeatmapCell,
    topicLabel: string,
    expertLabel: string
  ) {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const containerRect = containerRef.current?.getBoundingClientRect();
    if (!containerRect) return;

    setTooltip({
      x: rect.left - containerRect.left + rect.width / 2,
      y: rect.top - containerRect.top - 8,
      cell,
      topicLabel,
      expertLabel,
    });
  }

  return (
    <div className="consensus-heatmap fade-in" ref={containerRef}>
      <div className="consensus-heatmap-title">
        <Grid3x3 size={16} style={{ color: 'var(--accent)' }} />
        <span>Consensus Heatmap</span>
        <span className="consensus-heatmap-subtitle">
          Topic × Expert consensus mapping
        </span>
      </div>

      {/* Summary bar */}
      <div className="consensus-heatmap-summary">
        <div className="consensus-heatmap-summary-item">
          <span className="consensus-heatmap-summary-value">{topics.length}</span>
          <span className="consensus-heatmap-summary-label">Topics</span>
        </div>
        <div className="consensus-heatmap-summary-item">
          <span className="consensus-heatmap-summary-value">{expertIds.length}</span>
          <span className="consensus-heatmap-summary-label">Experts</span>
        </div>
        <div className="consensus-heatmap-summary-item">
          <span className="consensus-heatmap-summary-value">
            {Object.values(cells).filter((c) => c.type !== 'absent').length}
          </span>
          <span className="consensus-heatmap-summary-label">Data Points</span>
        </div>
      </div>

      {/* Heatmap grid */}
      <div className="consensus-heatmap-scroll">
        <table className="consensus-heatmap-table">
          <thead>
            <tr>
              <th className="consensus-heatmap-corner">
                <span className="consensus-heatmap-corner-label">Topic / Expert →</span>
              </th>
              {expertIds.map((id) => (
                <th key={id} className="consensus-heatmap-header-col">
                  <span
                    className={`expert-chip ${getDimensionClass(resolvedExpertLabels[id])}`}
                  >
                    {resolvedExpertLabels[id] || `E${id}`}
                  </span>
                  <span className="consensus-heatmap-engagement">
                    {expertEngagement[id] || 0} topics
                  </span>
                </th>
              ))}
              <th className="consensus-heatmap-header-col consensus-heatmap-consensus-col">
                <span className="consensus-heatmap-consensus-header">
                  Consensus
                </span>
              </th>
            </tr>
          </thead>
          <tbody>
            {topics.map((topic, ti) => (
              <tr key={ti}>
                <td className="consensus-heatmap-header-row">
                  <div className="consensus-heatmap-topic">
                    <span
                      className={`consensus-heatmap-topic-badge consensus-heatmap-topic-${topic.type}`}
                    >
                      {topic.type === 'agreement' ? '✓' : '⚡'}
                    </span>
                    <span className="consensus-heatmap-topic-label" title={topic.label}>
                      {truncate(topic.label, 50)}
                    </span>
                  </div>
                </td>
                {expertIds.map((eid) => {
                  const key = `${ti}:${eid}`;
                  const cell = cells[key];
                  if (!cell) return <td key={eid} className="consensus-heatmap-cell" />;

                  return (
                    <td
                      key={eid}
                      className="consensus-heatmap-cell"
                      style={{
                        backgroundColor: getCellColor(cell.value, cell.type),
                        color: getCellTextColor(cell.value, cell.type),
                      }}
                      onMouseEnter={(e) =>
                        handleCellHover(
                          e,
                          cell,
                          topic.label,
                          resolvedExpertLabels[eid] || `Expert ${eid}`
                        )
                      }
                      onMouseLeave={() => setTooltip(null)}
                    >
                      <span className="consensus-heatmap-cell-icon">
                        {getCellIcon(cell.type)}
                      </span>
                    </td>
                  );
                })}
                {/* Consensus summary column */}
                <td
                  className="consensus-heatmap-cell consensus-heatmap-consensus-cell"
                  style={{
                    backgroundColor: getConsensusBgColor(topicConsensus[ti] ?? 0),
                  }}
                >
                  <span className="consensus-heatmap-consensus-label">
                    {getConsensusLabel(topicConsensus[ti] ?? 0)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="consensus-heatmap-legend">
        <div className="consensus-heatmap-legend-item">
          <span
            className="consensus-heatmap-legend-swatch"
            style={{ backgroundColor: 'rgba(34, 197, 94, 0.6)' }}
          />
          <span>Agree</span>
        </div>
        <div className="consensus-heatmap-legend-item">
          <span
            className="consensus-heatmap-legend-swatch"
            style={{ backgroundColor: 'rgba(234, 179, 8, 0.5)' }}
          />
          <span>Uncertain</span>
        </div>
        <div className="consensus-heatmap-legend-item">
          <span
            className="consensus-heatmap-legend-swatch"
            style={{ backgroundColor: 'rgba(239, 68, 68, 0.6)' }}
          />
          <span>Disagree</span>
        </div>
        <div className="consensus-heatmap-legend-item">
          <span
            className="consensus-heatmap-legend-swatch"
            style={{ backgroundColor: 'var(--muted)' }}
          />
          <span>Not involved</span>
        </div>
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div
          ref={tooltipRef}
          className="consensus-heatmap-tooltip"
          style={{
            left: tooltip.x,
            top: tooltip.y,
          }}
        >
          <div className="consensus-heatmap-tooltip-header">
            <span
              className={`expert-chip ${getDimensionClass(
                resolvedExpertLabels[tooltip.cell.expertId]
              )}`}
            >
              {tooltip.expertLabel}
            </span>
          </div>
          <div className="consensus-heatmap-tooltip-topic">
            {truncate(tooltip.topicLabel, 80)}
          </div>
          <div
            className="consensus-heatmap-tooltip-status"
            style={{
              color:
                tooltip.cell.type === 'agreement'
                  ? 'var(--success)'
                  : tooltip.cell.type === 'disagreement'
                  ? 'var(--destructive)'
                  : 'var(--muted-foreground)',
            }}
          >
            {tooltip.cell.type === 'agreement'
              ? '✓ Agrees'
              : tooltip.cell.type === 'disagreement'
              ? '✗ Disagrees'
              : tooltip.cell.type === 'mixed'
              ? '~ Mixed'
              : '· Not involved'}
            {tooltip.cell.value !== 0 && (
              <span className="consensus-heatmap-tooltip-score">
                {' '}
                ({Math.round(Math.abs(tooltip.cell.value) * 100)}% strength)
              </span>
            )}
          </div>
          {tooltip.cell.reasons.length > 0 && (
            <div className="consensus-heatmap-tooltip-reasons">
              {tooltip.cell.reasons.map((r, i) => (
                <p key={i} className="consensus-heatmap-tooltip-reason">
                  {r}
                </p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
});

export default ConsensusHeatmap;
