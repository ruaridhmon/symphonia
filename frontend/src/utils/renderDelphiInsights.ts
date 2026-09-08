import { renderDelphiPlanner } from './renderDelphiPlanner';
import type { Round, RoundWithResponses } from '../types/summary';
import { ratingProgress, stanceLabels, synthesisProvenanceNote } from './delphiProgress';
const colors = ['#137c70','#b34d60','#94a3b8','#c28a2a','#8b5fbf','#e2e8f0'];
const node = (tag:string,text='',cls='') => { const n=document.createElement(tag); n.textContent=text; n.className=cls; return n; };
const button = (label:string,run:()=>void) => { const b=node('button',label) as HTMLButtonElement;b.type='button';b.onclick=run;return b; };
type Row = ReturnType<typeof ratingProgress>[number];
function category(row:Row) {
  if(!row.answered) return 'Awaiting ratings';
  if(row.votes[0]/row.answered>=.8) return 'Mostly agree';
  if(row.votes[1]/row.answered>=.8) return 'Mostly disagree';
  if((row.votes[2]+row.votes[3]+row.votes[4])/row.answered>=.5) return 'Uncertain';
  if(row.votes[0]/row.answered>.5) return 'Leaning agree';
  if(row.votes[1]/row.answered>.5) return 'Leaning disagree';
  return 'Divided';
}
export function renderDelphiInsights(root:HTMLElement, round:Round, rounds:Round[], responses:RoundWithResponses[], refresh?:()=>void, publish?: (questions:(string|Record<string,unknown>)[])=>Promise<void>) {
  const rows=ratingProgress(round,rounds,responses);
  const priorOpen=new Set(Array.from(root.querySelectorAll('details[open]')).map(d=>(d as HTMLElement).dataset.key));
  const filter=root.dataset.filter || 'All claims';
  const existingPlanner=root.dataset.plannerRound===String(round.id)?root.querySelector('.di-planner'):null;
  root.dataset.plannerRound=String(round.id);
  root.replaceChildren();root.className='card delphi-insights';
  const head=node('div','','di-heading');head.append(node('div','THE PANEL’S VIEW','di-eyebrow'));
  const title=node('div','','di-title');title.append(node('h2','Where views stand'));if(refresh)title.append(button('Refresh',refresh));head.append(title);root.append(head);
  const ordered=[...rounds].filter(r=>r.round_number<=round.round_number).sort((a,b)=>a.round_number-b.round_number);
  const actual=responses.find(r=>r.id===round.id)?.responses.length;
  const intro=node('p',`Round ${round.round_number} · ${actual ?? '—'} responses${rows.length ? ` · ${rows.length} claims` : ''}`,'di-subtitle');root.append(intro);
  const note=synthesisProvenanceNote(round,rounds);if(note)root.append(node('p',note,'di-warning'));
  if(!rows.length) {root.append(node('p',actual===0?'No responses yet for this round. Responses will appear here as participants submit them.':round.round_number===1?'This round gathers independent views. Extract claims from the responses before setting up the rating round.':'There are no comparable claim ratings in this round. Review the written responses or synthesis below.','di-empty'));return;}
  const cats=['Mostly agree','Leaning agree','Divided','Leaning disagree','Mostly disagree','Uncertain'];
  const overview=node('div','','di-overview');
  cats.forEach(label=>{const item=node('div');item.append(node('strong',String(rows.filter(r=>category(r)===label).length)),node('span',label));overview.append(item);});root.append(overview);
  const filters=node('div','','di-filters');filters.setAttribute('role','group');filters.setAttribute('aria-label','Filter claims');
  ['All claims',...cats].forEach(label=>{const b=button(label,()=>{root.dataset.filter=label;renderDelphiInsights(root,round,rounds,responses,refresh,publish);});b.setAttribute('aria-pressed',String(filter===label));filters.append(b);});root.append(filters);
  const list=node('div','','di-claims');
  const selected=rows.filter(r=>filter==='All claims'||category(r)===filter);
  if(!selected.length)list.append(node('p','No claims in this group.','di-empty'));
  selected.forEach((row)=>{
    const article=node('article','','di-claim');
    const heading=node('div','','di-claim-top');
    const left=node('div');left.append(node('span',category(row),'di-status '+category(row).toLowerCase().replaceAll(' ','-')),node('h3',row.label.replace(/^Claim\s+\d+:\s*/i,'')));heading.append(left);
    const score=node('div','','di-score');score.append(node('strong',row.percent===null?'—':`${Math.round(row.percent)}%`),node('span','agree'));heading.append(score);article.append(heading);
    const bar=node('div','','di-bar');bar.setAttribute('aria-hidden','true');
    // Denominator matches the displayed percentage; omissions are reported separately.
    row.votes.slice(0,5).forEach((n,i)=>{if(n&&row.answered){const part=node('span');part.style.width=`${n/row.answered*100}%`;part.style.background=colors[i];bar.append(part);}});article.append(bar);
    const legend=node('div','','di-legend');row.votes.forEach((n,i)=>{if(n||i<2){const item=node('span',`${n} ${stanceLabels[i].toLowerCase()}`);const dot=node('i');dot.style.background=colors[i];item.prepend(dot);legend.append(item);}});article.append(legend);
    if(row.history.filter(h=>h.n>0).length>1) {
      const trend=node('div','','di-trend');trend.append(node('span','Agreement:'));
      row.history.filter(h=>h.n>0).slice(-2).forEach((h,i)=>{if(i)trend.append(node('span','→','di-arrow'));trend.append(node('span',`R${h.round} ${Math.round(h.percent!)}%`));});
      if(row.delta!==null)trend.append(node('strong',row.delta===0?'Unchanged':`${row.delta>0?'+':''}${Math.round(row.delta)} points`));article.append(trend);
    }
    if(row.matched)article.append(node('p',`${row.changed} of ${row.matched} returning respondents changed position group since Round ${row.previousRound}.`,'di-movement'));
    const detail=document.createElement('details');detail.className='di-reasons';detail.dataset.key=row.key;detail.open=priorOpen.has(row.key);
    const summary=node('summary','Reasons & history');detail.append(summary);
    detail.append(node('p',row.history.map(h=>`Round ${h.round}: ${h.n ? Math.round(h.percent!)+'% agree' : 'No ratings'} (${h.n} answered)`).join(' · ')));
    const question=round.questions.find(q=>typeof q==='object'&&String(q.questionId)===row.key) as Record<string,unknown>|undefined;
    if(question?.parentClaimId) { article.prepend(node('p',`Related proposal · introduced in Round ${question.introducedRound || round.round_number}`,'di-eyebrow'));detail.append(node('p',`Original claim: ${question.parentClaimText || question.parentClaimId}`),node('p',`Reason for this proposal: ${question.claimRationale || 'Not recorded'}`)); }
    const evidence=row.evidence.filter(e=>e.comment||e.changed);
    if(!evidence.length)detail.append(node('p','No separate comments were recorded for this claim. Original responses remain available in the Responses view.'));
    [0,1,2,3,4,5].forEach(group=>{
      const subset=evidence.filter(e=>e.group===group);if(!subset.length)return;
      const section=node('section');section.append(node('h4',`${stanceLabels[group]} · ${subset.length}`));
      subset.forEach(e=>{const block=node('blockquote');block.append(node('div',`${e.participant} · ${e.position || 'Not answered'}`,'di-attribution'));if(e.changed)block.append(node('p',`${e.before} → ${e.position}`,'di-shift'));block.append(node('p',e.comment||'No reason supplied.'));section.append(block);});detail.append(section);
    });article.append(detail);list.append(article);
  });root.append(list);
  const archived=node('details','','di-method');archived.append(node('summary','Earlier claims not rated in this round'));
  const seen=new Set(rows.map(r=>r.key));
  [...ordered].reverse().filter(r=>r.id!==round.id).forEach(r=>ratingProgress(r,rounds,responses).forEach(row=>{if(seen.has(row.key))return;seen.add(row.key);archived.append(node('p',`${row.label} — last rated Round ${r.round_number}: ${row.percent===null?'no ratings':Math.round(row.percent)+'% agree'} (${row.answered} answered). Not re-rated; no current-round result.`));}));
  if(archived.childElementCount>1)root.append(archived);
  if(existingPlanner)root.append(existingPlanner);
  else if(round.is_active || !refresh)renderDelphiPlanner(root,round,rounds,responses,publish);
  const methods=document.createElement('details');methods.className='di-method';methods.dataset.key='method';methods.open=priorOpen.has('method');methods.append(node('summary','How to read these results'));
  methods.append(node('p','These are recorded ratings, not AI-inferred agreement. “Leaning” means a majority below 80%; “Divided” means neither side has a majority (unless uncertainty dominates). “Mostly” means at least 80% of answered ratings; it is a descriptive display band, not a substitute for the study’s declared consensus rule. Neutral, unsure and unrecognised answers remain in the denominator; missing answers are shown separately.'));
  methods.append(node('p','Round comparisons require identical claim identifiers, wording and scales. Movement counts compare position groups for unambiguously matched returning respondents; changing intensity within agree or disagree is not counted. Response numbers identify rows within this round only. Comments are original submitted words.'));
  methods.append(node('p',ordered.map(r=>`Round ${r.round_number}: ${responses.find(x=>x.id===r.id)?.responses.length ?? r.response_count ?? '—'} responses`).join(' · ')));
  methods.append(node('p','Agreement can coexist with conditional support. Changes in panel composition can change percentages. A synthetic demonstration illustrates the process; it does not establish scientific validity.'));root.append(methods);
}
