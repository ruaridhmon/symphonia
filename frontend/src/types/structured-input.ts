/** Structured expert response — the core differentiator of Symphonia. */
export interface StructuredResponse {
  /** The expert's core position / answer (required) */
  position: string;
  /** Supporting evidence, reasoning, data (required) */
  evidence: string;
  /** Confidence level 1–10 (required) */
  confidence: number;
  /** Why this confidence level? What would change it? */
  confidenceJustification: string;
  /** Best arguments against the stated position */
  counterarguments: string;
  /** Optional: cited sources */
  citations?: string[];
  /** Optional: other experts who should weigh in */
  expertNominations?: string[];
}

/** Default empty response */
export function emptyStructuredResponse(): StructuredResponse {
  return {
    position: '',
    evidence: '',
    confidence: 5,
    confidenceJustification: '',
    counterarguments: '',
    citations: [],
    expertNominations: [],
  };
}

/** Minimal validity — position is required at minimum */
export function isResponseValid(r: StructuredResponse): boolean {
  return r.position.trim().length > 0;
}

/** localStorage key for auto-save */
export function autoSaveKey(formId: string | number, questionIndex: number): string {
  return `symphonia-structured-${formId}-q${questionIndex}`;
}
