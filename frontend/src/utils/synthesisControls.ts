// Keep native disclosure triggers in place; settings float below the toolbar.
const bound=new WeakSet<HTMLElement>();
let panelId=0;
export function enhanceSynthesisControls(main:HTMLElement){
 const toolbar=main.querySelector<HTMLElement>('aside[aria-label="Synthesis controls"]');if(!toolbar){main.querySelector('.summary-tools-only')?.remove();return;}
 const progress=main.querySelector<HTMLElement>('#delphi-recorded-progress');
 for(const text of toolbar.querySelectorAll('summary span')){if(text.textContent?.trim()==='Generate synthesis')text.textContent='Generate summary';}
 if(progress){
  main.classList.add('summary-with-results');
  const refresh=progress.querySelector<HTMLButtonElement>('.di-title > button');
  if(refresh){toolbar.querySelector('.summary-refresh')?.remove();refresh.classList.add('summary-refresh');toolbar.append(refresh);}
  const actions=toolbar.querySelector('.unified-actions');if(actions&&actions!==toolbar.lastElementChild)toolbar.append(actions);
 }else{main.classList.remove('summary-with-results');toolbar.querySelector('.summary-refresh')?.remove();}
 for(const detail of toolbar.querySelectorAll<HTMLDetailsElement>(':scope > details.summary-disclosure')){
  if(bound.has(detail))continue;bound.add(detail);
  const trigger=detail.querySelector<HTMLElement>(':scope > summary');const panel=detail.querySelector<HTMLElement>(':scope > .card');if(!trigger||!panel)continue;
  panel.id ||= `synthesis-panel-${++panelId}`;trigger.setAttribute('aria-controls',panel.id);panel.setAttribute('role','region');panel.setAttribute('aria-label',trigger.querySelector('span')?.textContent||'Synthesis settings');
  const close=document.createElement('button');close.type='button';close.className='summary-panel-close';close.textContent='Close';close.setAttribute('aria-label',`Close ${panel.getAttribute('aria-label')?.toLowerCase()}`);close.onclick=()=>{detail.open=false;(main.querySelector<HTMLElement>('.summary-actions-menu>summary')||trigger).focus();};panel.prepend(close);
  const sync=()=>{trigger.setAttribute('aria-expanded',String(detail.open));if(detail.open)toolbar.querySelectorAll<HTMLDetailsElement>('details.summary-disclosure').forEach(other=>{if(other!==detail)other.open=false;});};
  detail.addEventListener('toggle',sync);sync();
 }
 let nav=main.querySelector<HTMLElement>('.summary-switch');
 if((!nav||nav.hidden)&&(progress||main.querySelector('.consultation-workspace'))){
  nav=main.querySelector<HTMLElement>('.summary-tools-only');
  if(!nav){nav=document.createElement('nav');nav.className='summary-tools-only';nav.setAttribute('aria-label','Summary actions');(progress||toolbar).before(nav);}
 }else main.querySelector('.summary-tools-only')?.remove();
 if(nav&&!nav.hidden){
  toolbar.classList.add('summary-actions-panel');
  if(main.querySelector('.di-claim'))nav.querySelector('.summary-generate-empty')?.remove();
  let menu=nav.querySelector<HTMLDetailsElement>('.summary-actions-menu');
  if(!menu){
   menu=document.createElement('details');menu.className='summary-actions-menu';
   const trigger=document.createElement('summary');trigger.textContent='•••';trigger.setAttribute('aria-label','Summary actions');menu.append(trigger);
   const items=document.createElement('div');items.className='summary-actions-items';menu.append(items);nav.append(menu);
   if(!main.querySelector('.di-claim')){const generate=document.createElement('button');generate.type='button';generate.className='summary-generate-empty';generate.textContent='Generate summary';generate.onclick=()=>{const detail=toolbar.querySelector<HTMLDetailsElement>('details.summary-disclosure');if(detail){detail.open=true;detail.querySelector<HTMLElement>('.summary-panel-close')?.focus();}};nav.prepend(generate);}
   for(const detail of toolbar.querySelectorAll<HTMLDetailsElement>(':scope > details.summary-disclosure')){
    const action=document.createElement('button');action.type='button';action.textContent=detail.querySelector('summary span')?.textContent||'Summary settings';
    action.onclick=()=>{menu!.open=false;toolbar.querySelectorAll<HTMLDetailsElement>('details.summary-disclosure').forEach(other=>other.open=other===detail);detail.querySelector<HTMLElement>('.card input,.card select,.summary-panel-close')?.focus();};items.append(action);
   }
   const refresh=toolbar.querySelector<HTMLButtonElement>('.summary-refresh');if(refresh){const action=document.createElement('button');action.type='button';action.textContent='Refresh';action.onclick=()=>{menu!.open=false;refresh.click();};items.append(action);}
   menu.addEventListener('keydown',event=>{if(event.key==='Escape'){menu!.open=false;trigger.focus();}});
   const dismiss=(event:PointerEvent)=>{if(!menu!.isConnected){document.removeEventListener('pointerdown',dismiss);return;}if(!menu!.contains(event.target as Node))menu!.open=false;};document.addEventListener('pointerdown',dismiss);
  }
 }else toolbar.classList.remove('summary-actions-panel');
 if(bound.has(toolbar))return;bound.add(toolbar);
 toolbar.addEventListener('keydown',event=>{if(event.key!=='Escape')return;const open=toolbar.querySelector<HTMLDetailsElement>('details.summary-disclosure[open]');if(open){event.preventDefault();open.open=false;(main.querySelector<HTMLElement>('.summary-actions-menu>summary')||open.querySelector<HTMLElement>('summary'))?.focus();}});
 // Pointer dismissal is scoped to this toolbar and removed when the view unmounts.
 const outside=(event:PointerEvent)=>{if(!toolbar.isConnected){document.removeEventListener('pointerdown',outside);return;}if(toolbar.contains(event.target as Node))return;toolbar.querySelectorAll<HTMLDetailsElement>('details.summary-disclosure[open]').forEach(d=>d.open=false);};
 document.addEventListener('pointerdown',outside);
}
