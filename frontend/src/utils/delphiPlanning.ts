import type { Round, RoundWithResponses } from '../types/summary';
import { ratingProgress } from './delphiProgress';
/** Round 2 is the frozen claim set. Round 3 changes feedback, never claims or scales. */
export function buildFixedDelphiRound(round:Round,rounds:Round[],responses:RoundWithResponses[]):(string|Record<string,unknown>)[] {
  if(round.round_number!==2 || rounds.some(r=>r.round_number>=3))throw new Error('This Delphi has three rounds. No further rating round is available.');
  const baseline=rounds.find(r=>r.round_number===2) || round;
  const rows=ratingProgress(baseline,rounds,responses);
  if(!rows.length)throw new Error('No recorded claim questionnaire is available.');
  return baseline.questions.map(q=>{
    if(typeof q==='string')return q;
    const row=rows.find(r=>r.key===String(q.questionId));
    if(row){
      const distribution=row.options.map(option=>({count:row.evidence.filter(e=>e.position===option).length,label:option.toLowerCase()})).filter(item=>item.count).map(item=>`${item.count} ${item.label}`);
      if(row.votes[5])distribution.push(`${row.votes[5]} unanswered`);
      if(row.votes[4])distribution.push(`${row.votes[4]} other response${row.votes[4]===1?'':'s'}`);
      const levels=[...new Set(row.evidence.map(e=>e.confidence).filter(Boolean))];
      const confidence=levels.map(level=>`${row.evidence.filter(e=>e.confidence===level).length} ${level.toLowerCase()}`).join(' · ');
      const reasons=row.evidence.filter(e=>e.comment.trim()).map(e=>`${e.participant}${e.position?' · '+e.position:''}${e.confidence?' · '+e.confidence:''}\n${e.comment}`);
      return {...q,groupPrompt:[q.claimOrigin==='inferred'?`Inferred · unconfirmed. Not directly stated by an expert. ${q.inferenceQuestion || ''}`:'',distribution.length?`Round 2: ${distribution.join(' · ')}.`:'',confidence?`Confidence: ${confidence}.`:'',...reasons].filter(Boolean).join('\n')};
    }
    if(/comment|clarification|justify|what led|explain your position/i.test(String(q.label)))return {...q,label:'Explain your position',placeholder:'Why do you agree or disagree? Share the reasoning or evidence behind your answer.'};
    return {...q};
  });
}
