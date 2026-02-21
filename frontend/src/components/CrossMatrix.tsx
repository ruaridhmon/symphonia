import { memo, useMemo, useState, useRef, useEffect } from 'react';
import { CheckCircle2, Zap, Link2 } from 'lucide-react';

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

interface SynthesisData {
  agreements: Agreement[];
  disagreements: Disagreement[];
  [key: string]: any;
}

interface CellDetail {
  agreements: string[];
  disagreements: string[];
}

interface CrossMatrixProps {
  structuredData: SynthesisData;
  resolvedExpertLabels: Record<number, string>;
  expertLabelPreset: string;
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

function pairKey(a: number, b: number): string {
  return a < b ? `${a}:${b}` : `${b}:${a}`;
}

// ─── Component ───────────────────────────────────────────

const CrossMatrix = memo(function CrossMatrix({
  structuredData,
  resolvedExpertLabels,
  expertLabelPreset,
}: CrossMatrixProps) {
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    rowId: number;
    colId: number;
    score: number;
    details: CellDetail;
  } | null>(null);

  const matrixRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  // Close tooltip when clicking outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        tooltipRef.current &&
        !tooltipRef.current.contains(e.target as Node) &&
        matrixRef.current &&
        !matrixRef.current.contains(e.target as Node)
      ) {
        setTooltip(null);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Collect all expert IDs mentioned in the data
  const expertIds = useMemo(() => {
    const ids = new Set<number>();
    for (const a of structuredData.agreements) {
      for (const id of a.supporting_experts) ids.add(id);
    }
    for (const d of structuredData.disagreements) {
      for (const pos of d.positions) {
        for (const id of pos.experts) ids.add(id);
      }
    }
    // Also include any IDs from labels
    for (const idStr of Object.keys(resolvedExpertLabels)) {
      const id = Number(idStr);
      if (id > 0) ids.add(id);
    }
    return Array.from(ids).sort((a, b) => a - b);
  }, [structuredData, resolvedExpertLabels]);

  // Compute pairwise scores + details
  const { scores, details, maxMagnitude } = useMemo(() => {
    const rawScores: Record<string, number> = {};
    const cellDetails: Record<string, CellDetail> = {};

    // Initialize
    for (let i = 0; i < expertIds.length; i++) {
      for (let j = i + 1; j < expertIds.length; j++) {
        const key = pairKey(expertIds[i], expertIds[j]);
        rawScores[key] = 0;
        cellDetails[key] = { agreements: [], disagreements: [] };
      }
    }

    // Agreements: if both experts appear in the same agreement, +1
    for (const a of structuredData.agreements) {
      const experts = a.supporting_experts;
      for (let i = 0; i < experts.length; i++) {
        for (let j = i + 1; j < experts.length; j++) {
          const key = pairKey(experts[i], experts[j]);
          if (rawScores[key] !== undefined) {
            rawScores[key] += 1;
            cellDetails[key].agreements.push(a.claim);
          }
        }
      }
    }

    // Disagreements: if experts are on opposing sides, -1 per pair
    for (const d of structuredData.disagreements) {
      const positions = d.positions;
      // Compare experts across different positions
      for (let pi = 0; pi < positions.length; pi++) {
        for (let pj = pi + 1; pj < positions.length; pj++) {
          for (const eA of positions[pi].experts) {
            for (const eB of positions[pj].experts) {
              const key = pairKey(eA, eB);
              if (rawScores[key] !== undefined) {
                rawScores[key] -= 1;
                // Avoid duplicate topic entries
                if (!cellDetails[key].disagreements.includes(d.topic)) {
                  cellDetails[key].disagreements.push(d.topic);
                }
              }
            }
          }
        }
      }
    }

    // Normalize to [-1, +1]
    let max = 0;
    for (const val of Object.values(rawScores)) {
      const abs = Math.abs(val);
      if (abs > max) max = abs;
    }

    const normalizedScores: Record<string, number> = {};
    for (const [key, val] of Object.entries(rawScores)) {
      normalizedScores[key] = max > 0 ? val / max : 0;
    }

    return { scores: normalizedScores, details: cellDetails, maxMagnitude: max };
  }, [structuredData, expertIds]);

  // Don't render if less than 2 experts
  if (expertIds.length < 2) return null;

  function getCellColor(score: number): string {
    if (Math.abs(score) < 0.05) return 'var(--muted)';
    if (score > 0) {
      // Green gradient for agreement
      const alpha = Math.min(score * 0.7, 0.7);
      return `rgba(34, 197, 94, ${alpha})`;
    }
    // Red gradient for disagreement
    const alpha = Math.min(Math.abs(score) * 0.7, 0.7);
    return `rgba(239, 68, 68, ${alpha})`;
  }

  function getCellTextColor(score: number): string {
    if (Math.abs(score) < 0.05) return 'var(--muted-foreground)';
    if (Math.abs(score) > 0.5) return '#ffffff';
    return 'var(--foreground)';
  }

  function handleCellHover(
    e: React.MouseEvent,
    rowId: number,
    colId: number,
    score: number,
    cellDetail: CellDetail
  ) {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const containerRect = matrixRef.current?.getBoundingClientRect();
    if (!containerRect) return;

    setTooltip({
      x: rect.left - containerRect.left + rect.width / 2,
      y: rect.top - containerRect.top - 8,
      rowId,
      colId,
      score,
      details: cellDetail,
    });
  }

  function handleCellLeave() {
    setTooltip(null);
  }

  function formatScore(score: number): string {
    if (Math.abs(score) < 0.05) return '—';
    return score > 0 ? `+${score.toFixed(2)}` : score.toFixed(2);
  }

  return (
    <div className="cross-matrix fade-in" ref={matrixRef}>
      <div className="cross-matrix-title">
        <Link2 size={16} style={{ color: 'var(--accent)' }} />
        <span>Expert Agreement Matrix</span>
        <span className="cross-matrix-subtitle">
          Hover cells to see specific agreements & conflicts
        </span>
      </div>

      <div className="cross-matrix-scroll">
        <table className="cross-matrix-table">
          <thead>
            <tr>
              <th className="cross-matrix-corner" />
              {expertIds.map((id) => (
                <th key={id} className="cross-matrix-header cross-matrix-header-col">
                  <span
                    className={`expert-chip ${getDimensionClass(resolvedExpertLabels[id])}`}
                  >
                    {resolvedExpertLabels[id] || `E${id}`}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {expertIds.map((rowId) => (
              <tr key={rowId}>
                <td className="cross-matrix-header cross-matrix-header-row">
                  <span
                    className={`expert-chip ${getDimensionClass(resolvedExpertLabels[rowId])}`}
                  >
                    {resolvedExpertLabels[rowId] || `E${rowId}`}
                  </span>
                </td>
                {expertIds.map((colId) => {
                  if (rowId === colId) {
                    return (
                      <td key={colId} className="cross-matrix-cell cross-matrix-cell-diagonal">
                        <span className="cross-matrix-cell-value">●</span>
                      </td>
                    );
                  }

                  const key = pairKey(rowId, colId);
                  const score = scores[key] ?? 0;
                  const cellDetail = details[key] ?? { agreements: [], disagreements: [] };

                  return (
                    <td
                      key={colId}
                      className="cross-matrix-cell"
                      style={{
                        backgroundColor: getCellColor(score),
                        color: getCellTextColor(score),
                      }}
                      onMouseEnter={(e) => handleCellHover(e, rowId, colId, score, cellDetail)}
                      onMouseLeave={handleCellLeave}
                    >
                      <span className="cross-matrix-cell-value">
                        {formatScore(score)}
                      </span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="cross-matrix-legend">
        <div className="cross-matrix-legend-item">
          <span
            className="cross-matrix-legend-swatch"
            style={{ backgroundColor: 'rgba(239, 68, 68, 0.6)' }}
          />
          <span>Conflict</span>
        </div>
        <div className="cross-matrix-legend-item">
          <span
            className="cross-matrix-legend-swatch"
            style={{ backgroundColor: 'var(--muted)' }}
          />
          <span>Neutral</span>
        </div>
        <div className="cross-matrix-legend-item">
          <span
            className="cross-matrix-legend-swatch"
            style={{ backgroundColor: 'rgba(34, 197, 94, 0.6)' }}
          />
          <span>Agreement</span>
        </div>
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div
          ref={tooltipRef}
          className="cross-matrix-tooltip"
          style={{
            left: tooltip.x,
            top: tooltip.y,
          }}
        >
          <div className="cross-matrix-tooltip-header">
            <span className={`expert-chip ${getDimensionClass(resolvedExpertLabels[tooltip.rowId])}`}>
              {resolvedExpertLabels[tooltip.rowId] || `E${tooltip.rowId}`}
            </span>
            <span className="cross-matrix-tooltip-arrow">↔</span>
            <span className={`expert-chip ${getDimensionClass(resolvedExpertLabels[tooltip.colId])}`}>
              {resolvedExpertLabels[tooltip.colId] || `E${tooltip.colId}`}
            </span>
          </div>
          <div className="cross-matrix-tooltip-score" style={{
            color: tooltip.score > 0.05 ? 'var(--success)' :
                   tooltip.score < -0.05 ? 'var(--destructive)' :
                   'var(--muted-foreground)',
          }}>
            Score: {formatScore(tooltip.score)}
          </div>
          {tooltip.details.agreements.length > 0 && (
            <div className="cross-matrix-tooltip-section">
              <span className="cross-matrix-tooltip-label"><CheckCircle2 size={12} style={{ color: '#16a34a', display: 'inline', verticalAlign: 'text-bottom', marginRight: '4px' }} />Agreements:</span>
              {tooltip.details.agreements.map((a, i) => (
                <p key={i} className="cross-matrix-tooltip-item">{a}</p>
              ))}
            </div>
          )}
          {tooltip.details.disagreements.length > 0 && (
            <div className="cross-matrix-tooltip-section">
              <span className="cross-matrix-tooltip-label"><Zap size={12} style={{ color: '#eab308', display: 'inline', verticalAlign: 'text-bottom', marginRight: '4px' }} />Conflicts:</span>
              {tooltip.details.disagreements.map((d, i) => (
                <p key={i} className="cross-matrix-tooltip-item">{d}</p>
              ))}
            </div>
          )}
          {tooltip.details.agreements.length === 0 && tooltip.details.disagreements.length === 0 && (
            <p className="cross-matrix-tooltip-empty">No direct interactions found</p>
          )}
        </div>
      )}
    </div>
  );
});

export default CrossMatrix;
