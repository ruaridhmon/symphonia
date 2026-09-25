/** Keep the original editor and publication handlers intact behind one disclosure. */
const states=new WeakMap<HTMLElement,{button:HTMLButtonElement;claims:HTMLButtonElement;nav:HTMLElement;open:boolean;round:string}>();
let id=0;
export function quietSummary(main:HTMLElement){
 for(const stale of main.querySelectorAll<HTMLButtonElement>('.quiet-synthesis-toggle')){
  if(!document.getElementById(stale.getAttribute('aria-controls')||''))stale.closest('.summary-switch')?.remove();
 }
 const heading=Array.from(main.querySelectorAll('h2')).find(n=>/^(Round \d+ synthesis|Synthesis for Round \d+)$/.test(n.textContent?.trim()||''));
 const card=heading?.closest<HTMLElement>('.card');if(!card){main.querySelector('.opening-claims')?.remove();return;}
 card.classList.add('full-summary-surface');
 card.id ||= `full-synthesis-${++id}`;
 let progress=main.querySelector<HTMLElement>('#delphi-recorded-progress');
 for(const stale of main.querySelectorAll<HTMLElement>('.opening-claims')){
  if(stale.dataset.owner!==card.id||!/^Round 1 synthesis$|^Synthesis for Round 1$/.test(heading!.textContent||''))stale.remove();
 }
 if(/^Round 1 synthesis$|^Synthesis for Round 1$/.test(heading!.textContent||'')){
  // Only explicit numbered claims in saved prose become candidate rows; never infer votes.
  const claims=Array.from(card.querySelectorAll<HTMLElement>('.ProseMirror p,.ProseMirror h3,.claim-evidence-claim-heading'))
   .map(n=>(n.textContent||'').trim()).filter(text=>/^Claim\s+\d+:\s*\S/i.test(text));
  const unique=[...new Set(claims.map(text=>text.replace(/^Claim\s+\d+:\s*/i,'')))];
  if(unique.length){
   let opening=main.querySelector<HTMLElement>('.opening-claims');
   if(!opening){opening=document.createElement('section');opening.className='delphi-insights opening-claims';opening.dataset.owner=card.id;(progress||card).before(opening);}
   const signature=JSON.stringify(unique);
   if(opening.dataset.signature!==signature){
    opening.dataset.signature=signature;opening.replaceChildren();
    const note=document.createElement('p');note.className='di-change-overview';note.textContent='Claims from the opening round · not yet rated';opening.append(note);
    const table=document.createElement('div');table.className='di-claims';opening.append(table);
    const columns=document.createElement('div');columns.className='di-column-head';for(const text of ['Claim','Status']){const cell=document.createElement('span');cell.textContent=text;columns.append(cell);}table.append(columns);
    unique.forEach((text,index)=>{const row=document.createElement('article');row.className='di-claim';const copy=document.createElement('div');copy.className='di-claim-copy';const number=document.createElement('span');number.className='di-claim-number';number.textContent=String(index+1).padStart(2,'0');const title=document.createElement('h3');title.textContent=text;copy.append(number,title);const status=document.createElement('div');status.className='di-rating opening-status';status.textContent='Not rated';row.append(copy,status);table.append(row);});
   }
   if(progress)progress.hidden=true;progress=opening;
  }else main.querySelector('.opening-claims')?.remove();
 }
 const hasResults=!!progress?.querySelector('.di-claim');
 const empty=progress?.dataset.empty==='true';

 let state=states.get(card);
 if(!hasResults&&!empty){if(state){card.hidden=false;state.nav.hidden=true;if(progress)progress.hidden=false;}return;}
 const round=heading!.textContent||'';
 if(!state){
  const button=document.createElement('button');button.type='button';button.className='quiet-synthesis-toggle';card.id ||= `full-synthesis-${++id}`;button.setAttribute('aria-controls',card.id);
  const nav=document.createElement('nav');nav.className='summary-switch';nav.setAttribute('aria-label','Summary view');const claims=document.createElement('button');claims.type='button';claims.textContent=hasResults?'Claims':'Overview';nav.append(claims,button);state={button,claims,nav,open:false,round};states.set(card,state);(progress||card).before(nav);claims.onclick=()=>{state!.open=false;sync();};
  button.onclick=()=>{const current=states.get(card)!;current.open=true;sync();};
 }
 if(state.round!==round){state.round=round;state.open=false;}
 // Existing edit actions must remain usable, including editing initiated elsewhere.
 if(card.classList.contains('unified-editing'))state.open=true;
 const current=state;
 function sync(){
  const text=empty?'Write a summary':'Full summary';
  if(current.button.textContent!==text)current.button.textContent=text;
  const expanded=String(current.open);if(current.button.getAttribute('aria-expanded')!==expanded)current.button.setAttribute('aria-expanded',expanded);
  if(card!.hidden===current.open)card!.hidden=!current.open;
  current.button.hidden=false;current.nav.hidden=false;
  current.claims.setAttribute('aria-pressed',String(!current.open));current.button.setAttribute('aria-pressed',String(current.open));
  if(progress)progress.hidden=current.open;
 }
 sync();
}
