// Read-only example explorer. Never writes to consultation data or changes access.
import data from '../demos/public-ai-results.json';
import { renderDelphiInsights } from '../utils/renderDelphiInsights';
import type { Round, RoundWithResponses } from '../types/summary';
const example = data as unknown as {fixture:{title:string;method:string;claims:string[];experts:{role:string;proposal:string;round2:{votes:string[]};round3:{votes:string[]}}[]};rounds:Round[];responses:RoundWithResponses[]};
const el=(tag:string,text='',cls='')=>{const n=document.createElement(tag);n.textContent=text;n.className=cls;return n;};
const btn=(text:string,fn:()=>void)=>{const n=el('button',text) as HTMLButtonElement;n.type='button';n.onclick=fn;return n;};
let selected=3;
function draw(root:HTMLElement) {
  root.replaceChildren();
  const top=el('div','','demo-topline');top.append(el('span','SYNTHETIC DELPHI · 8 FICTIONAL EXPERTS','di-eyebrow'));
  const back=el('a','Back to consultation') as HTMLAnchorElement;back.href=location.pathname;top.append(back);root.append(top);
  root.append(el('h2','Can a panel find common ground without losing its disagreements?','demo-title'));
  root.append(el('p','Explore three rounds on AI in UK public services. Follow the judgments, inspect the reasons, and see where the panel remains divided.','demo-deck'));
  const provenance=el('details','','demo-protocol');provenance.append(el('summary','About this simulation'));
  provenance.append(el('p',example.fixture.method+' The 24 submissions were processed by an isolated test instance of the application. This is a saved demonstration, separate from live consultation responses.'));
  provenance.append(el('p','Protocol: eight returning participants; 80% agreement or disagreement, with uncertainty included; all eight responses required. Stop after three rounds and report unresolved claims. Claims stay unchanged between rating rounds.'));
  root.append(provenance);
  const nav=el('nav','','demo-rounds');nav.setAttribute('aria-label','Simulation rounds');
  ['1 · Independent ideas','2 · First ratings','3 · Reconsideration'].forEach((label,i)=>{const b=btn(label,()=>{selected=i+1;draw(root);});b.setAttribute('aria-current',selected===i+1?'step':'false');nav.append(b);});root.append(nav);
  const narrative=el('div','','demo-narrative');
  if(selected===1){narrative.append(el('h3','Different starting points'),el('p','Eight roles bring different priorities: capacity, fairness, worker protection, fiscal flexibility and public accountability. Four candidate claims are distilled from their proposals; no agreement percentage is inferred from these paragraphs.'));}
  if(selected===2){narrative.append(el('h3','The first ratings reveal the fault lines'),el('p','Human appeals have broad support. The staffing earmark splits the panel evenly. Five respondents favour universal model disclosure, while others question whether it is the right route to accountability.'));}
  if(selected===3){narrative.append(el('h3','Common ground, with questions still open'),el('p','All eight support human appeal; seven reject universal model disclosure. Routine automation gains support but remains below the threshold. The staffing earmark stays split 4–4: protecting staff versus keeping budgets flexible.'));
    const proposed=el('details','','demo-proposal');proposed.append(el('summary','A new proposal to test next'),el('p','Require independent model inspection, public evaluation reports and accessible explanations, with justified exceptions to public release of weights.'),el('p','Proposed from the discussion, not rated. It must receive a new claim identifier and a fresh baseline; the rejected claim’s votes cannot be transferred to it.'));narrative.append(proposed);
  }root.append(narrative);
  if(selected===3) {
    const matrix=el('details','','demo-matrix');matrix.append(el('summary','See the eight perspectives side by side'));
    const table=el('table');table.append(el('caption','Round 2 → Round 3. Fictional roles; original claims unchanged.'));
    const head=el('tr');['Perspective','Human appeal','Routine automation','Staffing earmark','Full model release'].forEach(t=>{const th=el('th',t);th.setAttribute('scope','col');head.append(th);});const thead=el('thead');thead.append(head);table.append(thead);
    const tbody=el('tbody');example.fixture.experts.forEach(e=>{const row=el('tr');const label=el('th',e.role);label.setAttribute('scope','row');row.append(label);e.round3.votes.forEach((v,i)=>{const short=(x:string)=>x.startsWith('Unable')?'Unsure':x;const before=e.round2.votes[i];const cell=el('td',before===v?short(v):`${short(before)} → ${short(v)}`);if(before!==v)cell.className='demo-vote-changed';row.append(cell);});tbody.append(row);});table.append(tbody);
    const scroll=el('div','','demo-table-scroll');scroll.tabIndex=0;scroll.setAttribute('role','region');scroll.setAttribute('aria-label','Perspective ratings, scroll horizontally on small screens');scroll.append(table);matrix.append(scroll);root.append(matrix);
  }
  if(selected===1){
    const proposals=el('div','','demo-proposals');example.fixture.experts.forEach((e,i)=>{const d=el('details');d.append(el('summary',`Perspective ${i+1} · ${e.role}`),el('p',e.proposal));proposals.append(d);});root.append(proposals);
    const claims=el('section','','demo-candidates');claims.append(el('h3','Four claims for the next round'));example.fixture.claims.forEach((c,i)=>claims.append(el('p',`${i+1}. ${c}`)));root.append(claims);
  }else {
    const results=el('section');results.setAttribute('aria-label','Synthetic Delphi results');renderDelphiInsights(results,example.rounds[selected-1],example.rounds,example.responses);root.append(results);
  }
  const footer=el('div','','demo-footer');if(selected>1)footer.append(btn('Previous round',()=>{selected--;draw(root);}));if(selected<3)footer.append(btn('Continue to next round',()=>{selected++;draw(root);}));root.append(footer);
}
function sync() {
  // Repair missing accessible names on the existing settings controls without changing values.
  for(const [id,label] of [['toggle-public-share','Public share link'],['toggle-consent-step','Consent step']]){
    const control=document.getElementById(id);if(control&&!control.getAttribute('aria-label'))control.setAttribute('aria-label',label);
  }
  const main=document.querySelector('main');
  const isSummary=/^\/admin\/form\/\d+\/summary\/?$/.test(location.pathname)&&!!main?.querySelector('#summary-workspace-select');
  if(isSummary&&main) {
    for(const label of main.querySelectorAll('aside span')) if(label.childElementCount===0&&label.textContent==='Participants') label.textContent='Responses';
    for(const analysis of main.querySelectorAll('.structured-synthesis')) {
      const values=Array.from(analysis.querySelectorAll('.structured-stat-value'));
      const empty=values.length===4&&values.every(v=>v.textContent?.trim()==='0')&&!analysis.querySelector('.structured-section-header');
      analysis.classList.toggle('di-empty-analysis',empty);
      const existing=analysis.querySelector('.di-analysis-empty');
      if(empty&&!existing)analysis.prepend(el('p','No structured analysis items are available for this synthesis. See recorded participant ratings in the Synthesis view.','di-analysis-empty'));
      if(!empty)existing?.remove();
    }
  }
  const requested=new URLSearchParams(location.search).get('demo')==='public-ai';
  const active=isSummary&&requested;
  document.body.classList.toggle('delphi-demo-active',active);
  let root=document.getElementById('delphi-demo-workspace');
  if(!active){root?.remove();root=null;}
  if(active&&main&&!root){
    root=el('section','','demo-workspace');root.id='delphi-demo-workspace';
    const grid=main.querySelector(':scope > div > .grid');if(grid){grid.before(root);draw(root);}
  }
  const dashboard=location.pathname==='/'&&Array.from(main?.querySelectorAll('h1')||[]).some(h=>h.textContent==='Consultations');
  if(dashboard&&!document.getElementById('delphi-demo-link')){
    const link=el('a','','demo-dashboard-link') as HTMLAnchorElement;link.id='delphi-demo-link';link.href='/admin/form/17/summary?demo=public-ai';
    link.append(el('strong','Explore a Delphi in action'),el('span','8 fictional experts · 3 rounds · see what changes and what stays divided →'));main!.prepend(link);
  }
}
let timer:ReturnType<typeof setTimeout>;
new MutationObserver(()=>{clearTimeout(timer);timer=setTimeout(sync,100);}).observe(document.body,{childList:true,subtree:true});
window.addEventListener('popstate',sync);sync();
