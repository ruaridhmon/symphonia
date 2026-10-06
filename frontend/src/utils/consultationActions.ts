/** Personal navigation preferences; shared titles are saved through the authenticated API. */
const pinKey=()=>`symphonia:pins:${localStorage.getItem('email')||'anonymous'}`;
export function pinnedConsultations():number[]{try {const value=JSON.parse(localStorage.getItem(pinKey())||'[]');return Array.isArray(value)?value.filter(v=>Number.isSafeInteger(v)&&v>0):[];}catch{return [];}}
export function toggleConsultationPin(id:number){const pins=pinnedConsultations();const next=pins.includes(id)?pins.filter(n=>n!==id):[id,...pins];localStorage.setItem(pinKey(),JSON.stringify(next));document.dispatchEvent(new CustomEvent('symphonia:consultations-changed',{detail:{pinned:true}}));return next.includes(id);}
async function client(){if(document.querySelector('script[src*="index-HJquNmhn.js"],script[src*="index-workspace-v1.js"]')){const path='/assets/index-HJquNmhn.js';return (await import(/* @vite-ignore */ path)).b;}return (await import('../api/client')).api;}
export function renameConsultation(id:number,title:string,trigger?:HTMLElement|null){
 const prefix=title.match(/^(?:SIMULATED PANEL\s*[—–-]|Simulated example\s*·)\s*/i)?.[0]||'';
 const dialog=document.createElement('dialog');dialog.className='consultation-rename';dialog.setAttribute('aria-labelledby','rename-consultation-title');
 const form=document.createElement('form');const heading=document.createElement('h2');heading.id='rename-consultation-title';heading.textContent='Rename consultation';
 const label=document.createElement('label');label.textContent='Name';const input=document.createElement('input');input.name='title';input.required=true;input.maxLength=240-prefix.length;input.value=title.slice(prefix.length);label.append(input);
 const error=document.createElement('p');error.className='rename-error';error.setAttribute('role','alert');const actions=document.createElement('div');actions.className='rename-actions';
 const cancel=document.createElement('button');cancel.type='button';cancel.textContent='Cancel';const save=document.createElement('button');save.type='submit';save.textContent='Save';actions.append(cancel,save);form.append(heading,label,error,actions);dialog.append(form);document.body.append(dialog);
 let busy=false;const close=()=>{if(busy)return;dialog.close();};cancel.onclick=close;dialog.addEventListener('cancel',e=>{if(busy)e.preventDefault();});dialog.addEventListener('close',()=>{dialog.remove();trigger?.focus();});
 form.onsubmit=async e=>{e.preventDefault();const next=input.value.trim();if(!next){error.textContent='Enter a name.';input.focus();return;}busy=true;save.disabled=true;cancel.disabled=true;input.disabled=true;save.textContent='Saving…';error.textContent='';
 try{await (await client()).patch(`/forms/${id}/title`,{title:prefix+next,expected_title:title});document.dispatchEvent(new CustomEvent('symphonia:consultations-changed',{detail:{id,title:prefix+next}}));busy=false;dialog.close();}
 catch(err){error.textContent=err instanceof Error?err.message:'Could not rename. Please try again.';busy=false;save.disabled=false;cancel.disabled=false;input.disabled=false;save.textContent='Save';}};
 dialog.showModal();input.focus();input.select();return dialog;
}
