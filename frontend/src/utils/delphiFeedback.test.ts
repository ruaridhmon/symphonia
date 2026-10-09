import { expect, it } from 'vitest';
import { compactDelphiFeedback } from './delphiFeedback';
it('removes only repeated guidance, retaining counts and inferred feedback',()=>{
 const retained='Inferred · unconfirmed.\nPrevious round: 2 support · 1 oppose.';
 const instructions='Review the previous round before re-rating. The previous-round summary contains the anonymised original excerpts. Consensus is not required: retain your view if the evidence still supports it.';
 expect(compactDelphiFeedback(instructions)).toBe('');
 expect(compactDelphiFeedback(retained)).toBe(retained);
 expect(compactDelphiFeedback(`Previous round: 2 support · 1 oppose. ${instructions}`)).toBe('Previous round: 2 support · 1 oppose.');
 const original=`Round 2 positions: 1 disagree.\nResponse 1: ${instructions}`;
 expect(compactDelphiFeedback(original)).toBe(original);
 expect(compactDelphiFeedback('Round 2 positions: 1 disagree.\nResponse 1: A minority objection.')).toBe('Round 2 positions: 1 disagree.\nResponse 1: A minority objection.');
});

it('compacts the complete saved Round 3 scaffold without rewriting supplied expert text',()=>{
 const prefix='Round 2 positions: 0 agree · 0 neither agree nor disagree · 1 disagree. 0 not answered; 0 unrecognised.\nSeparate confidence: 0 not at all confident · 0 slightly confident · 0 moderately confident · 1 very confident · 0 extremely confident. 0 not recorded.\nKeep or revise your position and confidence after considering the panel. Persistent disagreement is valid.\n';
 expect(compactDelphiFeedback(prefix+'Response 1: Disagree; confidence: Very confident. No justification supplied.')).toBe('Round 2: 1 disagree.\nConfidence: 1 very confident.');
 const reason='Response 1: Disagree; confidence: Very confident. Persistent disagreement is valid. I disagree because the evidence is incomplete.';
 expect(compactDelphiFeedback(prefix+reason)).toContain(reason);
 expect(compactDelphiFeedback('Response 1: No justification supplied.')).toBe('Response 1: No justification supplied.');
});
