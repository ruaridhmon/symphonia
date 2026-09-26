const $=id=>document.getElementById(id);
const el=(tag,value,cls)=>{const n=document.createElement(tag);if(value!==undefined)n.textContent=value;if(cls)n.className=cls;return n};
let fixture,records,round=1;
function rating(v){return el('span',v,'rating '+(v==='Disagree'?'disagree':v==='Unable to judge'?'unsure':''))}
function render(){
 const c=fixture.scenarios.find(x=>x.id===$('scenario').value),arm=$('arm').value,record=records.find(x=>x.scenario_id===c.id&&x.arm===arm),r=record.rounds.find(x=>x.round_number===round);
 $('open-platform').href=`/admin/form/${record.form_id}/summary`;$('question').textContent=c.question;
 $('round-note').textContent=round===1?'Eight authored opening responses. Both arms start with exact copies of these authored responses.':round===2?'First ratings of the four fixed claims. Both arms start with identical ratings and reasons.':arm==='feedback'?'Reconsiderations authored after reading the saved round-two peer feedback. Claim wording and rating options are unchanged.':'Reconsiderations use only original private evidence and previous answers. No peer ratings or reasons were exposed by the platform.';
 document.querySelectorAll('[data-round]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.round)===round)));
 $('feedback').hidden=round===1;
 // Saved authored HTML contains no user-origin content; render text paragraphs rather than injecting HTML.
 const previous=record.rounds.find(x=>x.round_number===round-1);$('feedback-body').replaceChildren();
 if(previous){const parsed=new DOMParser().parseFromString(previous.summary,'text/html');for(const p of parsed.querySelectorAll('p'))$('feedback-body').append(el('p',p.textContent));}
 $('responses').replaceChildren(...r.responses.map(person=>{
 const meta=c.people.find(x=>x.id===person.participant_id),d=el('details',undefined,'person'),sum=el('summary',meta.name);sum.append(el('small',meta.role));d.append(sum);const body=el('div');
 if(round===1)body.append(el('p',person.answers.q1.position,'opening'));
 else for(let j=0;j<c.claims.length;j++){const a=el('div',undefined,'answer');a.append(el('h3',`${j+1}. ${c.claims[j]}`));const v=person.answers[`q${2*j+1}`].position;a.append(rating(v));if(round===3){const prior=record.rounds.find(x=>x.round_number===2).responses.find(x=>x.participant_id===person.participant_id),old=prior.answers[`q${2*j+1}`].position;a.append(el('span',old===v?'Same rating as round 2':`${old} → ${v}`,'change'));}a.append(el('p',person.answers[`q${2*j+2}`].position));body.append(a);}
 d.append(body);return d;}));
 $('trace').replaceChildren(el('p','The assistant authored these claims from the opening responses. This is a traceability record, not an independent extraction score.'),...c.claims.map((claim,j)=>el('p',`${j+1}. ${claim} Source: openings P01–P08; evidence reference ${c.claim_sources[j]}.`)));
 $('evidence').replaceChildren(...c.evidence.map(t=>el('p',t)),...c.people.map(p=>{const d=el('details'),s=el('summary',`${p.id} · private packet`);d.append(s,el('p',p.private_evidence.join('\n\n')||'No direct outcome evidence supplied. Initial beliefs are explicitly unverified.'));return d;}));
}
function page(name){if(!['consultations','figures','tests','methods'].includes(name))name='consultations';document.querySelectorAll('main>section').forEach(s=>s.hidden=s.id!==name);document.querySelectorAll('[data-page]').forEach(b=>{if(b.dataset.page===name)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current')});}
document.querySelectorAll('[data-page]').forEach(b=>b.onclick=()=>{location.hash=b.dataset.page;page(b.dataset.page)});
window.addEventListener('hashchange',()=>page(location.hash.slice(1)));
document.querySelectorAll('[data-round]').forEach(b=>b.onclick=()=>{round=Number(b.dataset.round);render()});$('scenario').onchange=render;$('arm').onchange=render;
Promise.all(['fixture','records','verification'].map(async n=>{const r=await fetch(`pilot-data/${n}.json`);if(!r.ok)throw Error('Saved record not available');return r.json()})).then(([f,r,v])=>{fixture=f;records=r;$('scenario').replaceChildren(...f.scenarios.map(c=>{const o=el('option',c.title);o.value=c.id;return o}));$('status').textContent=`${f.scenarios.length} authored scenarios · ${records.length} live consultations · ${v.submissions} saved submissions · ${v.rating_rows} recorded ratings · zero OpenRouter calls`;render();page(location.hash.slice(1));}).catch(()=>{$('status').textContent='Saved pilot records could not be loaded. Please refresh or return to Consultations.'});
