import { expect, it } from 'vitest';
import { compactDelphiFeedback } from './delphiFeedback';
it('removes only repeated guidance, retaining counts and inferred feedback',()=>{
 const retained='Inferred · unconfirmed.\nPrevious round: 2 support · 1 oppose.';
 const instructions='Review the previous round before re-rating. The previous-round summary contains the anonymised original excerpts. Consensus is not required: retain your view if the evidence still supports it.';
 expect(compactDelphiFeedback(instructions)).toBe('');
 expect(compactDelphiFeedback(`${retained}\n${instructions}`)).toBe(retained);
 expect(compactDelphiFeedback('Round 2 positions: 1 disagree.\nResponse 1: A minority objection.')).toBe('Round 2 positions: 1 disagree.\nResponse 1: A minority objection.');
});
