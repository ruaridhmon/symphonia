/** Keep the original editor and publication handlers intact behind one disclosure. */
const states=new WeakMap<HTMLElement,{button:HTMLButtonElement;open:boolean;round:string}>();
let id=0;
export function quietSummary(main:HTMLElement){
 const progress=main.querySelector<HTMLElement>('#delphi-recorded-progress');
 const hasResults=!!progress?.querySelector('.di-claim');
 const empty=progress?.dataset.empty==='true';
 for(const stale of main.querySelectorAll<HTMLButtonElement>('.quiet-synthesis-toggle')){
  if(!document.getElementById(stale.getAttribute('aria-controls')||''))stale.remove();
 }
 const heading=Array.from(main.querySelectorAll('h2')).find(n=>/^(Round \d+ synthesis|Synthesis for Round \d+)$/.test(n.textContent?.trim()||''));
 const card=heading?.closest<HTMLElement>('.card');if(!card)return;
 let state=states.get(card);
 if(!hasResults&&!empty){if(state){card.hidden=false;state.button.hidden=true;}return;}
 const round=heading!.textContent||'';
 if(!state){
  const button=document.createElement('button');button.type='button';button.className='quiet-synthesis-toggle';card.id ||= `full-synthesis-${++id}`;button.setAttribute('aria-controls',card.id);
  state={button,open:false,round};states.set(card,state);card.before(button);
  button.onclick=()=>{const current=states.get(card)!;current.open=!current.open;sync();};
 }
 if(state.round!==round){state.round=round;state.open=false;}
 // Existing edit actions must remain usable, including editing initiated elsewhere.
 if(card.classList.contains('unified-editing'))state.open=true;
 const current=state;
 function sync(){
  const published=!!Array.from(card!.querySelectorAll('button')).find(b=>b.textContent?.trim()==='Hide from survey');
  const text=empty&&!current.open?'Write a summary':`${current.open?'Hide':'Full'} summary${published?' · Published':''}`;
  if(current.button.textContent!==text)current.button.textContent=text;
  const expanded=String(current.open);if(current.button.getAttribute('aria-expanded')!==expanded)current.button.setAttribute('aria-expanded',expanded);
  if(card!.hidden===current.open)card!.hidden=!current.open;
  current.button.hidden=false;
 }
 sync();
}
