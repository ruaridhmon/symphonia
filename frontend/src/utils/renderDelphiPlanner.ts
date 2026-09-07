import type { Round, RoundWithResponses } from '../types/summary';
import { buildFixedDelphiRound } from './delphiPlanning';
const el=(tag:string,text='')=>{const n=document.createElement(tag);n.textContent=text;return n;};
export function renderDelphiPlanner(root:HTMLElement,round:Round,rounds:Round[],responses:RoundWithResponses[],publish?: (questions:(string|Record<string,unknown>)[])=>Promise<void>) {
  const box=el('div');box.className='di-planner';root.append(box);
  if(round.round_number>=3){box.append(el('strong','Round 3 of 3 · Final ratings'),el('p','The same claims were rated in rounds 2 and 3. Compare the positions and justifications above; unresolved disagreement remains part of the result.'));return;}
  if(round.round_number!==2)return;
  const detail=el('details');detail.append(el('summary','Preview round 3 · Final ratings'),el('p','All claims, wording and rating options stay unchanged. Participants review the previous opinions, rate each claim again and justify their position.'));
  box.append(detail);
  try {
    const questions=buildFixedDelphiRound(round,rounds.filter(r=>r.round_number<=2),responses);
    questions.filter(q=>typeof q==='object'&&Array.isArray(q.options)).forEach(q=>{if(typeof q==='string')return;const item=el('details');item.append(el('summary',String(q.sectionTitle||q.label)),el('p',String(q.groupPrompt)),el('p',(q.options as string[]).join(' · ')),el('p','Justify your position — explain the reasoning behind your rating.'));detail.append(item);});
    if(publish&&!rounds.some(r=>r.round_number>=3)){const open=el('button','Open round 3') as HTMLButtonElement;open.type='button';open.onclick=async()=>{open.disabled=true;try{await publish(questions);}catch(e){detail.append(el('p',(e as Error).message));open.disabled=false;}};detail.append(open);}else detail.append(el('p',rounds.some(r=>r.round_number>=3)?'Round 3 already exists.':'Simulation preview only.'));
  }catch(e){detail.append(el('p',(e as Error).message));}
}
