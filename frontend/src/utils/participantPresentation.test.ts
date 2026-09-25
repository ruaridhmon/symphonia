import {afterEach,expect,it} from 'vitest';
import {enhanceParticipantPresentation} from './participantPresentation';
afterEach(()=>{document.body.replaceChildren();history.replaceState({},'','/');});
it('keeps full accessible claim labels while shortening visual progress and preserving controls',()=>{
 history.replaceState({},'','/form/7');document.body.innerHTML='<main><nav aria-label="Question sections"><button aria-current="step"><span>Claim 1: Original claim</span></button></nav><section aria-label="Claim 1: Original claim"><div data-question-key="q1"><label>Explain your position Optional</label><textarea>Original draft</textarea></div></section></main>';
 const main=document.querySelector('main')!;enhanceParticipantPresentation(main);enhanceParticipantPresentation(main);
 expect(main.querySelectorAll('.cw-question-heading')).toHaveLength(1);expect(main.querySelector('button')?.getAttribute('aria-label')).toBe('Claim 1: Original claim');expect(main.querySelector('textarea')?.value).toBe('Original draft');expect(main.querySelector('textarea')?.getAttribute('aria-label')).toBe('Explain your position');
});
