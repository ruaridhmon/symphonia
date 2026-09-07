import type { Round, RoundWithResponses } from '../types/summary';
import { ratingProgress } from './delphiProgress';
export type Proposal = {id:string; parentId:string; text:string; rationale:string};
export function buildNextDelphi(round:Round, rounds:Round[], responses:RoundWithResponses[], retained:string[], proposals:Proposal[]) {
  const rows=ratingProgress(round,rounds,responses);
  const questions:Record<string,unknown>[]=[];
  for(const row of rows.filter(r=>retained.includes(r.key))) {
    const original=round.questions.find(q=>typeof q==='object'&&String(q.questionId)===row.key) as Record<string,unknown>;
    const comments=row.evidence.filter(e=>e.comment).map(e=>`${e.position}: ${e.comment}`).join('\n');
    questions.push({...original,groupPrompt:`Previous round: ${row.votes[0]} agree, ${row.votes[1]} disagree, ${row.votes[2]} neutral, ${row.votes[3]} unable to judge; ${row.answered} answered. Retain or revise your view independently.\n${comments}`});
    questions.push({questionId:row.key+'_reason',sectionTitle:original.sectionTitle||original.label,label:'Comments or clarification',inputType:'textarea',optional:true,placeholder:'What explains your position? What evidence or condition would change it?',requireEvidence:false,requireConfidence:false,requireCounterarguments:false});
  }
  for(const p of proposals) {
    const parent=rows.find(r=>r.key===p.parentId);
    if(!parent||!p.text.trim()||!p.rationale.trim())throw new Error('Each proposal needs a parent claim, wording and a reason.');
    if(p.text.trim()===parent.label.replace(/^Claim\s+\d+:\s*/i,''))throw new Error('Re-rate the original claim instead of adding identical wording.');
    const sectionTitle=p.text.trim();
    questions.push({questionId:p.id,sectionTitle,label:'Your response',inputType:'single_select',options:['Strongly agree','Agree','Neither agree nor disagree','Disagree','Strongly disagree','Unable to judge — need more information'],optional:false,parentClaimId:p.parentId,parentClaimText:parent.label,claimRationale:p.rationale.trim(),introducedRound:Math.max(...rounds.map(r=>r.round_number))+1,groupPrompt:`New proposal, not previously rated. Related to: ${parent.label}\nWhy test this: ${p.rationale.trim()}\nJudge this wording independently; earlier votes do not apply.`,requireEvidence:false,requireConfidence:false,requireCounterarguments:false});
    questions.push({questionId:p.id+'_reason',sectionTitle,label:'Comments or clarification',inputType:'textarea',optional:true,placeholder:'What supports your view? What remains unresolved?',requireEvidence:false,requireConfidence:false,requireCounterarguments:false});
  }
  if(!questions.length)throw new Error('Select a claim or add a proposal before continuing.');
  return questions;
}
