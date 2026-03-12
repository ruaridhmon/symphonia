export interface QuestionOptions {
  requireEvidence: boolean;
  requireConfidence: boolean;
}

export interface ConfigurableQuestion extends QuestionOptions {
  label: string;
}

/** Question type that accepts both strings and structured objects */
export type QuestionInput = string | Record<string, unknown>;

const DEFAULT_QUESTION_OPTIONS: QuestionOptions = {
  requireEvidence: true,
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

  return {
    requireEvidence:
      typeof obj.requireEvidence === 'boolean'
        ? obj.requireEvidence
        : DEFAULT_QUESTION_OPTIONS.requireEvidence,
    requireConfidence:
      typeof obj.requireConfidence === 'boolean'
        ? obj.requireConfidence
        : DEFAULT_QUESTION_OPTIONS.requireConfidence,
  };
}

export function normalizeQuestion(q: QuestionInput): ConfigurableQuestion {
  return {
    label: extractQuestionText(q),
    ...extractQuestionOptions(q),
  };
}
