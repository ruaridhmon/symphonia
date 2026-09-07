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
