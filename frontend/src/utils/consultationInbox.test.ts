import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {enhanceConsultationInbox} from './consultationInbox';
let row:HTMLElement,open:ReturnType<typeof vi.fn>,share:ReturnType<typeof vi.fn>;
beforeEach(()=>{
 document.body.innerHTML='<main><div class="rounded-2xl"><div class="font-semibold">Test consultation</div><div><a href="/admin/form/1/summary" title="Summary" aria-label="Summary Test consultation">Summary</a><button title="Share">Share</button><button title="Delete">Delete</button></div></div></main>';
 HTMLDialogElement.prototype.showModal=function(){this.setAttribute('open','');};
 HTMLDialogElement.prototype.close=function(){this.removeAttribute('open');this.dispatchEvent(new Event('close'));};
 open=vi.fn();share=vi.fn();document.querySelector('a')!.addEventListener('click',e=>{e.preventDefault();open();});
 document.querySelector('button')!.addEventListener('click',share);
 enhanceConsultationInbox(document.querySelector('main')!);row=document.querySelector('.inbox-row')!;
});
afterEach(()=>{vi.useRealTimers();document.body.innerHTML='';});
function pointer(type:string,x:number,y:number){const e=new Event(type,{bubbles:true});Object.assign(e,{clientX:x,clientY:y,pointerType:'touch'});row.dispatchEvent(e);}
it('opens the existing summary and exposes the same actions in an explicit menu',()=>{
 row.click();expect(open).toHaveBeenCalledOnce();
 (document.querySelector('.inbox-more') as HTMLElement).click();
 expect(document.querySelector('dialog[open]')).not.toBeNull();
 (Array.from(document.querySelectorAll('dialog button')).find(b=>b.textContent==='Share') as HTMLElement).click();
 expect(share).toHaveBeenCalledOnce();expect(document.querySelector('dialog')).toBeNull();
});
it('long press reveals actions without navigating; scrolling cancels it',()=>{
 vi.useFakeTimers();pointer('pointerdown',100,100);pointer('pointermove',100,130);vi.advanceTimersByTime(600);expect(document.querySelector('dialog')).toBeNull();
 pointer('pointerdown',100,100);vi.advanceTimersByTime(600);expect(document.querySelector('dialog[open]')).not.toBeNull();row.click();expect(open).not.toHaveBeenCalled();
});
it('a left swipe opens the menu without triggering an action',()=>{
 pointer('pointerdown',200,100);pointer('pointermove',120,104);pointer('pointerup',120,104);row.click();
 expect(document.querySelector('dialog[open]')).not.toBeNull();expect(open).not.toHaveBeenCalled();expect(share).not.toHaveBeenCalled();
});
