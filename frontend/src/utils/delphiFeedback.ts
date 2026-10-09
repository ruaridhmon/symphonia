/** Remove only the platform's repeated guidance; retain recorded and inferred feedback. */
export function compactDelphiFeedback(text: string): string {
  return [
    'Review the previous round before re-rating.',
    'The previous-round summary contains the anonymised original excerpts.',
    'Consensus is not required: retain your view if the evidence still supports it.',
  ].reduce((value, sentence) => value.split(sentence).join(''), text)
    .replace(/[ \t]{2,}/g, ' ').trim();
}
