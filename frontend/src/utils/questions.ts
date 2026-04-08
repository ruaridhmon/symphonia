export interface QuestionOptions {
  requireEvidence: boolean;
  requireCounterarguments: boolean;
  requireConfidence: boolean;
}

export interface ConfigurableQuestion extends QuestionOptions {
  label: string;
  fieldType?: 'short' | 'long' | null;
  rows?: number | null;
  placeholder?: string | null;
}

/** Question type that accepts both strings and structured objects */
export type QuestionInput = string | Record<string, unknown>;

const DEFAULT_QUESTION_OPTIONS: QuestionOptions = {
  requireEvidence: true,
  requireCounterarguments: true,
  requireConfidence: true,
};

/**
 * Shared utility for extracting question text from question objects or strings.
 *
 * Questions from the API may be plain strings OR structured objects like:
 *   { label: "What are the primary...", requireEvidence: false, requireConfidence: true }
 *
 * This helper normalises both shapes into a display string.
 */
export function extractQuestionText(q: unknown): string {
  if (typeof q === 'string') return q;
  if (q && typeof q === 'object') {
    const obj = q as Record<string, unknown>;
    return String(obj.text || obj.label || obj.question || '');
  }
  return '';
}

export function extractQuestionOptions(q: unknown): QuestionOptions {
  if (!q || typeof q !== 'object') {
    return DEFAULT_QUESTION_OPTIONS;
  }

  const obj = q as Record<string, unknown>;
  const requireEvidence =
    typeof obj.requireEvidence === 'boolean'
      ? obj.requireEvidence
      : DEFAULT_QUESTION_OPTIONS.requireEvidence;
  const requireConfidence =
    typeof obj.requireConfidence === 'boolean'
      ? obj.requireConfidence
      : DEFAULT_QUESTION_OPTIONS.requireConfidence;
  const requireCounterarguments =
    typeof obj.requireCounterarguments === 'boolean'
      ? obj.requireCounterarguments
      : !(!requireEvidence && !requireConfidence);

  return {
    requireEvidence,
    requireCounterarguments,
    requireConfidence,
  };
}

export function normalizeQuestion(q: QuestionInput): ConfigurableQuestion {
  const obj = q && typeof q === 'object' ? (q as Record<string, unknown>) : null;
  return {
    label: extractQuestionText(q),
    ...extractQuestionOptions(q),
    fieldType:
      obj && (obj.fieldType === 'short' || obj.fieldType === 'long')
        ? obj.fieldType
        : null,
    rows: obj && typeof obj.rows === 'number' ? obj.rows : null,
    placeholder: obj && typeof obj.placeholder === 'string' ? obj.placeholder : null,
  };
}

export function isSurveyQuestion(question: QuestionOptions): boolean {
  return (
    !question.requireEvidence &&
    !question.requireCounterarguments &&
    !question.requireConfidence
  );
}
