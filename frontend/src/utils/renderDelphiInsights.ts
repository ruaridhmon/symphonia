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
  delete root.dataset.filter;
  const existingPlanner=root.dataset.plannerRound===String(round.id)?root.querySelector('.di-planner'):null;
  root.dataset.plannerRound=String(round.id);
  root.replaceChildren();root.className='card delphi-insights';
  root.dataset.claimLabels=JSON.stringify(rows.map(r=>r.label.replace(/^Claim\s+\d+:\s*/i,'').replace(/\s+/g,' ').trim()));
  const head=node('div','','di-heading');
  const title=node('div','','di-title');if(refresh)title.append(button('Refresh',refresh));head.append(title);root.append(head);
  const ordered=[...rounds].filter(r=>r.round_number<=round.round_number).sort((a,b)=>a.round_number-b.round_number);
  const actual=responses.find(r=>r.id===round.id)?.responses.length;
  root.dataset.empty=String(actual===0);
  const note=synthesisProvenanceNote(round,rounds);if(note)root.append(node('p',note,'di-warning'));
  if(!rows.length) {root.append(node('p',actual===0?'No responses yet for this round. Responses will appear here as participants submit them.':round.round_number===1?'This round gathers independent views. Extract claims from the responses before setting up the rating round.':'There are no comparable claim ratings in this round. Review the written responses or synthesis below.','di-empty'));return;}
  const comparable=rows.filter(row=>row.delta!==null);
  if(comparable.length){
    const increased=comparable.filter(row=>row.delta!>0).length;
    const decreased=comparable.filter(row=>row.delta!<0).length;
    const unchanged=comparable.length-increased-decreased;
    const changes=[increased?`${increased} ${increased===1?'claim gained':'claims gained'} support`:null,decreased?`${decreased} ${decreased===1?'lost':'lost'} support`:null,unchanged?`${unchanged} ${unchanged===1?'was':'were'} unchanged`:null].filter(Boolean).join(' · ');
    root.append(node('p',changes+'.','di-change-overview'));
  }
  const list=node('div','','di-claims');
  const columns=node('div','','di-column-head');columns.setAttribute('aria-hidden','true');columns.append(node('span','Claim'),node('span','Recorded agreement'));list.append(columns);
  const selected=rows;
  if(!selected.length)list.append(node('p','No claims in this group.','di-empty'));
  selected.forEach((row)=>{
    const article=node('article','','di-claim');article.dataset.key=row.key;
    article.dataset.openExcerpts=JSON.stringify([...priorOpen].filter(k=>k?.startsWith(`${row.key}:excerpt:`)));
    const heading=node('div','','di-claim-top');
    const left=node('div','','di-claim-copy');const number=node('span',String(rows.indexOf(row)+1).padStart(2,'0'),'di-claim-number');number.setAttribute('aria-label',`Claim ${rows.indexOf(row)+1}`);left.append(number,node('h3',row.label.replace(/^Claim\s+\d+:\s*/i,'')));heading.append(left);
    const rating=node('div','','di-rating');rating.setAttribute('aria-label',category(row));
    const score=node('div','','di-score');score.append(node('strong',row.percent===null?'—':`${Math.round(row.percent)}%`),node('span',row.percent===null?'No ratings':'agree'));rating.append(score);heading.append(rating);article.append(heading);
    const bar=node('div','','di-bar');bar.setAttribute('aria-hidden','true');
    // Denominator matches the displayed percentage; omissions are reported separately.
    row.votes.slice(0,5).forEach((n,i)=>{if(n&&row.answered){const part=node('span');part.style.width=`${n/row.answered*100}%`;part.style.background=colors[i];bar.append(part);}});rating.append(bar);
    const legend=node('div','','di-legend');row.votes.forEach((n,i)=>{if(n||i<2){const item=node('span',`${n} ${stanceLabels[i].toLowerCase()}`);const dot=node('i');dot.style.background=colors[i];item.prepend(dot);legend.append(item);}});rating.append(legend);
    if(row.history.filter(h=>h.n>0).length>1) {
      const previous=row.history.filter(h=>h.n>0).at(-2)!;
      const trend=node('div','','di-trend');
      if(row.delta!==null&&Math.round(row.delta)!==0){const change=Math.round(row.delta);trend.append(node('span',change===0?'No change':`${change>0?'+':'−'}${Math.abs(change)} pp`,'di-change'),node('span',`since Round ${previous.round}`));trend.title=`Agreement: Round ${previous.round} ${Math.round(previous.percent!)}% → Round ${round.round_number} ${Math.round(row.percent!)}%. Change in percentage points.`;}rating.append(trend);
    }
    const detail=document.createElement('details');detail.className='di-reasons';detail.dataset.key=row.key;detail.open=priorOpen.has(row.key);
    const summary=node('summary','Responses and changes');detail.append(summary);
    detail.append(node('p',row.history.map(h=>`Round ${h.round}: ${h.n ? Math.round(h.percent!)+'% agree' : 'No ratings'} (${h.n} answered)`).join(' · ')));
    if(row.matched)detail.append(node('p',`${row.changed} of ${row.matched} returning respondents changed position group since Round ${row.previousRound}.`,'di-movement'));
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
}
