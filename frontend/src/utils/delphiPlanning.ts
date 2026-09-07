import type { Round, RoundWithResponses } from '../types/summary';
import { ratingProgress } from './delphiProgress';
/** Round 2 is the frozen claim set. Round 3 changes feedback, never claims or scales. */
export function buildFixedDelphiRound(round:Round,rounds:Round[],responses:RoundWithResponses[]) {
  if(round.round_number!==2 || rounds.some(r=>r.round_number>=3))throw new Error('This Delphi has three rounds. No further rating round is available.');
  const baseline=rounds.find(r=>r.round_number===2) || round;
  const rows=ratingProgress(baseline,rounds,responses);
  if(!rows.length)throw new Error('No recorded claim questionnaire is available.');
  return baseline.questions.map(q=>{
    if(typeof q==='string')return q;
    const row=rows.find(r=>r.key===String(q.questionId));
    if(row)return {...q,groupPrompt:[`Round 2: ${row.votes[0]} agree, ${row.votes[1]} disagree, ${row.votes[2]} neutral, ${row.votes[3]} unable to judge; ${row.answered} answered.`, 'Review the other participants’ reasoning, then rate this same claim again. You do not need to change your mind.',...row.evidence.filter(e=>e.comment).map(e=>`${e.position}: ${e.comment}`)].join('\n')};
    if(/comment|clarification|justify/i.test(String(q.label)))return {...q,label:'Justify your position',placeholder:'Explain why you chose this rating and what evidence or reasoning supports it. (optional)'};
    return {...q};
  });
}
