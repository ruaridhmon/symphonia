import { renderReasoningFlow, clearReasoningFlow } from './reasoningFlow';
import '../reasoning-flow.css';
import { renderDelphiPlanner } from './renderDelphiPlanner';
import type { Round, RoundWithResponses } from '../types/summary';
import { confidenceLabels, ratingProgress, stanceLabels, synthesisProvenanceNote } from './delphiProgress';
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
  clearReasoningFlow(root);
  const rows=ratingProgress(round,rounds,responses);
  const priorOpen=new Set(Array.from(root.querySelectorAll('details[open]')).map(d=>(d as HTMLElement).dataset.key));
  delete root.dataset.filter;
  const existingPlanner=root.dataset.plannerRound===String(round.id)?root.querySelector('.di-planner'):null;
  root.dataset.plannerRound=String(round.id);
  root.replaceChildren();root.className='card delphi-insights';root.dataset.review=String(round.round_number>1);
  root.dataset.claimLabels=JSON.stringify(rows.map(r=>r.label.replace(/^Claim\s+\d+:\s*/i,'').replace(/\s+/g,' ').trim()));
  const head=node('div','','di-heading');
  const title=node('div','','di-title');if(refresh)title.append(button('Refresh',refresh));head.append(title);root.append(head);
  const ordered=[...rounds].filter(r=>r.round_number<=round.round_number).sort((a,b)=>a.round_number-b.round_number);
  const actual=responses.find(r=>r.id===round.id)?.responses.length;
  root.dataset.empty=String(actual===0);
  const note=synthesisProvenanceNote(round,rounds);if(note)root.append(node('p',note,'di-warning'));
  if(round.round_number===1){
    const graph=round.synthesis_json?.reasoning_graph;
    if(graph?.version===1 && round.synthesis_json?.narrative===round.synthesis){renderReasoningFlow(root,graph);return;}
    if(!rows.length && actual && round.synthesis){root.append(node('p','This saved draft contains claims only. Generate a new draft with Simple or Custom instructions to include source-linked reasoning and inferred assumptions.','di-empty'));return;}
  }
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
    const opening=rounds.find(r=>r.round_number===1);const map=opening?.synthesis_json?.narrative===opening?.synthesis?opening?.synthesis_json?.reasoning_graph:null;
    const claim=map?.claims?.find(c=>c.text.replace(/\s+/g,' ').trim()===row.label.replace(/^Claim\s+\d+:\s*/i,'').replace(/\s+/g,' ').trim());
    if(claim&&map?.claims){number.textContent=String(map.claims.indexOf(claim)+1).padStart(2,'0');
      const links=node('div','','di-claim-links');for(const edge of map.claim_edges||[]){if(edge.to!==claim.id)continue;const other=map.claims.find(c=>c.id===edge.from);if(!other)continue;const relation={supports:'Supported by',qualifies:'Qualified by',challenges:'Challenged by',motivates:'Motivated by'}[edge.relation];const text=`${relation} ${String(map.claims.indexOf(other)+1).padStart(2,'0')}`;const b=button(text,()=>document.dispatchEvent(new CustomEvent('symphonia:claim-map',{detail:{nodeId:other.id}})));b.title='Inspect the connected claim';links.append(b);}if(links.childElementCount)left.append(links);
    }
    const rating=node('div','','di-rating');rating.setAttribute('aria-label',category(row));
    const score=node('div','','di-score');score.append(node('strong',row.percent===null?'—':`${Math.round(row.percent)}%`),node('span',row.percent===null?'No ratings':'agree'));rating.append(score);heading.append(rating);article.append(heading);
    const bar=node('div','','di-bar');bar.setAttribute('role','group');bar.setAttribute('aria-label','Expert positions and confidence');
    // Denominator matches the displayed percentage; omissions are reported separately.
    row.votes.slice(0,5).forEach((n,i)=>{if(n&&row.answered){for(const expert of row.evidence.filter(e=>e.group===i)){
      const part=button('',()=>{});part.disabled=true;part.dataset.stance=String(i);const level=confidenceLabels.indexOf(expert.confidence);part.style.width=`${100/row.answered}%`;part.style.height=`${level<0?2:2+level*2}px`;part.style.background=colors[i];part.dataset.confidence=level<0?'missing':String(level);part.title=`${expert.participant}: ${expert.position}; confidence: ${expert.confidence || 'not recorded'}`;part.setAttribute('aria-label',part.title);bar.append(part);
    }}});bar.title='Length shows the share of positions. Each segment is one expert; thicker means higher confidence. Dashed segments have no confidence rating.';rating.append(bar);
    const legend=node('div','','di-legend');
    row.votes.forEach((n,i)=>{if(n||i<2){
      const item=node('span','','di-stance-group');
      const count=node('span',`${n} ${stanceLabels[i].toLowerCase()}`);const dot=node('i');dot.style.background=colors[i];count.prepend(dot);item.append(count);
      if(n&&i<4&&row.hasConfidence){
        const group=row.evidence.filter(e=>e.group===i);
        const values=group.map(e=>confidenceLabels.indexOf(e.confidence)).filter(v=>v>=0);
        const high=values.filter(v=>v>=3).length,low=values.filter(v=>v<=1).length,moderate=values.filter(v=>v===2).length;
        const label=!values.length?'confidence not recorded':high>values.length/2?'high confidence':low>values.length/2?'low confidence':moderate>values.length/2?'moderate confidence':'mixed confidence';
        const disclosure=node('details','','di-confidence') as HTMLDetailsElement;disclosure.dataset.key=`${row.key}:confidence:${i}`;disclosure.open=false;
        const trigger=node('summary',label+(values.length&&values.length<n?` (${values.length}/${n})`:''));trigger.setAttribute('aria-label',`${stanceLabels[i]}: ${trigger.textContent}. Show confidence responses`);disclosure.append(trigger);
        const body=document.createElement('dialog');body.className='di-confidence-detail';body.setAttribute('aria-label',`Confidence among people who ${stanceLabels[i].toLowerCase()}`);
        let anchorControl:HTMLElement=trigger;
        const position=()=>{
          if(!body.open)return;
          const viewport=window.visualViewport;
          const leftEdge=(viewport?.offsetLeft||0)+12,topEdge=(viewport?.offsetTop||0)+12;
          const rightEdge=leftEdge+(viewport?.width||window.innerWidth)-24,bottomEdge=topEdge+(viewport?.height||window.innerHeight)-24;
          body.style.maxWidth=`${rightEdge-leftEdge}px`;body.style.maxHeight=`${bottomEdge-topEdge}px`;
          const anchor=anchorControl.getBoundingClientRect(),box=body.getBoundingClientRect();
          const below=bottomEdge-anchor.bottom-8,above=anchor.top-topEdge-8;
          const top=below>=box.height||below>=above?anchor.bottom+8:anchor.top-box.height-8;
          body.style.left=`${Math.max(leftEdge,Math.min(anchor.left,rightEdge-box.width))}px`;
          body.style.top=`${Math.max(topEdge,Math.min(top,bottomEdge-box.height))}px`;
        };
        const dismiss=()=>{body.close();disclosure.open=false;anchorControl.focus();};
        trigger.onclick=e=>{e.preventDefault();root.querySelectorAll<HTMLDialogElement>('.di-confidence dialog[open]').forEach(d=>d.close());disclosure.open=true;body.showModal();position();window.addEventListener('resize',position);window.addEventListener('scroll',position,true);window.visualViewport?.addEventListener('resize',position);};
        for(const part of bar.querySelectorAll<HTMLButtonElement>(`button[data-stance="${i}"]`)){part.disabled=false;part.setAttribute('aria-haspopup','dialog');part.onclick=()=>{anchorControl=part;trigger.click();};}
        body.onclose=()=>{disclosure.open=false;window.removeEventListener('resize',position);window.removeEventListener('scroll',position,true);window.visualViewport?.removeEventListener('resize',position);};
        body.oncancel=e=>{e.preventDefault();dismiss();};
        body.onclick=e=>{if(e.target===body){const r=body.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dismiss();}};
        const header=node('div','','di-confidence-header');
        const close=button('×',dismiss);close.className='di-confidence-close';close.setAttribute('aria-label','Close confidence');
        header.append(node('strong',`Confidence · ${stanceLabels[i].toLowerCase()}`),close);body.append(header,node('p',`${values.length} of ${n} answered`,'di-confidence-subtitle'));
        const distribution=node('div','','di-confidence-distribution');
        confidenceLabels.forEach((label,j)=>{
          const total=values.filter(v=>v===j).length;
          const line=node('div','','di-confidence-level');line.setAttribute('aria-label',`${label}: ${total}`);
          const track=node('span','','di-confidence-track');track.setAttribute('aria-hidden','true');const fill=node('span');fill.style.width=`${values.length?100*total/values.length:0}%`;track.append(fill);
          line.append(node('span',label.replace(' confident','')),track,node('span',String(total),'di-confidence-count'));distribution.append(line);
        });body.append(distribution);
        const method=node('details','','di-confidence-method');method.addEventListener('toggle',position);method.append(node('summary','How this is summarised'),node('p','High: very or extremely. Moderate: moderately. Low: slightly or not at all. The label describes more than half of recorded answers; otherwise mixed. Missing answers are excluded. This is self-reported certainty, not correctness.'));body.append(method);disclosure.append(body);item.append(disclosure);
      }
      legend.append(item);
    }});rating.append(legend);
    if(row.history.filter(h=>h.n>0).length>1) {
      const previous=row.history.filter(h=>h.n>0).at(-2)!;
      const trend=node('div','','di-trend');
      if(row.delta!==null&&Math.round(row.delta)!==0){const change=Math.round(row.delta);trend.append(node('span',change===0?'No change':`${change>0?'+':'−'}${Math.abs(change)} pp`,'di-change'),node('span',`since Round ${previous.round}`));trend.title=`Agreement: Round ${previous.round} ${Math.round(previous.percent!)}% → Round ${round.round_number} ${Math.round(row.percent!)}%. Change in percentage points.`;}rating.append(trend);
    }
    if(row.origin==='inferred')left.append(node('p','Inferred assumption · unconfirmed','di-inferred-origin'));
    const supporting=row.evidence.filter(e=>e.comment.trim());
    const wrapper=node('div','','di-reasons');const trigger=button(`Supporting information · ${supporting.length}`,()=>{detail.showModal();});
    trigger.className='di-supporting-trigger';trigger.setAttribute('aria-haspopup','dialog');trigger.title=supporting.length?`${supporting.length} responses include supporting information`:'No supporting information provided';wrapper.append(trigger);
    const detail=document.createElement('dialog');detail.className='di-supporting-dialog';detail.setAttribute('aria-label',`Supporting information: ${row.label.replace(/^Claim\s+\d+:\s*/i,'')}`);
    const dismiss=()=>{detail.close();trigger.focus();};const close=button('×',dismiss);close.setAttribute('aria-label','Close supporting information');
    const header=node('div','','di-supporting-heading');header.append(node('h3','Supporting information'),close);detail.append(header,node('p',row.label.replace(/^Claim\s+\d+:\s*/i,''),'di-supporting-claim'));
    detail.oncancel=e=>{e.preventDefault();dismiss();};detail.onclick=e=>{if(e.target===detail){const r=detail.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dismiss();}};

    detail.append(node('p',row.options.map(option=>`${row.evidence.filter(e=>e.position===option).length} ${option.toLowerCase()}`).join(' · '),'di-exact-distribution'));
    if(row.inferenceQuestion)detail.append(node('p',String(row.inferenceQuestion)));
    if(row.hasConfidence)detail.append(node('p','Confidence: '+confidenceLabels.map(level=>`${row.evidence.filter(e=>e.confidence===level).length} ${level.toLowerCase()}`).join(' · ')+` · ${row.evidence.filter(e=>!e.confidence).length} not recorded.`));
    detail.append(node('p',row.history.map(h=>`Round ${h.round}: ${h.n ? Math.round(h.percent!)+'% agree' : 'No ratings'} (${h.n} answered)`).join(' · ')));
    if(row.matched)detail.append(node('p',`${row.changed} of ${row.matched} returning respondents changed their exact position since Round ${row.previousRound}.`,'di-movement'));
    const question=round.questions.find(q=>typeof q==='object'&&String(q.questionId)===row.key) as Record<string,unknown>|undefined;
    if(question?.parentClaimId) { article.prepend(node('p',`Related proposal · introduced in Round ${question.introducedRound || round.round_number}`,'di-eyebrow'));detail.append(node('p',`Original claim: ${question.parentClaimText || question.parentClaimId}`),node('p',`Reason for this proposal: ${question.claimRationale || 'Not recorded'}`)); }
    const evidence=supporting;
    if(!evidence.length)detail.append(node('p','No supporting information was provided for this claim. Original responses remain available in Responses.'));
    [0,1,2,3,4,5].forEach(group=>{
      const subset=evidence.filter(e=>e.group===group);if(!subset.length)return;
      const section=node('section');section.append(node('h4',`${stanceLabels[group]} · ${subset.length}`));
      subset.forEach(e=>{const block=node('blockquote');block.append(node('div',`${e.participant} · ${e.position || 'Not answered'}`,'di-attribution'));if(e.before!==null)block.append(node('p',`${e.before} → ${e.position}${e.changed?'':' · Position retained'}`,'di-shift'));if(row.hasConfidence)block.append(node('p',`Confidence: ${e.confidence || 'Not recorded'}${e.beforeConfidence!==null?` · Previously: ${e.beforeConfidence || 'Not recorded'}`:''}`));block.append(node('p',e.comment||'No reason supplied.'));section.append(block);});detail.append(section);
    });wrapper.append(detail);left.append(wrapper);list.append(article);
  });root.append(list);
  const archived=node('details','','di-method');archived.append(node('summary','Earlier claims not rated in this round'));
  const seen=new Set(rows.map(r=>r.key));
  [...ordered].reverse().filter(r=>r.id!==round.id).forEach(r=>ratingProgress(r,rounds,responses).forEach(row=>{if(seen.has(row.key))return;seen.add(row.key);archived.append(node('p',`${row.label} — last rated Round ${r.round_number}: ${row.percent===null?'no ratings':Math.round(row.percent)+'% agree'} (${row.answered} answered). Not re-rated; no current-round result.`));}));
  if(archived.childElementCount>1)root.append(archived);
  if(existingPlanner)root.append(existingPlanner);
  else if(round.is_active || !refresh)renderDelphiPlanner(root,round,rounds,responses,publish);
}
