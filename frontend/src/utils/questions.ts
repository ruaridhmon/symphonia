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

/**
 * Extract a displayable string from a response answer value.
 *
 * Answers may be:
 *   - Legacy plain strings  → returned as-is
 *   - StructuredResponse objects  → extract `.position` as the primary text
 *     (the expert's core answer), falling back to a JSON dump for debugging
 *
 * This prevents `[object Object]` rendering wherever answer values are
 * interpolated as text.
 */
export function extractAnswerText(answer: unknown): string {
  if (!answer && answer !== 0) return '';
  if (typeof answer === 'string') return answer;
  if (typeof answer === 'object') {
    const obj = answer as Record<string, unknown>;
    // StructuredResponse shape — prefer position (the core answer)
    if (typeof obj.position === 'string' && obj.position.trim()) return obj.position;
    // Fallback: any plausible text field
    const fallback = obj.text ?? obj.answer ?? obj.content;
    if (typeof fallback === 'string') return fallback;
    // Last resort: stringify so we at least see something useful
    return JSON.stringify(answer);
  }
  return String(answer);
}
