import {afterEach,expect,it,vi} from 'vitest';
import {quietSummary} from './quietSummary';
afterEach(()=>{document.body.innerHTML='';});
function fixture(){document.body.innerHTML='<main><section id="delphi-recorded-progress"><article class="di-claim">Recorded result</article></section><section class="card"><h2>Round 3 synthesis</h2><button>Hide from survey</button><div contenteditable="true">Original synthesis</div></section></main>';return document.querySelector('main')!;}
it('collapses duplicate prose while retaining the original editor and publication handler',()=>{
 const main=fixture(),card=main.querySelector<HTMLElement>('.card')!;
 const publish=main.querySelector<HTMLButtonElement>('.card button')!;const click=vi.fn();publish.onclick=click;
 const editor=main.querySelector('[contenteditable]');quietSummary(main);
 const toggle=main.querySelector<HTMLButtonElement>('.quiet-synthesis-toggle')!;
 expect(card.hidden).toBe(true);expect(toggle.textContent).toBe('Full summary · Published');
 toggle.click();expect(card.hidden).toBe(false);expect(toggle.getAttribute('aria-expanded')).toBe('true');
 expect(main.querySelector('[contenteditable]')).toBe(editor);publish.click();expect(click).toHaveBeenCalledOnce();
 quietSummary(main);expect(card.hidden).toBe(false);expect(main.querySelectorAll('.quiet-synthesis-toggle')).toHaveLength(1);
});
it('keeps the synthesis visible when it is the only result or an existing edit action opens it',()=>{
 const main=fixture(),card=main.querySelector<HTMLElement>('.card')!;quietSummary(main);
 card.classList.add('unified-editing');quietSummary(main);expect(card.hidden).toBe(false);
 main.querySelector('.di-claim')!.remove();quietSummary(main);expect(card.hidden).toBe(false);expect(main.querySelector<HTMLButtonElement>('.quiet-synthesis-toggle')!.hidden).toBe(true);
});
it('offers an optional summary editor before responses arrive',()=>{
 const main=fixture(),card=main.querySelector<HTMLElement>('.card')!;main.querySelector('.di-claim')!.remove();main.querySelector<HTMLElement>('#delphi-recorded-progress')!.dataset.empty='true';quietSummary(main);
 expect(card.hidden).toBe(true);const button=main.querySelector<HTMLButtonElement>('.quiet-synthesis-toggle')!;expect(button.textContent).toBe('Write a summary');button.click();expect(card.hidden).toBe(false);
});
