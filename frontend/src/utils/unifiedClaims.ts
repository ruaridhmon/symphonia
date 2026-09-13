/** Presentation-only linking. Exact wording only; synthesis excerpts never become votes. */
export const claimText=(s:string)=>s.replace(/^\s*Claim\s+\d+:\s*/i,'').replace(/\s+/g,' ').trim();
const previous=new WeakMap<HTMLElement,{preview:HTMLElement;first:Element|null;signature:string}>();
let excerptId=0;
export function unifyClaims(main:HTMLElement){
 const preview=main.querySelector<HTMLElement>('.claim-evidence-preview');
 const card=preview?.closest<HTMLElement>('.card');
 if(!preview||!card)return;
 const progress=main.querySelector<HTMLElement>('#delphi-recorded-progress');
 const first=progress?.querySelector('.di-claim')||null;
 const signatureKey=(card.querySelector('.ProseMirror')?.innerHTML||preview.innerHTML)+String(preview.hidden)+(progress?.dataset.signature||'')+(progress?.dataset.filter||'')+Array.from(card.querySelectorAll<HTMLButtonElement>('button')).filter(b=>!b.closest('.unified-actions')).map(b=>b.textContent+String(b.disabled)).join('|');
 const last=previous.get(main);
 if(last?.preview===preview&&last.first===first&&last.signature===signatureKey)return;
 previous.set(main,{preview,first,signature:signatureKey});
 const source=Array.from(preview.querySelectorAll<HTMLElement>('.claim-evidence-claim'));
 const labels:string[]=JSON.parse(progress?.dataset.claimLabels||'[]');
 const matched=source.filter(c=>labels.filter(l=>l===claimText(c.querySelector('.claim-evidence-claim-heading strong')?.textContent||'')).length===1);
 const allMatched=source.length>0&&matched.length===source.length;
 const editing=preview.hidden;
 card.classList.toggle('unified-synthesis',allMatched);
 card.classList.toggle('unified-editing',editing);
 for(const item of source)item.classList.toggle('unified-matched',matched.includes(item));
 const carry=Array.from(card.querySelectorAll('p,div')).find(p=>!p.closest('.unified-actions')&&(p.textContent||'').length<350&&p.textContent?.includes('carried forward'))?.textContent||'';
 for(const target of progress?.querySelectorAll<HTMLElement>('.di-claim')||[]){
  const label=claimText(target.querySelector('h3')?.textContent||'');
  const candidates=matched.filter(c=>claimText(c.querySelector('.claim-evidence-claim-heading strong')?.textContent||'')===label);
  const existing=target.querySelector<HTMLElement>('.unified-excerpts');
  if(candidates.length!==1){existing?.remove();continue;}
  const groups=Array.from(candidates[0].querySelectorAll<HTMLElement>(':scope > details'));
  const signature=carry+groups.map(g=>g.innerHTML).join('');
  if(existing?.dataset.signature===signature)continue;
  const openKeys=new Set(existing?Array.from(existing.querySelectorAll<HTMLDetailsElement>('details[open]')).map(d=>d.dataset.key):JSON.parse(target.dataset.openExcerpts||'[]'));
  existing?.remove();
  target.classList.add('unified-claim-card');
  target.querySelector('.unified-claim-heading')?.remove();
  const detail=document.createElement('div');detail.className='unified-excerpts';detail.dataset.signature=signature;
  const note=document.createElement('p');note.className='unified-provenance';note.textContent=carry||'Original excerpts from the saved synthesis; counts above are recorded ratings.';if(carry)note.dataset.carried='true';detail.append(note);
  const controls=document.createElement('div');controls.className='unified-excerpt-controls';controls.setAttribute('role','group');controls.setAttribute('aria-label','Original excerpts');
  const caption=document.createElement('span');caption.className='unified-excerpt-label';caption.textContent='Excerpts';controls.append(caption);if(groups.length)detail.append(controls);
  groups.forEach((g,i)=>{
   const clone=g.cloneNode(true) as HTMLDetailsElement;
   clone.dataset.key=`${target.dataset.key}:excerpt:${i}`;clone.open=openKeys.has(clone.dataset.key);
   clone.removeAttribute('id');clone.querySelectorAll('[id]').forEach(n=>n.removeAttribute('id'));
   const summary=clone.querySelector('summary');
   if(summary){
    const label=summary.querySelector('span:not(.claim-evidence-count)');
    if(label)label.textContent=(label.textContent||'').replace(/original excerpts/i,'excerpts');
    for(const n of Array.from(summary.childNodes))if(n.nodeType===Node.TEXT_NODE)n.textContent=(n.textContent||'').replace(/original excerpts/i,'excerpts');
    const button=document.createElement('button');button.type='button';button.className='unified-excerpt-button';
    const name=summary.querySelector('span:not(.claim-evidence-count)')?.textContent||summary.textContent||'Original excerpts';
    const count=summary.querySelector('.claim-evidence-count')?.textContent;
    button.append(document.createTextNode(name.replace(/\s+(original\s+)?excerpts.*$/i,'').trim()));
    if(count){const n=document.createElement('span');n.textContent=count;n.className='unified-excerpt-total';button.append(n);}
    clone.id=`claim-excerpts-${++excerptId}`;button.id=`${clone.id}-control`;button.setAttribute('aria-controls',clone.id);button.setAttribute('aria-label',`${name}${count?' · '+count:''}`);clone.setAttribute('aria-labelledby',button.id);
    const sync=()=>button.setAttribute('aria-expanded',String(clone.open));sync();clone.addEventListener('toggle',sync);
    button.onclick=()=>{const open=!clone.open;detail.querySelectorAll<HTMLDetailsElement>('details').forEach(d=>{d.open=false;const control=controls.querySelector(`[aria-controls="${d.id}"]`);control?.setAttribute('aria-expanded','false');});clone.open=open;sync();};
    controls.append(button);summary.hidden=true;
   }
   detail.append(clone);
  });
  target.append(detail);
  target.querySelector('.di-reasons')?.remove();
 }
 // Retain all original editor/publishing handlers, accessed through a compact disclosure.
 const originals=Array.from(card.querySelectorAll<HTMLButtonElement>('button')).filter(b=>!b.closest('.unified-actions')&&/^(Hide from survey|Publish to survey|Save|Revert|Expand all|Collapse all|Edit synthesis text|Preview evidence)$/.test(b.textContent?.trim()||''));
 if(!originals.length)return;
 originals.forEach(b=>b.classList.add('unified-original-action'));
 let menu=main.querySelector<HTMLDetailsElement>('.unified-actions');
 if(!menu){menu=document.createElement('details');menu.className='unified-actions';const summary=document.createElement('summary');summary.textContent='Synthesis actions';menu.append(summary,document.createElement('div'));}
 const host=allMatched&&progress?progress.querySelector('.di-heading'):card.firstElementChild;
 if(host&&menu.parentElement!==host)host.append(menu);
 const status=Array.from(card.querySelectorAll('p,div')).filter(p=>!p.closest('.unified-actions')&&(p.textContent||'').length<350).map(p=>p.textContent||'').find(t=>t.includes('All changes saved')||t.includes('unsaved'))||'';
 const signature=originals.map(b=>`${b.textContent}:${b.disabled}`).join('|')+status;
 if(menu.dataset.signature!==signature){
  menu.dataset.signature=signature;const items=menu.lastElementChild!;items.replaceChildren();
  if(status){const note=document.createElement('p');note.textContent=status;items.append(note);}
  originals.filter(b=>!b.disabled||!['Save','Revert'].includes(b.textContent?.trim()||'')).forEach(original=>{
   const b=document.createElement('button');b.type='button';b.textContent=original.textContent;b.disabled=original.disabled;
   b.onclick=()=>{
    menu!.open=false;
    const label=original.textContent?.trim();
    if(label==='Expand all'||label==='Collapse all')progress?.querySelectorAll<HTMLDetailsElement>('.di-reasons,.unified-excerpts details').forEach(d=>d.open=label==='Expand all');
    original.click();
    if(label==='Edit synthesis text'){card.classList.add('unified-editing');card.scrollIntoView({block:'start'});}
   };items.append(b);
  });
 }
}
