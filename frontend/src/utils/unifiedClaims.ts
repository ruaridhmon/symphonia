/** Presentation-only linking. Exact wording only; synthesis excerpts never become votes. */
export const claimText=(s:string)=>s.replace(/^\s*Claim\s+\d+:\s*/i,'').replace(/\s+/g,' ').trim();
const previous=new WeakMap<HTMLElement,{preview:HTMLElement;first:Element|null;signature:string}>();
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
  existing?.remove();
  const detail=document.createElement('details');detail.className='unified-excerpts';detail.dataset.signature=signature;
  const title=document.createElement('summary');title.textContent='Synthesis excerpts';detail.append(title);
  const note=document.createElement('p');note.className='unified-provenance';note.textContent=carry||'From the saved synthesis. These excerpts are not additional ratings.';detail.append(note);
  groups.forEach(g=>{const clone=g.cloneNode(true) as HTMLDetailsElement;clone.open=false;clone.querySelectorAll('[id]').forEach(n=>n.removeAttribute('id'));detail.append(clone);});
  target.append(detail);
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
    if(label==='Expand all'||label==='Collapse all')progress?.querySelectorAll<HTMLDetailsElement>('.di-reasons,.unified-excerpts,.unified-excerpts details').forEach(d=>d.open=label==='Expand all');
    original.click();
    if(label==='Edit synthesis text'){card.classList.add('unified-editing');card.scrollIntoView({block:'start'});}
   };items.append(b);
  });
 }
}
