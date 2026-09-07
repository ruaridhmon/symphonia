import { describe, expect, it } from 'vitest';
import { ratingProgress, synthesisProvenanceNote } from './delphiProgress';
import type { Round, RoundWithResponses } from '../types/summary';
const question = {questionId:'claim_1_response', label:'Your response', sectionTitle:'Insulation before every heat pump', inputType:'single_select', options:['Agree','Disagree','Unable to judge — need more information']};
const makeRound = (id: number): Round => ({id, round_number:id, synthesis:'', is_active:id===2, questions:[question], response_count:3});
const votes = (id: number, values: string[]): RoundWithResponses => ({id,round_number:id,synthesis:'',is_active:true,responses:values.map((position,i)=>({id:i,round_id:id,email:null,timestamp:'',version:1,answers:{q1:{position}}}))});
describe('recorded Delphi progress', () => {
  it('includes neutral and uncertain votes, separates omissions, and compares exact claims', () => {
    const rounds=[makeRound(1),makeRound(2)];
    const [row]=ratingProgress(rounds[1],rounds,[votes(1,['Agree','Disagree']),votes(2,['Strongly agree','Neither agree nor disagree','Unable to judge — need more information',''])]);
    expect(row.votes).toEqual([1,0,1,1,0,1]);
    expect(row.answered).toBe(3);
    expect(row.percent).toBeCloseTo(100/3);
    expect(row.delta).toBeCloseTo(100/3-50);
  });
  it('does not compare a rewritten claim or a changed rating scale', () => {
    const rounds=[makeRound(1),makeRound(2)];
    rounds[1].questions=[{...question,sectionTitle:'Insulation where cost effective'}];
    expect(ratingProgress(rounds[1],rounds,[votes(1,['Agree']),votes(2,['Agree'])])[0].delta).toBeNull();
    rounds[1].questions=[{...question,options:['Strongly agree','Disagree']}];
    expect(ratingProgress(rounds[1],rounds,[votes(1,['Agree']),votes(2,['Agree'])])[0].delta).toBeNull();
  });
  it('does not turn missing votes into zero percent agreement', () => {
    const r=makeRound(2);
    expect(ratingProgress(r,[r],[votes(2,[''])])[0].percent).toBeNull();
  });
  it('labels empty and copied summaries on historical as well as live rounds', () => {
    const r={...makeRound(2),is_active:false,response_count:0,synthesis:'Earlier result'};
    expect(synthesisProvenanceNote(r,[r])).toContain('not a result from this round');
    const p={...makeRound(1),synthesis:'Earlier result'};
    expect(synthesisProvenanceNote({...r,response_count:10},[p,r])).toContain('matches Round 1');
  });
});

it('matches returning identities, preserves reasons and excludes ambiguous duplicate identities', () => {
  const rounds=[makeRound(1),makeRound(2)];
  rounds.forEach(r=>r.questions.push({questionId:'claim_1_comment',sectionTitle:question.sectionTitle,label:'Comments or clarification',inputType:'textarea'}));
  const prior=votes(1,['Agree','Disagree']);const current=votes(2,['Disagree','Disagree']);
  prior.responses.forEach((r,i)=>r.email=`synthetic-${i}`);current.responses.forEach((r,i)=>r.email=`synthetic-${i}`);
  current.responses[0].answers.q2={position:'The exception changes my view.'};
  const row=ratingProgress(rounds[1],rounds,[prior,current])[0];
  expect(row.matched).toBe(2);expect(row.changed).toBe(1);
  expect(row.evidence[0].comment).toBe('The exception changes my view.');
  expect(row.history.map(h=>h.percent)).toEqual([50,0]);
  current.responses.push({...current.responses[0],id:22});
  expect(ratingProgress(rounds[1],rounds,[prior,current])[0].matched).toBe(1);
});
