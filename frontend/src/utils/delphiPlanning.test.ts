import {it,expect} from 'vitest';
import {buildFixedDelphiRound} from './delphiPlanning';
import type {Round} from '../types/summary';
const questions=[{questionId:'claim_1_response',sectionTitle:'Keep this exact claim.',label:'Your response',inputType:'single_select',options:['Strongly agree','Agree','Neither agree nor disagree','Disagree','Strongly disagree','Unable to judge — need more information']},{questionId:'claim_1_comment',sectionTitle:'Keep this exact claim.',label:'Comments or clarification',inputType:'textarea',optional:true}];
const r:Round={id:2,round_number:2,is_active:true,synthesis:'',questions};
it('preserves every frozen claim, identifier and scale, and relabels justification',()=>{
 const result=buildFixedDelphiRound(r,[r],[]);expect(result).toHaveLength(2);
 expect(result[0]).toMatchObject(questions[0]);expect(result[1]).toMatchObject({questionId:'claim_1_comment',label:'Explain your position'});
 expect(questions[1].label).toBe('Comments or clarification');
});
it('prevents a fourth round and a duplicate third round',()=>{
 expect(()=>buildFixedDelphiRound({...r,round_number:3},[r],[])).toThrow();
 expect(()=>buildFixedDelphiRound(r,[r,{...r,id:3,round_number:3}],[])).toThrow();
});

import {buildDelphiRoundTwoQuestions} from './delphiRoundTwo';
it('carries agreement and separate confidence unchanged into round three',()=>{
 const generated=buildDelphiRoundTwoQuestions('<p>Claim 1: <strong>Keep this claim.</strong></p>');
 const baseline={...r,questions:generated} as Round;
 const result=buildFixedDelphiRound(baseline,[baseline],[]);
 expect(result).toHaveLength(3);
 const {groupPrompt: _feedback,...fixed}=generated[0] as Record<string,unknown>;
 expect(result[0]).toMatchObject(fixed);
 expect(result[1]).toEqual(generated[1]);
});

it('shows full strength, independent confidence, and anonymised reasons before reconsideration',()=>{
 const q=buildDelphiRoundTwoQuestions('<p>Claim 1: <strong>Keep this claim.</strong></p>');
 (q[0] as Record<string,unknown>).options=questions[0].options; // Historical strength scale remains frozen.
 const round={...r,questions:q} as Round;
 const answers=[{q1:{position:'Strongly agree'},q2:{position:'Slightly confident'},q3:{position:'Weak evidence supports a cautious approach.'}},{q1:{position:'Disagree'},q2:{position:'Very confident'},q3:{position:'A minority objection.'}}];
 const data={id:2,round_number:2,is_active:true,synthesis:'',responses:answers.map((a,i)=>({id:i,round_id:2,email:'private-'+i,timestamp:'',version:1,answers:a}))};
 const result=buildFixedDelphiRound(round,[round],[data]) as Record<string,unknown>[];
 expect(result[0].groupPrompt).toContain('1 strongly agree');
 expect(result[0].groupPrompt).toContain('1 slightly confident');
 expect(result[0].groupPrompt).toContain('A minority objection.');
 expect(result[0].groupPrompt).not.toContain('private-');
});

it('shows only recorded counts and supplied reasons, without repeated advice or empty ballots',()=>{
 const q=buildDelphiRoundTwoQuestions('<p>Claim 1: <strong>Keep this claim.</strong></p>');
 const round={...r,questions:q} as Round;
 const data={id:2,round_number:2,is_active:true,synthesis:'',responses:[{id:1,round_id:2,email:'private',timestamp:'',version:1,answers:{q1:{position:'Disagree'},q2:{position:'Very confident'},q3:{position:''}}}]};
 const result=buildFixedDelphiRound(round,[round],[data]) as Record<string,unknown>[];
 expect(result[0].groupPrompt).toBe('Round 2: 1 disagree.\nConfidence: 1 very confident.');
 expect(result[0].options).toEqual((q[0] as Record<string,unknown>).options);
 data.responses[0].answers.q3.position='No justification supplied.';
 expect((buildFixedDelphiRound(round,[round],[data])[0] as Record<string,unknown>).groupPrompt).toContain('No justification supplied.');
});
