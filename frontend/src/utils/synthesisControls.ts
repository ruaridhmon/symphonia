// Keep native disclosure triggers in place; settings float below the toolbar.
const bound=new WeakSet<HTMLElement>();
let panelId=0;
export function enhanceSynthesisControls(main:HTMLElement){
 const toolbar=main.querySelector<HTMLElement>('aside[aria-label="Synthesis controls"]');if(!toolbar)return;
 for(const detail of toolbar.querySelectorAll<HTMLDetailsElement>(':scope > details.summary-disclosure')){
  if(bound.has(detail))continue;bound.add(detail);
  const trigger=detail.querySelector<HTMLElement>(':scope > summary');const panel=detail.querySelector<HTMLElement>(':scope > .card');if(!trigger||!panel)continue;
  panel.id ||= `synthesis-panel-${++panelId}`;trigger.setAttribute('aria-controls',panel.id);panel.setAttribute('role','region');panel.setAttribute('aria-label',trigger.querySelector('span')?.textContent||'Synthesis settings');
  const close=document.createElement('button');close.type='button';close.className='summary-panel-close';close.textContent='Close';close.setAttribute('aria-label',`Close ${panel.getAttribute('aria-label')?.toLowerCase()}`);close.onclick=()=>{detail.open=false;trigger.focus();};panel.prepend(close);
  const sync=()=>{trigger.setAttribute('aria-expanded',String(detail.open));if(detail.open)toolbar.querySelectorAll<HTMLDetailsElement>('details.summary-disclosure').forEach(other=>{if(other!==detail)other.open=false;});};
  detail.addEventListener('toggle',sync);sync();
 }
 if(bound.has(toolbar))return;bound.add(toolbar);
 toolbar.addEventListener('keydown',event=>{if(event.key!=='Escape')return;const open=toolbar.querySelector<HTMLDetailsElement>('details.summary-disclosure[open]');if(open){event.preventDefault();open.open=false;open.querySelector<HTMLElement>('summary')?.focus();}});
 // Pointer dismissal is scoped to this toolbar and removed when the view unmounts.
 const outside=(event:PointerEvent)=>{if(!toolbar.isConnected){document.removeEventListener('pointerdown',outside);return;}if(toolbar.contains(event.target as Node))return;toolbar.querySelectorAll<HTMLDetailsElement>('details.summary-disclosure[open]').forEach(d=>d.open=false);};
 document.addEventListener('pointerdown',outside);
}
