/** Remove only a complete platform guidance block, never excerpts within expert feedback. */
export function compactDelphiFeedback(text: string): string {
  const reminder = 'Review the previous round before re-rating.';
  const explanation = 'The previous-round summary contains the anonymised original excerpts. Consensus is not required: retain your view if the evidence still supports it.';
  const normalized = text.trim().replace(/\s+/g, ' ');
  for (const block of [`${reminder} ${explanation}`, explanation]) {
    if (normalized === block) return '';
    if (normalized.endsWith(` ${block}`)) {
      const counts = normalized.slice(0, -(block.length + 1));
      if (/^Previous round: \d+ (?:support|oppose|uncertain|not classified)(?: · \d+ (?:support|oppose|uncertain|not classified))*\.$/.test(counts)) return counts;
    }
  }
  return text;
}
