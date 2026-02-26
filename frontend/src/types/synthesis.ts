/**
 * Shared synthesis types — single source of truth for structured synthesis data.
 * Used by StructuredSynthesis, ExportPanel, SummaryPage, and other components.
 */

/* ── Evidence & Excerpts ── */

export interface EvidenceExcerpt {
  expert_id: number;
  expert_label: string;
  quote: string;
}

/* ── Agreements ── */

export interface Agreement {
  claim: string;
  supporting_experts: number[];
  confidence: number;
  evidence_summary: string;
  evidence_excerpts?: EvidenceExcerpt[];
}

/* ── Disagreements ── */

export interface DisagreementPosition {
  position: string;
  experts: number[];
  evidence: string;
}

export interface Disagreement {
  topic: string;
  positions: DisagreementPosition[];
  severity: string;
}

/* ── Nuances ── */

export interface Nuance {
  claim: string;
  context: string;
  relevant_experts: number[];
}

/* ── Follow-up Probes ── */

export interface Probe {
  question: string;
  target_experts: number[];
  rationale: string;
}

/* ── Emergent Insights ── */

export interface EmergentInsight {
  insight: string;
  contributing_experts: number[];
  emergence_type: 'cross-pollination' | 'synthesis' | 'implicit' | string;
  explanation: string;
  /** Legacy/alternative fields from different synthesis backends */
  title?: string;
  description?: string;
  supporting_evidence?: string;
}

/* ── Full Synthesis JSON Structure ── */

export interface SynthesisData {
  agreements: Agreement[];
  disagreements: Disagreement[];
  nuances: Nuance[];
  confidence_map: Record<string, number>;
  follow_up_probes: Probe[];
  meta_synthesis_reasoning: string;
  /** Simple/TTD modes may include these additional fields */
  narrative?: string;
  areas_of_agreement?: string[];
  areas_of_disagreement?: string[];
  uncertainties?: string[];
  emergent_insights?: EmergentInsight[];
}
