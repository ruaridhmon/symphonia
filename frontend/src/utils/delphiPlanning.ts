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
      const distribution=row.options.map(option=>`${row.evidence.filter(e=>e.position===option).length} ${option.toLowerCase()}`).join(' · ');
      const confidence=['Not at all confident','Slightly confident','Moderately confident','Very confident','Extremely confident'].map(level=>`${row.evidence.filter(e=>e.confidence===level).length} ${level.toLowerCase()}`).join(' · ');
      return {...q,groupPrompt:[q.claimOrigin==='inferred'?`Inferred · unconfirmed. Not directly stated by an expert. ${q.inferenceQuestion || ''}`:'',`Round 2 positions: ${distribution}. ${row.votes[5]} not answered; ${row.votes[4]} unrecognised.`,row.hasConfidence?`Separate confidence: ${confidence}. ${row.evidence.filter(e=>!e.confidence).length} not recorded.`:'Separate confidence was not collected in this questionnaire.','Keep or revise your position and confidence after considering the panel. Persistent disagreement is valid.',...row.evidence.map(e=>`${e.participant}: ${e.position || 'Not answered'}; confidence: ${e.confidence || 'not recorded'}. ${e.comment || 'No justification supplied.'}`)].filter(Boolean).join('\n')};
    }
    if(/comment|clarification|justify|what led|explain your position/i.test(String(q.label)))return {...q,label:'Explain your position',placeholder:'Why do you agree or disagree? Share the reasoning or evidence behind your answer.'};
    return {...q};
  });
}
