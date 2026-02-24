import { useState } from 'react';
import { FileText, FileJson, FileType2, FileDown, BarChart3 } from 'lucide-react';
import { saveAs } from 'file-saver';
import LoadingButton from './LoadingButton';
import { exportSynthesisFromBackend } from '../api/synthesis';
import type { SynthesisData } from '../types/synthesis';
import type { Round } from '../types/summary';

interface ExportPanelProps {
  formTitle: string;
  formId: number;
  rounds: Round[];
  structuredSynthesisData: SynthesisData | null;
  expertLabels: Record<number, string>;
}

// ─── Helpers ─────────────────────────────────────────────

function expertName(id: number, labels: Record<number, string>): string {
  return labels[id] || `Expert ${id}`;
}

function expertList(ids: number[], labels: Record<number, string>): string {
  return ids.map(id => expertName(id, labels)).join(', ');
}

function severityMarker(severity: string): string {
  switch (severity?.toLowerCase()) {
    case 'high': return '[HIGH]';
    case 'medium': return '[MED]';
    case 'low': return '[LOW]';
    default: return '[—]';
  }
}

// ─── Markdown generation ─────────────────────────────────

function generateMarkdown(
  formTitle: string,
  rounds: Round[],
  data: SynthesisData | null,
  labels: Record<number, string>,
): string {
  const lines: string[] = [];
  const now = new Date().toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric',
  });

  // Header
  lines.push(`# ${formTitle}`);
  lines.push('');
  lines.push(`**Exported:** ${now}  `);
  lines.push(`**Rounds:** ${rounds.length}`);
  lines.push('');
  lines.push('---');
  lines.push('');

  // Rounds
  for (const round of rounds) {
    lines.push(`## Round ${round.round_number}`);
    lines.push('');

    if (round.convergence_score != null) {
      lines.push(`**Convergence Score:** ${(round.convergence_score * 100).toFixed(0)}%`);
      lines.push('');
    }
    if (round.response_count != null) {
      lines.push(`**Responses:** ${round.response_count}`);
      lines.push('');
    }

    if (round.questions.length > 0) {
      lines.push('### Questions');
      lines.push('');
      round.questions.forEach((q, i) => {
        lines.push(`${i + 1}. ${q}`);
      });
      lines.push('');
    }

    if (round.synthesis) {
      lines.push('### Narrative Synthesis');
      lines.push('');
      lines.push(round.synthesis);
      lines.push('');
    }

    lines.push('---');
    lines.push('');
  }

  // Structured analysis
  if (data) {
    lines.push('## Structured Analysis');
    lines.push('');

    // Narrative (top-level)
    if (data.narrative) {
      lines.push('### Narrative');
      lines.push('');
      lines.push(data.narrative);
      lines.push('');
    }

    // Agreements
    if (data.agreements?.length) {
      lines.push('### Agreements');
      lines.push('');
      for (const a of data.agreements) {
        const conf = (a.confidence * 100).toFixed(0);
        lines.push(`- **${a.claim}** (${conf}% confidence)`);
        lines.push(`  - Supporting experts: ${expertList(a.supporting_experts, labels)}`);
        if (a.evidence_summary) {
          lines.push(`  - Evidence: ${a.evidence_summary}`);
        }
        if (a.evidence_excerpts?.length) {
          lines.push(`  - **Supporting Excerpts:**`);
          for (const ex of a.evidence_excerpts) {
            const label = labels[ex.expert_id] || ex.expert_label || `Expert ${ex.expert_id}`;
            lines.push(`    - _${label}_: "${ex.quote}"`);
          }
        }
      }
      lines.push('');
    }

    // Disagreements
    if (data.disagreements?.length) {
      lines.push('### Disagreements');
      lines.push('');
      for (const d of data.disagreements) {
        lines.push(`- **${d.topic}** ${severityMarker(d.severity)} Severity: ${d.severity}`);
        for (const pos of d.positions) {
          lines.push(`  - *${pos.position}*`);
          lines.push(`    - Experts: ${expertList(pos.experts, labels)}`);
          if (pos.evidence) {
            lines.push(`    - Evidence: ${pos.evidence}`);
          }
        }
      }
      lines.push('');
    }

    // Nuances
    if (data.nuances?.length) {
      lines.push('### Nuances');
      lines.push('');
      for (const n of data.nuances) {
        lines.push(`- **${n.claim}**`);
        lines.push(`  - Context: ${n.context}`);
        lines.push(`  - Relevant experts: ${expertList(n.relevant_experts, labels)}`);
      }
      lines.push('');
    }

    // Follow-up Probes
    if (data.follow_up_probes?.length) {
      lines.push('### Follow-up Probes');
      lines.push('');
      for (const p of data.follow_up_probes) {
        lines.push(`- **${p.question}**`);
        lines.push(`  - Target experts: ${expertList(p.target_experts, labels)}`);
        if (p.rationale) {
          lines.push(`  - Rationale: ${p.rationale}`);
        }
      }
      lines.push('');
    }

    // Expert Labels
    if (Object.keys(labels).length > 0) {
      lines.push('### Expert Dimensions');
      lines.push('');
      for (const [id, label] of Object.entries(labels)) {
        lines.push(`- Expert ${id}: **${label}**`);
      }
      lines.push('');
    }

    // Emergent Insights
    if (data.emergent_insights?.length) {
      lines.push('### Emergent Insights');
      lines.push('');
      for (const insight of data.emergent_insights) {
        if (typeof insight === 'string') {
          lines.push(`- ${insight}`);
        } else if (insight.title || insight.description) {
          lines.push(`- **${insight.title || 'Insight'}**: ${insight.description || ''}`);
          if (insight.supporting_evidence) {
            lines.push(`  - Evidence: ${insight.supporting_evidence}`);
          }
        } else {
          lines.push(`- ${JSON.stringify(insight)}`);
        }
      }
      lines.push('');
    }

    // Confidence Map
    if (data.confidence_map && Object.keys(data.confidence_map).length > 0) {
      lines.push('### Confidence Map');
      lines.push('');
      for (const [topic, score] of Object.entries(data.confidence_map)) {
        lines.push(`- ${topic}: ${(score * 100).toFixed(0)}%`);
      }
      lines.push('');
    }

    // Meta-synthesis reasoning
    if (data.meta_synthesis_reasoning) {
      lines.push('### Meta-Synthesis Reasoning');
      lines.push('');
      lines.push(data.meta_synthesis_reasoning);
      lines.push('');
    }
  }

  lines.push('---');
  lines.push(`*Generated by Symphonia*`);

  return lines.join('\n');
}

// ─── HTML generation for PDF ─────────────────────────────

function markdownToSimpleHtml(md: string): string {
  // Minimal markdown→HTML for print. Handles headers, bold, italic, lists, hr.
  let html = md
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Headers
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');

  // Bold + italic combos
  html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

  // Horizontal rules
  html = html.replace(/^---$/gm, '<hr/>');

  // List items — nested (4 spaces or 2+ spaces)
  html = html.replace(/^    - (.+)$/gm, '<li style="margin-left:2em">$1</li>');
  html = html.replace(/^  - (.+)$/gm, '<li style="margin-left:1em">$1</li>');
  html = html.replace(/^- (.+)$/gm, '<li>$1</li>');

  // Numbered lists
  html = html.replace(/^\d+\. (.+)$/gm, '<li>$1</li>');

  // Wrap consecutive <li> in <ul>
  html = html.replace(/((?:<li[^>]*>.*<\/li>\n?)+)/g, '<ul>$1</ul>');

  // Line breaks for remaining lines (but not inside tags)
  html = html.replace(/\n{2,}/g, '\n<br/><br/>\n');

  return html;
}

function exportAsPdf(
  formTitle: string,
  rounds: Round[],
  data: SynthesisData | null,
  labels: Record<number, string>,
) {
  // Use the full GOV.UK-styled HTML (all structured data, agreements, disagreements,
  // confidence scores, expert panel) — far richer than plain markdown conversion.
  // Adds an @media print tweak to auto-trigger browser print dialog.
  const html = generateGovUkReport(formTitle, rounds, data, labels);
  // Inject a print-trigger script just before </body>
  const printHtml = html.replace(
    '</body>',
    `<script>window.addEventListener('load', function() { setTimeout(function() { window.print(); }, 600); });</script></body>`,
  );
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(printHtml);
    printWindow.document.close();
  } else {
    // Popup blocked — fall back to blob download of the HTML
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const filename = `${formTitle.replace(/[^a-zA-Z0-9]+/g, '-').toLowerCase()}-report.html`;
    saveAs(blob, filename);
  }
}

// ─── GOV.UK Report HTML ──────────────────────────────────

function generateGovUkReport(
  formTitle: string,
  rounds: Round[],
  data: SynthesisData | null,
  labels: Record<number, string>,
): string {
  const now = new Date().toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric',
  });
  const totalResponses = rounds.reduce((sum, r) => sum + (r.response_count ?? 0), 0);
  const totalExperts = Object.keys(labels).length;
  const latestConvergence = rounds
    .filter(r => r.convergence_score != null)
    .map(r => r.convergence_score!)
    .pop();

  // Build agreements HTML
  let agreementsHtml = '';
  if (data?.agreements?.length) {
    agreementsHtml = data.agreements.map(a => {
      const conf = (a.confidence * 100).toFixed(0);
      const experts = a.supporting_experts.map(id => labels[id] || `Expert ${id}`).join(', ');
      let excerptHtml = '';
      if (a.evidence_excerpts?.length) {
        excerptHtml = `<div class="evidence-box"><p class="evidence-title">Supporting Evidence</p>` +
          a.evidence_excerpts.map(ex => {
            const label = labels[ex.expert_id] || ex.expert_label || `Expert ${ex.expert_id}`;
            return `<blockquote>&ldquo;${escHtml(ex.quote)}&rdquo;<br/><cite>&mdash; ${escHtml(label)}</cite></blockquote>`;
          }).join('') + '</div>';
      }
      return `<div class="finding-card agreement">
        <div class="finding-header"><span class="finding-type">Area of Agreement</span><span class="confidence-badge">${conf}% confidence</span></div>
        <h4>${escHtml(a.claim)}</h4>
        <p class="experts-line">Supported by: ${escHtml(experts)}</p>
        ${a.evidence_summary ? `<p>${escHtml(a.evidence_summary)}</p>` : ''}
        ${excerptHtml}
      </div>`;
    }).join('\n');
  }

  // Build disagreements HTML
  let disagreementsHtml = '';
  if (data?.disagreements?.length) {
    disagreementsHtml = data.disagreements.map(d => {
      const sev = d.severity?.toLowerCase() || 'medium';
      const positionsHtml = d.positions.map(pos => {
        const experts = pos.experts.map(id => labels[id] || `Expert ${id}`).join(', ');
        return `<div class="position-block">
          <p class="position-text">${escHtml(pos.position)}</p>
          <p class="experts-line">Held by: ${escHtml(experts)}</p>
          ${pos.evidence ? `<p class="evidence-text">${escHtml(pos.evidence)}</p>` : ''}
        </div>`;
      }).join('');
      return `<div class="finding-card disagreement severity-${sev}">
        <div class="finding-header"><span class="finding-type">Area of Disagreement</span><span class="severity-badge severity-${sev}">${sev.toUpperCase()}</span></div>
        <h4>${escHtml(d.topic)}</h4>
        ${positionsHtml}
      </div>`;
    }).join('\n');
  }

  // Build nuances HTML
  let nuancesHtml = '';
  if (data?.nuances?.length) {
    nuancesHtml = data.nuances.map(n => {
      const experts = n.relevant_experts.map(id => labels[id] || `Expert ${id}`).join(', ');
      return `<div class="finding-card nuance">
        <div class="finding-header"><span class="finding-type">Nuance</span></div>
        <h4>${escHtml(n.claim)}</h4>
        <p>${escHtml(n.context)}</p>
        <p class="experts-line">Relevant experts: ${escHtml(experts)}</p>
      </div>`;
    }).join('\n');
  }

  // Build follow-up probes HTML
  let probesHtml = '';
  if (data?.follow_up_probes?.length) {
    probesHtml = '<ol class="probes-list">' + data.follow_up_probes.map(p => {
      const experts = p.target_experts.map(id => labels[id] || `Expert ${id}`).join(', ');
      return `<li>
        <strong>${escHtml(p.question)}</strong>
        <br/><span class="experts-line">Target: ${escHtml(experts)}</span>
        ${p.rationale ? `<br/><span class="rationale">${escHtml(p.rationale)}</span>` : ''}
      </li>`;
    }).join('') + '</ol>';
  }

  // Build rounds summary table
  const roundsTableRows = rounds.map(r => {
    const conv = r.convergence_score != null ? `${(r.convergence_score * 100).toFixed(0)}%` : '—';
    return `<tr><td>Round ${r.round_number}</td><td>${r.response_count ?? '—'}</td><td>${conv}</td><td>${r.questions.length}</td></tr>`;
  }).join('');

  // Build emergent insights
  let insightsHtml = '';
  if (data?.emergent_insights?.length) {
    insightsHtml = data.emergent_insights.map(insight => {
      if (typeof insight === 'string') {
        return `<li>${escHtml(insight)}</li>`;
      }
      return `<li><strong>${escHtml(insight.title || 'Insight')}:</strong> ${escHtml(insight.description || '')}${
        insight.supporting_evidence ? `<br/><em>Evidence: ${escHtml(insight.supporting_evidence)}</em>` : ''
      }</li>`;
    }).join('');
    insightsHtml = `<ul class="insights-list">${insightsHtml}</ul>`;
  }

  // Confidence map
  let confidenceHtml = '';
  if (data?.confidence_map && Object.keys(data.confidence_map).length > 0) {
    confidenceHtml = Object.entries(data.confidence_map).map(([topic, score]) => {
      const pct = (score * 100).toFixed(0);
      return `<div class="confidence-bar-row">
        <span class="confidence-topic">${escHtml(topic)}</span>
        <div class="confidence-bar-track"><div class="confidence-bar-fill" style="width:${pct}%"></div></div>
        <span class="confidence-pct">${pct}%</span>
      </div>`;
    }).join('');
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>${escHtml(formTitle)} — Expert Consultation Report</title>
<style>
  /* GOV.UK-inspired design system */
  :root {
    --govuk-black: #0b0c0c;
    --govuk-blue: #1d70b8;
    --govuk-dark-blue: #003078;
    --govuk-green: #00703c;
    --govuk-red: #d4351c;
    --govuk-yellow: #ffdd00;
    --govuk-light-grey: #f3f2f1;
    --govuk-mid-grey: #b1b4b6;
    --govuk-dark-grey: #505a5f;
    --govuk-white: #ffffff;
    --govuk-border: #b1b4b6;
    --govuk-link: #1d70b8;
    --govuk-focus: #ffdd00;
  }

  * { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    font-family: "GDS Transport", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    font-size: 19px;
    line-height: 1.47368;
    color: var(--govuk-black);
    background: var(--govuk-white);
    -webkit-font-smoothing: antialiased;
  }

  /* Header bar */
  .govuk-header {
    background: var(--govuk-black);
    border-bottom: 10px solid var(--govuk-blue);
    padding: 10px 0;
  }
  .govuk-header__container {
    max-width: 960px;
    margin: 0 auto;
    padding: 0 30px;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .govuk-header__title {
    color: var(--govuk-white);
    font-size: 24px;
    font-weight: 700;
    letter-spacing: -0.02em;
  }
  .govuk-header__badge {
    color: var(--govuk-white);
    font-size: 14px;
    opacity: 0.8;
  }

  /* Phase banner */
  .govuk-phase-banner {
    max-width: 960px;
    margin: 0 auto;
    padding: 10px 30px;
    border-bottom: 1px solid var(--govuk-border);
  }
  .govuk-phase-banner__tag {
    display: inline-block;
    background: var(--govuk-blue);
    color: var(--govuk-white);
    font-size: 14px;
    font-weight: 700;
    padding: 2px 8px;
    text-transform: uppercase;
    letter-spacing: 1px;
    margin-right: 8px;
  }
  .govuk-phase-banner__text {
    font-size: 16px;
    color: var(--govuk-dark-grey);
  }

  /* Main content */
  .govuk-width-container {
    max-width: 960px;
    margin: 0 auto;
    padding: 0 30px;
  }
  .govuk-main-wrapper {
    padding: 40px 0 80px;
  }

  /* Typography */
  .govuk-heading-xl {
    font-size: 48px;
    line-height: 1.04167;
    font-weight: 700;
    margin-bottom: 30px;
    color: var(--govuk-black);
  }
  .govuk-heading-l {
    font-size: 36px;
    line-height: 1.11111;
    font-weight: 700;
    margin-top: 50px;
    margin-bottom: 20px;
    color: var(--govuk-black);
  }
  .govuk-heading-m {
    font-size: 24px;
    line-height: 1.25;
    font-weight: 700;
    margin-top: 30px;
    margin-bottom: 15px;
    color: var(--govuk-black);
  }
  .govuk-heading-s {
    font-size: 19px;
    line-height: 1.31579;
    font-weight: 700;
    margin-top: 20px;
    margin-bottom: 10px;
  }
  .govuk-body { margin-bottom: 20px; }
  .govuk-body-s { font-size: 16px; color: var(--govuk-dark-grey); }
  .govuk-body-l { font-size: 24px; line-height: 1.25; }

  /* Section break */
  .govuk-section-break {
    border: 0;
    border-bottom: 1px solid var(--govuk-border);
    margin: 30px 0;
  }
  .govuk-section-break--xl { margin: 50px 0; border-bottom-width: 4px; }
  .govuk-section-break--visible { border-color: var(--govuk-border); }

  /* Summary list (metadata) */
  .govuk-summary-list {
    margin-bottom: 30px;
  }
  .govuk-summary-list__row {
    display: flex;
    border-bottom: 1px solid var(--govuk-border);
    padding: 10px 0;
  }
  .govuk-summary-list__key {
    flex: 0 0 200px;
    font-weight: 700;
    padding-right: 20px;
  }
  .govuk-summary-list__value {
    flex: 1;
  }

  /* Tags */
  .govuk-tag {
    display: inline-block;
    padding: 2px 8px;
    font-size: 14px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 1px;
    color: var(--govuk-white);
    background: var(--govuk-blue);
  }
  .govuk-tag--green { background: var(--govuk-green); }
  .govuk-tag--red { background: var(--govuk-red); }
  .govuk-tag--yellow { background: #594d00; color: var(--govuk-yellow); }

  /* Table */
  .govuk-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
  .govuk-table__header, .govuk-table__cell {
    padding: 10px 20px 10px 0;
    border-bottom: 1px solid var(--govuk-border);
    text-align: left;
    vertical-align: top;
  }
  .govuk-table__header { font-weight: 700; }

  /* Inset text (for quotes/evidence) */
  .govuk-inset-text {
    border-left: 10px solid var(--govuk-mid-grey);
    padding: 15px;
    margin: 20px 0;
    clear: both;
  }

  /* Panel (summary box) */
  .govuk-panel {
    background: var(--govuk-green);
    color: var(--govuk-white);
    padding: 35px;
    text-align: center;
    margin-bottom: 30px;
  }
  .govuk-panel__title {
    font-size: 48px;
    font-weight: 700;
    line-height: 1;
    margin-bottom: 15px;
  }
  .govuk-panel__body {
    font-size: 36px;
    line-height: 1.25;
  }

  /* Warning text */
  .govuk-warning-text {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    padding: 15px 0;
    margin-bottom: 20px;
  }
  .govuk-warning-text__icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 35px;
    height: 35px;
    border-radius: 50%;
    background: var(--govuk-black);
    color: var(--govuk-white);
    font-weight: 700;
    font-size: 24px;
    flex-shrink: 0;
  }
  .govuk-warning-text__text { font-weight: 700; }

  /* Custom findings cards */
  .finding-card {
    border: 1px solid var(--govuk-border);
    border-left: 5px solid var(--govuk-blue);
    padding: 20px;
    margin-bottom: 20px;
    background: var(--govuk-white);
  }
  .finding-card.agreement { border-left-color: var(--govuk-green); }
  .finding-card.disagreement { border-left-color: var(--govuk-red); }
  .finding-card.nuance { border-left-color: #f47738; }
  .finding-card.severity-high { border-left-color: var(--govuk-red); }
  .finding-card.severity-medium { border-left-color: #f47738; }
  .finding-card.severity-low { border-left-color: var(--govuk-blue); }

  .finding-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 10px;
  }
  .finding-type { font-size: 14px; text-transform: uppercase; letter-spacing: 1px; color: var(--govuk-dark-grey); font-weight: 700; }
  .finding-card h4 { font-size: 19px; margin-bottom: 10px; }
  .experts-line { font-size: 16px; color: var(--govuk-dark-grey); margin-bottom: 8px; }
  .evidence-text { font-size: 16px; color: var(--govuk-dark-grey); font-style: italic; }

  .confidence-badge {
    display: inline-block;
    padding: 2px 8px;
    font-size: 14px;
    font-weight: 700;
    background: var(--govuk-light-grey);
    border: 1px solid var(--govuk-border);
  }
  .severity-badge {
    display: inline-block;
    padding: 2px 8px;
    font-size: 14px;
    font-weight: 700;
    color: var(--govuk-white);
  }
  .severity-badge.severity-high { background: var(--govuk-red); }
  .severity-badge.severity-medium { background: #f47738; }
  .severity-badge.severity-low { background: var(--govuk-blue); }

  .evidence-box {
    background: var(--govuk-light-grey);
    padding: 15px;
    margin-top: 10px;
  }
  .evidence-box .evidence-title { font-weight: 700; font-size: 16px; margin-bottom: 10px; }
  .evidence-box blockquote {
    border-left: 4px solid var(--govuk-mid-grey);
    padding: 8px 15px;
    margin: 8px 0;
    font-style: italic;
    font-size: 16px;
  }
  .evidence-box cite { font-style: normal; font-size: 14px; color: var(--govuk-dark-grey); }

  .position-block {
    border-left: 3px solid var(--govuk-mid-grey);
    padding-left: 15px;
    margin: 10px 0;
  }
  .position-text { font-weight: 700; margin-bottom: 5px; }

  /* Confidence bars */
  .confidence-bar-row {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 8px;
  }
  .confidence-topic { flex: 0 0 200px; font-size: 16px; }
  .confidence-bar-track {
    flex: 1;
    height: 20px;
    background: var(--govuk-light-grey);
    border: 1px solid var(--govuk-border);
  }
  .confidence-bar-fill {
    height: 100%;
    background: var(--govuk-blue);
    transition: width 0.3s;
  }
  .confidence-pct { flex: 0 0 40px; text-align: right; font-size: 16px; font-weight: 700; }

  /* Probes */
  .probes-list li { margin-bottom: 15px; }
  .rationale { font-size: 16px; color: var(--govuk-dark-grey); font-style: italic; }

  /* Insights */
  .insights-list li { margin-bottom: 10px; }

  /* Footer */
  .govuk-footer {
    border-top: 1px solid var(--govuk-border);
    background: var(--govuk-light-grey);
    padding: 30px 0;
    margin-top: 60px;
  }
  .govuk-footer__meta {
    max-width: 960px;
    margin: 0 auto;
    padding: 0 30px;
    font-size: 16px;
    color: var(--govuk-dark-grey);
  }

  /* Print styles */
  @media print {
    body { font-size: 12pt; }
    .govuk-header { border-bottom-width: 4px; }
    .govuk-heading-xl { font-size: 28pt; }
    .govuk-heading-l { font-size: 20pt; }
    .govuk-heading-m { font-size: 16pt; }
    .govuk-panel { background: var(--govuk-white) !important; color: var(--govuk-black) !important; border: 3px solid var(--govuk-black); }
    .govuk-panel__title, .govuk-panel__body { color: var(--govuk-black) !important; }
    .finding-card { break-inside: avoid; }
    .govuk-heading-l, .govuk-heading-m { break-after: avoid; }
    .no-print { display: none !important; }
  }
</style>
</head>
<body>

<!-- Header -->
<header class="govuk-header" role="banner">
  <div class="govuk-header__container">
    <span class="govuk-header__title">Symphonia</span>
    <span class="govuk-header__badge">Expert Consultation Report</span>
  </div>
</header>

<!-- Phase banner -->
<div class="govuk-phase-banner">
  <span class="govuk-phase-banner__tag">Report</span>
  <span class="govuk-phase-banner__text">This report was generated from a structured Delphi consultation on ${escHtml(now)}.</span>
</div>

<div class="govuk-width-container">
<main class="govuk-main-wrapper" role="main">

  <h1 class="govuk-heading-xl">${escHtml(formTitle)}</h1>

  <!-- Document metadata -->
  <div class="govuk-summary-list">
    <div class="govuk-summary-list__row">
      <dt class="govuk-summary-list__key">Date</dt>
      <dd class="govuk-summary-list__value">${escHtml(now)}</dd>
    </div>
    <div class="govuk-summary-list__row">
      <dt class="govuk-summary-list__key">Rounds completed</dt>
      <dd class="govuk-summary-list__value">${rounds.length}</dd>
    </div>
    <div class="govuk-summary-list__row">
      <dt class="govuk-summary-list__key">Total responses</dt>
      <dd class="govuk-summary-list__value">${totalResponses}</dd>
    </div>
    <div class="govuk-summary-list__row">
      <dt class="govuk-summary-list__key">Experts consulted</dt>
      <dd class="govuk-summary-list__value">${totalExperts}</dd>
    </div>
    ${latestConvergence != null ? `<div class="govuk-summary-list__row">
      <dt class="govuk-summary-list__key">Final convergence</dt>
      <dd class="govuk-summary-list__value">${(latestConvergence * 100).toFixed(0)}%</dd>
    </div>` : ''}
  </div>

  <hr class="govuk-section-break govuk-section-break--xl govuk-section-break--visible" />

  <!-- Executive Summary -->
  <h2 class="govuk-heading-l">1. Executive Summary</h2>
  ${data?.narrative
    ? `<p class="govuk-body govuk-body-l">${escHtml(data.narrative)}</p>`
    : `<p class="govuk-body">No structured synthesis narrative available. See individual round summaries below.</p>`
  }

  ${data?.meta_synthesis_reasoning ? `
  <div class="govuk-inset-text">
    <p class="govuk-body-s"><strong>Methodology note:</strong> ${escHtml(data.meta_synthesis_reasoning)}</p>
  </div>` : ''}

  <hr class="govuk-section-break govuk-section-break--xl govuk-section-break--visible" />

  <!-- Consultation Rounds -->
  <h2 class="govuk-heading-l">2. Consultation Rounds</h2>

  <table class="govuk-table">
    <thead>
      <tr>
        <th class="govuk-table__header">Round</th>
        <th class="govuk-table__header">Responses</th>
        <th class="govuk-table__header">Convergence</th>
        <th class="govuk-table__header">Questions</th>
      </tr>
    </thead>
    <tbody>${roundsTableRows}</tbody>
  </table>

  ${rounds.map(r => `
  <h3 class="govuk-heading-m">Round ${r.round_number}</h3>
  ${r.questions.length > 0 ? `
  <h4 class="govuk-heading-s">Questions posed</h4>
  <ol class="govuk-body">${r.questions.map(q => `<li style="margin-bottom:8px">${escHtml(q)}</li>`).join('')}</ol>` : ''}
  ${r.synthesis ? `
  <h4 class="govuk-heading-s">Round synthesis</h4>
  <div class="govuk-inset-text"><p class="govuk-body">${escHtml(r.synthesis)}</p></div>` : ''}
  `).join('\n')}

  ${(agreementsHtml || disagreementsHtml || nuancesHtml) ? `
  <hr class="govuk-section-break govuk-section-break--xl govuk-section-break--visible" />

  <!-- Findings -->
  <h2 class="govuk-heading-l">3. Key Findings</h2>

  ${agreementsHtml ? `
  <h3 class="govuk-heading-m">3.1 Areas of Agreement</h3>
  ${agreementsHtml}` : ''}

  ${disagreementsHtml ? `
  <h3 class="govuk-heading-m">3.2 Areas of Disagreement</h3>
  <div class="govuk-warning-text">
    <span class="govuk-warning-text__icon" aria-hidden="true">!</span>
    <strong class="govuk-warning-text__text">The following areas show divergent expert opinion. These may require further consultation rounds or policy consideration of multiple approaches.</strong>
  </div>
  ${disagreementsHtml}` : ''}

  ${nuancesHtml ? `
  <h3 class="govuk-heading-m">3.3 Nuances and Qualifications</h3>
  ${nuancesHtml}` : ''}
  ` : ''}

  ${confidenceHtml ? `
  <hr class="govuk-section-break govuk-section-break--xl govuk-section-break--visible" />
  <h2 class="govuk-heading-l">4. Confidence Assessment</h2>
  <p class="govuk-body">Confidence levels across key topics, based on expert agreement and evidence quality:</p>
  ${confidenceHtml}` : ''}

  ${insightsHtml ? `
  <hr class="govuk-section-break govuk-section-break--xl govuk-section-break--visible" />
  <h2 class="govuk-heading-l">${confidenceHtml ? '5' : '4'}. Emergent Insights</h2>
  <p class="govuk-body">Cross-cutting themes and unexpected findings that emerged from the consultation:</p>
  ${insightsHtml}` : ''}

  ${probesHtml ? `
  <hr class="govuk-section-break govuk-section-break--xl govuk-section-break--visible" />
  <h2 class="govuk-heading-l">Annex A: Recommended Follow-up Questions</h2>
  <p class="govuk-body">The following questions are recommended for subsequent consultation rounds:</p>
  ${probesHtml}` : ''}

  ${totalExperts > 0 ? `
  <hr class="govuk-section-break govuk-section-break--xl govuk-section-break--visible" />
  <h2 class="govuk-heading-l">Annex B: Expert Panel</h2>
  <table class="govuk-table">
    <thead><tr><th class="govuk-table__header">ID</th><th class="govuk-table__header">Expertise Dimension</th></tr></thead>
    <tbody>${Object.entries(labels).map(([id, label]) =>
      `<tr><td class="govuk-table__cell">Expert ${escHtml(id)}</td><td class="govuk-table__cell">${escHtml(label)}</td></tr>`
    ).join('')}</tbody>
  </table>` : ''}

</main>
</div>

<footer class="govuk-footer" role="contentinfo">
  <div class="govuk-footer__meta">
    <p>This report was generated by <strong>Symphonia</strong> &mdash; a structured expert consultation platform using the Delphi method.</p>
    <p>Report generated: ${escHtml(now)}. All expert contributions are anonymised.</p>
  </div>
</footer>

</body>
</html>`;
}

function escHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function exportAsGovUkReport(
  formTitle: string,
  rounds: Round[],
  data: SynthesisData | null,
  labels: Record<number, string>,
) {
  const html = generateGovUkReport(formTitle, rounds, data, labels);
  // Use blob download — window.open popups are blocked in most browsers
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const filename = `${formTitle.replace(/[^a-zA-Z0-9]+/g, '-').toLowerCase()}-govuk-report.html`;
  saveAs(blob, filename);
}

// ─── Component ───────────────────────────────────────────

export default function ExportPanel({
  formTitle,
  formId,
  rounds,
  structuredSynthesisData,
  expertLabels,
}: ExportPanelProps) {
  const [exportingMd, setExportingMd] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [exportingGovUk, setExportingGovUk] = useState(false);
  const [exportingBackendMd, setExportingBackendMd] = useState(false);
  const [exportingBackendJson, setExportingBackendJson] = useState(false);
  const [exportingBackendPdf, setExportingBackendPdf] = useState(false);

  const handleExportMarkdown = () => {
    setExportingMd(true);
    try {
      const md = generateMarkdown(formTitle, rounds, structuredSynthesisData, expertLabels);
      const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
      const filename = `${formTitle.replace(/[^a-zA-Z0-9]+/g, '-').toLowerCase()}-synthesis.md`;
      saveAs(blob, filename);
    } finally {
      setTimeout(() => setExportingMd(false), 500);
    }
  };

  const handleExportPdf = () => {
    setExportingPdf(true);
    try {
      exportAsPdf(formTitle, rounds, structuredSynthesisData, expertLabels);
    } finally {
      setTimeout(() => setExportingPdf(false), 800);
    }
  };

  const handleExportGovUk = () => {
    setExportingGovUk(true);
    try {
      exportAsGovUkReport(formTitle, rounds, structuredSynthesisData, expertLabels);
    } finally {
      setTimeout(() => setExportingGovUk(false), 800);
    }
  };

  const handleBackendExport = async (format: 'markdown' | 'json' | 'pdf', setLoading: (v: boolean) => void) => {
    setLoading(true);
    try {
      const { blob, filename } = await exportSynthesisFromBackend(formId, format);
      saveAs(blob, filename);
    } catch (err) {
      console.error('Backend export failed:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* ── Export Synthesis ─────────────────────────── */}
      <div style={{
        borderTop: '1px solid var(--border)',
        paddingTop: '0.75rem',
        marginTop: '0.25rem',
      }}>
        <p className="text-xs font-semibold uppercase tracking-wider mb-2"
          style={{ color: 'var(--muted-foreground)' }}>
          Export Synthesis
        </p>
        <div className="flex flex-col gap-1.5">
          <LoadingButton
            variant="secondary"
            size="sm"
            onClick={() => handleBackendExport('markdown', setExportingBackendMd)}
            loading={exportingBackendMd}
            loadingText="Downloading…"
            className="w-full text-left justify-start gap-2 whitespace-nowrap"
          >
            <FileText size={14} style={{ flexShrink: 0, opacity: 0.7 }} />
            Download as Markdown
          </LoadingButton>
          <LoadingButton
            variant="secondary"
            size="sm"
            onClick={() => handleBackendExport('json', setExportingBackendJson)}
            loading={exportingBackendJson}
            loadingText="Downloading…"
            className="w-full text-left justify-start gap-2 whitespace-nowrap"
          >
            <FileJson size={14} style={{ flexShrink: 0, opacity: 0.7 }} />
            Download as JSON
          </LoadingButton>
          <LoadingButton
            variant="secondary"
            size="sm"
            onClick={() => handleBackendExport('pdf', setExportingBackendPdf)}
            loading={exportingBackendPdf}
            loadingText="Downloading…"
            className="w-full text-left justify-start gap-2 whitespace-nowrap"
          >
            <FileDown size={14} style={{ flexShrink: 0, opacity: 0.7 }} />
            Download as PDF
          </LoadingButton>
        </div>
      </div>

      {/* ── Client Reports ───────────────────────────── */}
      <div style={{
        borderTop: '1px solid var(--border)',
        paddingTop: '0.75rem',
        marginTop: '0.25rem',
      }}>
        <p className="text-xs font-semibold uppercase tracking-wider mb-2"
          style={{ color: 'var(--muted-foreground)' }}>
          Client Reports
        </p>
        <div className="flex flex-col gap-1.5">
          <LoadingButton
            variant="secondary"
            size="sm"
            onClick={handleExportMarkdown}
            loading={exportingMd}
            loadingText="Exporting…"
            className="w-full text-left justify-start gap-2 whitespace-nowrap"
          >
            <FileText size={14} style={{ flexShrink: 0, opacity: 0.7 }} />
            Export as Markdown
          </LoadingButton>
          <LoadingButton
            variant="secondary"
            size="sm"
            onClick={handleExportPdf}
            loading={exportingPdf}
            loadingText="Preparing PDF…"
            className="w-full text-left justify-start gap-2 whitespace-nowrap"
          >
            <FileType2 size={14} style={{ flexShrink: 0, opacity: 0.7 }} />
            Export as PDF
          </LoadingButton>
          <LoadingButton
            variant="secondary"
            size="sm"
            onClick={handleExportGovUk}
            loading={exportingGovUk}
            loadingText="Generating…"
            className="w-full text-left justify-start gap-2 whitespace-nowrap"
          >
            <BarChart3 size={14} style={{ flexShrink: 0, opacity: 0.7 }} />
            Export GOV.UK Report
          </LoadingButton>
        </div>
      </div>
    </>
  );
}
