import type { Round, RoundWithResponses } from '../types/summary';
import { ratingProgress } from './delphiProgress';
import { buildNextDelphi, type Proposal } from './delphiPlanning';
const el=(tag:string,text='')=>{const n=document.createElement(tag);n.textContent=text;return n;};
export function renderDelphiPlanner(root:HTMLElement,round:Round,rounds:Round[],responses:RoundWithResponses[],publish?: (questions:Record<string,unknown>[])=>Promise<void>) {
  const rows=ratingProgress(round,rounds,responses);if(!rows.length)return;
  const box=el('details');box.className='di-planner';box.append(el('summary',publish?'Plan the next round':'Explore a follow-up round'));
  box.append(el('p','Re-rate selected claims and add proposals that investigate disagreements. Unselected claims keep their recorded results. Stable disagreement is a valid outcome.'));
  const form=el('form') as HTMLFormElement;
  const retained=new Set<string>();const proposals:Proposal[]=[];
  form.append(el('h3','1. Choose claims to revisit'));
  rows.forEach(r=>{const label=el('label');const check=document.createElement('input');check.type='checkbox';check.checked=!!r.answered&&Math.max(r.votes[0],r.votes[1])/r.answered<.8;if(check.checked)retained.add(r.key);check.onchange=()=>{check.checked?retained.add(r.key):retained.delete(r.key);};label.append(check,document.createTextNode(r.label.replace(/^Claim\s+\d+:\s*/i,'')));form.append(label);});
  form.append(el('h3','2. Develop related proposals'));
  form.append(el('p','Read both sides above. Is the disagreement about evidence, wording, feasibility or values? Test a condition, an alternative, or a specific unresolved question.'));
  const entries=el('div');form.append(entries);
  const add=el('button','Add linked proposal') as HTMLButtonElement;add.type='button';add.onclick=()=>{
    const p:Proposal={id:'claim_'+crypto.randomUUID()+'_response',parentId:rows[0].key,text:'',rationale:''};proposals.push(p);
    const entry=el('fieldset');entry.append(el('legend',`New proposal`));
    const parent=document.createElement('select');parent.setAttribute('aria-label','Original claim');rows.forEach(r=>{const o=document.createElement('option');o.value=r.key;o.textContent=r.label;parent.append(o);});parent.onchange=()=>p.parentId=parent.value;entry.append(parent);
    for(const [key,label] of [['text','Proposed claim'],['rationale','Which disagreement does this address?']] as const){const l=el('label',label);const input=document.createElement('textarea');input.required=true;input.rows=2;input.setAttribute('aria-label',label);input.oninput=()=>p[key]=input.value;l.append(input);entry.append(l);}
    const remove=el('button','Remove proposal') as HTMLButtonElement;remove.type='button';remove.onclick=()=>{proposals.splice(proposals.indexOf(p),1);entry.remove();};entry.append(remove);entries.append(entry);parent.focus();
  };form.append(add);
  const review=el('button','Preview next round') as HTMLButtonElement;review.type='submit';form.append(review);const preview=el('section');preview.setAttribute('aria-live','polite');form.append(preview);
  // Any edit invalidates the reviewed package; publish always uses exactly the displayed snapshot.
  form.addEventListener('input',()=>preview.replaceChildren());form.addEventListener('change',()=>preview.replaceChildren());add.addEventListener('click',()=>preview.replaceChildren());entries.addEventListener('click',e=>{if((e.target as HTMLElement).tagName==='BUTTON')preview.replaceChildren();});
  form.onsubmit=e=>{e.preventDefault();preview.replaceChildren();try{
    const questions=buildNextDelphi(round,rounds,responses,[...retained],proposals);
    preview.append(el('h3',`Review · ${questions.length/2} claims`),el('p','Each claim has a rating and an optional explanation. New proposals start with no votes.'));
    questions.filter((_,i)=>i%2===0).forEach(q=>{const d=el('details');d.append(el('summary',`${q.parentClaimId?'New proposal':'Re-rate'} · ${q.sectionTitle||q.label}`),el('p',String(q.groupPrompt)),el('p',String((q.options as string[]).join(' · '))));preview.append(d);});
    if(publish){const open=el('button','Open reviewed round') as HTMLButtonElement;open.type='button';open.onclick=async()=>{open.disabled=true;try{await publish(questions);}catch(err){preview.append(el('p',err instanceof Error?err.message:'Could not open round.'));open.disabled=false;}};preview.append(el('p','Opening this round closes the current round to new responses.'),open);}else preview.append(el('p','Simulation preview only. No live round or responses will be created.'));
  }catch(err){preview.append(el('p',(err as Error).message));}};
  box.append(form);root.append(box);
}
