// Keep native disclosure triggers in place; settings float below the toolbar.
const bound=new WeakSet<HTMLElement>();
let panelId=0;
const proxiedMenus=new WeakMap<HTMLElement,HTMLElement>();
export function enhanceSynthesisControls(main:HTMLElement){
 const toolbar=main.querySelector<HTMLElement>('aside[aria-label="Synthesis controls"]');if(!toolbar){main.querySelector('.summary-tools-only')?.remove();main.querySelector('.cw-summary-actions')?.remove();return;}
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
  const close=document.createElement('button');close.type='button';close.className='summary-panel-close';close.textContent='Close';close.setAttribute('aria-label',`Close ${panel.getAttribute('aria-label')?.toLowerCase()}`);close.onclick=()=>{detail.open=false;(main.querySelector<HTMLElement>('.summary-generate-empty')||main.querySelector<HTMLElement>('.cw-options>summary')||main.querySelector<HTMLElement>('.summary-actions-menu>summary')||trigger).focus();};panel.prepend(close);
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
  const generation=toolbar.querySelector<HTMLDetailsElement>('details.summary-disclosure');
  if(progress?.querySelector('.di-claim,.rf-workspace'))nav.querySelector('.summary-generate-empty')?.remove();
  if(generation&&!progress?.querySelector('.di-claim,.rf-workspace')&&!nav.querySelector('.summary-generate-empty')){
   const generate=document.createElement('button');generate.type='button';generate.className='summary-generate-empty';generate.textContent='Generate summary';
   const sync=()=>generate.setAttribute('aria-expanded',String(generation.open));
   generate.setAttribute('aria-controls',generation.querySelector('.card')?.id||'');sync();
   generate.onclick=()=>{generation.open=!generation.open;sync();};generation.addEventListener('toggle',sync);nav.append(generate);
  }
  let menu=nav.querySelector<HTMLDetailsElement>('.summary-actions-menu');
  if(!menu){
   menu=document.createElement('details');menu.className='summary-actions-menu';
   const trigger=document.createElement('summary');trigger.textContent='•••';trigger.setAttribute('aria-label','Summary actions');menu.append(trigger);
   const items=document.createElement('div');items.className='summary-actions-items';menu.append(items);nav.append(menu);

   for(const detail of toolbar.querySelectorAll<HTMLDetailsElement>(':scope > details.summary-disclosure')){
    const draft=detail.querySelector<HTMLButtonElement>('.synthesis-generate-footer button');
    if(draft){
     const generate=document.createElement('button');generate.type='button';generate.textContent='Generate draft';generate.dataset.draftAction='true';
     generate.onclick=()=>{menu!.open=false;detail.open=false;if(!draft.disabled)draft.click();};items.append(generate);
    }
    const action=document.createElement('button');action.type='button';action.textContent=detail.querySelector('summary span')?.textContent||'Summary settings';
    if(draft)action.textContent='Draft settings';
    action.onclick=()=>{menu!.open=false;toolbar.querySelectorAll<HTMLDetailsElement>('details.summary-disclosure').forEach(other=>other.open=other===detail?!detail.open:false);detail.querySelector<HTMLElement>('.card input,.card select,.summary-panel-close')?.focus();};items.append(action);
   }
   const refresh=toolbar.querySelector<HTMLButtonElement>('.summary-refresh');if(refresh){const action=document.createElement('button');action.type='button';action.textContent='Refresh';action.onclick=()=>{menu!.open=false;refresh.click();};items.append(action);}
   menu.addEventListener('keydown',event=>{if(event.key==='Escape'){menu!.open=false;trigger.focus();}});
   const dismiss=(event:PointerEvent)=>{if(!menu!.isConnected){document.removeEventListener('pointerdown',dismiss);return;}if(!menu!.contains(event.target as Node))menu!.open=false;};document.addEventListener('pointerdown',dismiss);
  }

  const top=main.querySelector<HTMLElement>('.cw-options>div');
  if(top){
   let group=top.querySelector<HTMLElement>('.cw-summary-actions');
   if(!group){group=document.createElement('div');group.className='cw-summary-actions';top.append(group);}
   const actions=[...menu.querySelectorAll<HTMLButtonElement>('.summary-actions-items>button')];
   const signature=actions.map(a=>a.textContent).join('|');
   if(group.dataset.signature!==signature||proxiedMenus.get(group)!==menu){proxiedMenus.set(group,menu);group.dataset.signature=signature;group.replaceChildren();for(const action of actions){const proxy=document.createElement('button');proxy.type='button';proxy.textContent=action.textContent;proxy.onclick=()=>{const options=top.closest<HTMLDetailsElement>('details');if(options)options.open=false;action.click();};group.append(proxy);}}
   menu.hidden=true;nav.querySelector<HTMLElement>('.summary-generate-empty')?.setAttribute('hidden','');
   const draft=toolbar.querySelector<HTMLButtonElement>('.synthesis-generate-footer button');
   for(const action of group.querySelectorAll<HTMLButtonElement>('button'))if(action.textContent==='Generate draft'||action.textContent==='Writing draft…'){
    const disabled=!!draft?.disabled,label=draft?.textContent==='Generating…'?'Writing draft…':'Generate draft';
    if(action.disabled!==disabled)action.disabled=disabled;if(action.textContent!==label)action.textContent=label;
   }
  }
 }else toolbar.classList.remove('summary-actions-panel');
 if(bound.has(toolbar))return;bound.add(toolbar);
 toolbar.addEventListener('keydown',event=>{if(event.key!=='Escape')return;const open=toolbar.querySelector<HTMLDetailsElement>('details.summary-disclosure[open]');if(open){event.preventDefault();open.open=false;(main.querySelector<HTMLElement>('.summary-generate-empty')||main.querySelector<HTMLElement>('.cw-options>summary')||main.querySelector<HTMLElement>('.summary-actions-menu>summary')||open.querySelector<HTMLElement>('summary'))?.focus();}});
 // Pointer dismissal is scoped to this toolbar and removed when the view unmounts.
 const outside=(event:PointerEvent)=>{if(!toolbar.isConnected){document.removeEventListener('pointerdown',outside);return;}if(toolbar.contains(event.target as Node)||(event.target as Element).closest('.summary-switch,.summary-tools-only'))return;toolbar.querySelectorAll<HTMLDetailsElement>('details.summary-disclosure[open]').forEach(d=>d.open=false);};
 document.addEventListener('pointerdown',outside);
}
