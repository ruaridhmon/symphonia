/** Inbox gestures reveal existing actions; they never perform destructive actions. */
export function enhanceConsultationInbox(main:HTMLElement){
 for(const link of main.querySelectorAll<HTMLAnchorElement>('a[href$="/summary"]')){
  const row=link.closest<HTMLElement>('tr')||link.closest<HTMLElement>('.rounded-2xl');
  if(!row||row.dataset.inboxBound)continue;
  row.dataset.inboxBound='true';row.classList.add('inbox-row');
  const mobile=row.tagName!=='TR';
  const title=row.querySelector<HTMLElement>(mobile?'.font-semibold':'td');
  const name=link.getAttribute('aria-label')?.replace(/^Summary\s*/,'')||'Consultation';
  const actions=link.parentElement!;actions.classList.add('inbox-original-actions');
  const more=document.createElement('button');more.type='button';more.className='inbox-more';more.textContent='•••';more.setAttribute('aria-label',`Actions for ${name}`);more.setAttribute('aria-haspopup','dialog');
  const open=()=>{
   if(document.querySelector('.inbox-sheet[open]'))return;
   const dialog=document.createElement('dialog');dialog.className='inbox-sheet';dialog.setAttribute('aria-label',`Actions for ${name}`);
   const heading=document.createElement('h2');heading.textContent=name;dialog.append(heading);
   for(const original of actions.querySelectorAll<HTMLElement>('a,button')){
    const button=document.createElement('button');button.type='button';button.textContent=original.title||original.textContent?.trim()||'Open';
    if(original.getAttribute('title')==='Delete')button.className='inbox-delete';
    button.disabled=original instanceof HTMLButtonElement&&original.disabled;
    button.onclick=()=>{dialog.close();original.click();};dialog.append(button);
   }
   const close=document.createElement('button');close.type='button';close.className='inbox-cancel';close.textContent='Cancel';close.onclick=()=>dialog.close();dialog.append(close);
   dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});
   dialog.addEventListener('close',()=>{dialog.remove();if(row.isConnected)more.focus();},{once:true});
   document.body.append(dialog);dialog.showModal();
  };
  more.onclick=open;
  if(mobile)row.append(more);else actions.after(more);
  if(title){title.tabIndex=0;title.setAttribute('role','link');title.setAttribute('aria-label',`Open ${name}`);title.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();link.click();}});}
  let startX=0,startY=0,active=false,suppressUntil=0,timer:ReturnType<typeof setTimeout>|undefined;
  const clear=()=>{clearTimeout(timer);timer=undefined;};
  row.addEventListener('pointerdown',e=>{
   if(e.pointerType==='mouse'||(e.target as Element).closest('a,button,input'))return;
   active=true;startX=e.clientX;startY=e.clientY;
   timer=setTimeout(()=>{active=false;suppressUntil=Date.now()+800;open();},550);
  });
  row.addEventListener('pointermove',e=>{
   if(!active)return;const dx=e.clientX-startX,dy=e.clientY-startY;
   if(Math.abs(dx)>10||Math.abs(dy)>10)clear();
   if(Math.abs(dy)>20){active=false;return;}
   if(dx < -65 && Math.abs(dy)<20){active=false;suppressUntil=Date.now()+800;open();}
  });
  row.addEventListener('pointerup',()=>{clear();active=false;});
  row.addEventListener('pointercancel',()=>{clear();active=false;});
  row.addEventListener('contextmenu',e=>{if(mobile){e.preventDefault();clear();active=false;suppressUntil=Date.now()+800;open();}});
  row.addEventListener('click',e=>{
   if((e.target as Element).closest('a,button,input'))return;
   if(Date.now()<suppressUntil){e.preventDefault();return;}
   if(window.getSelection()?.toString())return;
   link.click();
  });
 }
}
