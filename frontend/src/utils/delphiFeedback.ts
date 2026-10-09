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
  // Recognise the complete old generated scaffold; never strip instructions from expert excerpts.
  const legacy=text.match(/^([\s\S]*?)Round 2 positions: ([^\n]+?)\. (\d+) not answered; (\d+) unrecognised\.\s+(?:Separate confidence: ([^\n]+?)\. (\d+) not recorded\.|Separate confidence was not collected in this questionnaire\.)\s+Keep or revise your position and confidence after considering the panel\. Persistent disagreement is valid\.([\s\S]*)$/);
  if (!legacy || (legacy[1].trim() && !legacy[1].trim().startsWith('Inferred · unconfirmed. Not directly stated by an expert.'))) return text;
  const positive=(counts:string)=>counts.split(' · ').filter(item=>/^[1-9]\d* /.test(item));
  const positions=positive(legacy[2]);
  if(Number(legacy[3]))positions.push(`${legacy[3]} unanswered`);
  if(Number(legacy[4]))positions.push(`${legacy[4]} other response${legacy[4]==='1'?'':'s'}`);
  const confidence=legacy[5]?positive(legacy[5]).join(' · '):'';
  // Only omit an entire generated empty-reason ballot; quoted text and supplied reasons stay verbatim.
  const reasons=legacy[7].trim().split('\n').filter(line=>!/^Response \d+: [^\n]+; confidence: [^\n]+\. No justification supplied\.$/.test(line)).join('\n');
  return [legacy[1].trim(),positions.length?`Round 2: ${positions.join(' · ')}.`:'',confidence?`Confidence: ${confidence}.`:'',reasons].filter(Boolean).join('\n');
}
