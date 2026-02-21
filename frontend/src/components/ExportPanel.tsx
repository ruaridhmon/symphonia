import { useState } from 'react';
import { saveAs } from 'file-saver';
import LoadingButton from './LoadingButton';

// ─── Types (mirrors StructuredSynthesis.tsx) ─────────────

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

interface Round {
  id: number;
  round_number: number;
  synthesis: string;
  synthesis_json?: any;
  is_active: boolean;
  questions: string[];
  convergence_score?: number | null;
  response_count?: number;
}

interface ExportPanelProps {
  formTitle: string;
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

function exportAsPdf(formTitle: string, markdownContent: string) {
  const htmlBody = markdownToSimpleHtml(markdownContent);
  const fullHtml = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<title>${formTitle} — Symphonia Export</title>
<style>
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    max-width: 800px;
    margin: 0 auto;
    padding: 40px 20px;
    color: #1a1a2e;
    line-height: 1.6;
  }
  h1 { font-size: 1.8em; border-bottom: 2px solid #6366f1; padding-bottom: 8px; margin-bottom: 16px; }
  h2 { font-size: 1.4em; color: #4338ca; margin-top: 28px; }
  h3 { font-size: 1.15em; color: #6366f1; margin-top: 20px; }
  hr { border: none; border-top: 1px solid #e2e8f0; margin: 24px 0; }
  ul { padding-left: 1.2em; }
  li { margin-bottom: 6px; }
  strong { color: #0f172a; }
  em { color: #475569; }
  @media print {
    body { padding: 0; }
    h1 { page-break-after: avoid; }
    h2, h3 { page-break-after: avoid; }
  }
</style>
</head>
<body>
${htmlBody}
</body>
</html>`;

  // Open in a new window and trigger print
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(fullHtml);
    printWindow.document.close();
    // Small delay to let styles load
    setTimeout(() => {
      printWindow.print();
    }, 400);
  }
}

// ─── Component ───────────────────────────────────────────

export default function ExportPanel({
  formTitle,
  rounds,
  structuredSynthesisData,
  expertLabels,
}: ExportPanelProps) {
  const [exportingMd, setExportingMd] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);

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
      const md = generateMarkdown(formTitle, rounds, structuredSynthesisData, expertLabels);
      exportAsPdf(formTitle, md);
    } finally {
      setTimeout(() => setExportingPdf(false), 800);
    }
  };

  return (
    <>
      <LoadingButton
        variant="secondary"
        size="md"
        onClick={handleExportMarkdown}
        loading={exportingMd}
        loadingText="Exporting…"
        className="w-full text-left justify-start"
      >
        Export as Markdown
      </LoadingButton>
      <LoadingButton
        variant="secondary"
        size="md"
        onClick={handleExportPdf}
        loading={exportingPdf}
        loadingText="Preparing PDF…"
        className="w-full text-left justify-start"
      >
        Export as PDF
      </LoadingButton>
    </>
  );
}
