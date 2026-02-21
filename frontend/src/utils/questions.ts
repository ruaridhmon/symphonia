/**
 * Shared utility for extracting question text from question objects or strings.
 *
 * Questions from the API may be plain strings OR structured objects like:
 *   { id: "q1", type: "textarea", label: "What are the primary...", required: true }
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

/** Question type that accepts both strings and structured objects */
export type QuestionInput = string | Record<string, unknown>;
