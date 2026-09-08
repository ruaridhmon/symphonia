import {afterEach,expect,it,vi} from 'vitest';
import {unifyClaims} from './unifiedClaims';
afterEach(()=>document.body.innerHTML='');
function setup(label='Exact claim'){
 document.body.innerHTML='<main><section id="delphi-recorded-progress"><div class="di-heading"></div><article class="di-claim"><h3>Exact claim</h3></article></section><section class="card"><div><h2>Synthesis</h2><button>Hide from survey</button><button disabled>Save</button></div><p>All changes saved. Visible on survey.</p><div class="claim-evidence-toolbar"><button>Edit synthesis text</button></div><section class="claim-evidence-preview"><article class="claim-evidence-claim"><div class="claim-evidence-claim-heading"><strong></strong></div><details><summary>Supporting excerpts</summary><blockquote>Original words unchanged.</blockquote></details></article></section></section></main>';
 document.querySelector('strong')!.textContent=label;(document.querySelector('#delphi-recorded-progress') as HTMLElement).dataset.claimLabels=JSON.stringify(['Exact claim']);
 return document.querySelector('main')!;
}
it('combines exact claim evidence while preserving the original and publishing handler',()=>{
 const main=setup();const publish=vi.fn();main.querySelector('button')!.onclick=publish;
 unifyClaims(main);unifyClaims(main);
 expect(main.querySelectorAll('.unified-excerpts')).toHaveLength(1);
 expect(main.querySelector('.unified-excerpts blockquote')!.textContent).toBe('Original words unchanged.');
 expect(main.querySelector('.claim-evidence-preview blockquote')!.textContent).toBe('Original words unchanged.');
 expect(main.querySelector('.card')!.classList.contains('unified-synthesis')).toBe(true);
 (Array.from(main.querySelectorAll('.unified-actions button')).find(b=>b.textContent==='Hide from survey') as HTMLElement).click();expect(publish).toHaveBeenCalledOnce();
});
it('does not join different wording or hide unmatched synthesis claims',()=>{
 const main=setup('A different claim');unifyClaims(main);
 expect(main.querySelector('.unified-excerpts')).toBeNull();expect(main.querySelector('.unified-synthesis')).toBeNull();
});
it('retains synthesis access when a rating filter hides its matching card',()=>{
 const main=setup();main.querySelector('.di-claim')!.remove();unifyClaims(main);
 expect(main.querySelector('.unified-actions')).not.toBeNull();expect(main.querySelector('.unified-excerpts')).toBeNull();
});
