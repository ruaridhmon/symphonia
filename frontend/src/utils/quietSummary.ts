/** Keep the original editor and publication handlers intact behind one disclosure. */
const states=new WeakMap<HTMLElement,{button:HTMLButtonElement;claims:HTMLButtonElement;nav:HTMLElement;open:boolean;round:string}>();
let id=0;
export function quietSummary(main:HTMLElement){
 const progress=main.querySelector<HTMLElement>('#delphi-recorded-progress');
 const hasResults=!!progress?.querySelector('.di-claim');
 const empty=progress?.dataset.empty==='true';
 for(const stale of main.querySelectorAll<HTMLButtonElement>('.quiet-synthesis-toggle')){
  if(!document.getElementById(stale.getAttribute('aria-controls')||''))stale.closest('.summary-switch')?.remove();
 }
 const heading=Array.from(main.querySelectorAll('h2')).find(n=>/^(Round \d+ synthesis|Synthesis for Round \d+)$/.test(n.textContent?.trim()||''));
 const card=heading?.closest<HTMLElement>('.card');if(!card)return;
 card.classList.add('full-summary-surface');
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
