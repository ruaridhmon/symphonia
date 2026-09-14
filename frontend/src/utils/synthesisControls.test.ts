import {afterEach,expect,it} from 'vitest';
import {enhanceSynthesisControls} from './synthesisControls';
afterEach(()=>{document.body.innerHTML='';});
it('keeps triggers in place and closes settings on Escape or outside interaction',()=>{
 document.body.innerHTML='<main><aside aria-label="Synthesis controls"><details class="summary-disclosure"><summary><span>Generate synthesis</span></summary><div class="card"><input value="Existing instruction"></div></details><details class="summary-disclosure"><summary><span>Version history</span></summary><div class="card"><button>Version 1</button></div></details></aside><p>Claims</p></main>';
 const main=document.querySelector('main')!;const details=Array.from(main.querySelectorAll('details'));const trigger=details[0].querySelector('summary')!;const parent=trigger.parentElement;
 enhanceSynthesisControls(main);enhanceSynthesisControls(main);expect(main.querySelectorAll('.summary-panel-close')).toHaveLength(2);
 details[0].open=true;details[0].dispatchEvent(new Event('toggle'));expect(trigger.getAttribute('aria-expanded')).toBe('true');expect(trigger.parentElement).toBe(parent);expect(main.querySelector('input')!.value).toBe('Existing instruction');
 details[1].open=true;details[1].dispatchEvent(new Event('toggle'));expect(details[0].open).toBe(false);
 details[1].dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));expect(details[1].open).toBe(false);expect(document.activeElement).toBe(details[1].querySelector('summary'));
 details[0].open=true;document.querySelector('p')!.dispatchEvent(new Event('pointerdown',{bubbles:true}));expect(details[0].open).toBe(false);
});
it('groups result actions without replacing the refresh handler',()=>{
 document.body.innerHTML='<main><aside aria-label="Synthesis controls"></aside><section id="delphi-recorded-progress"><div class="di-title"><h2>Where views stand</h2><button>Refresh</button></div></section></main>';
 const main=document.querySelector('main')!;const refresh=main.querySelector('button')!;let count=0;refresh.onclick=()=>count++;
 enhanceSynthesisControls(main);enhanceSynthesisControls(main);
 expect(main.querySelectorAll('.summary-refresh')).toHaveLength(1);
 expect(refresh.parentElement?.tagName).toBe('ASIDE');refresh.click();expect(count).toBe(1);
});
