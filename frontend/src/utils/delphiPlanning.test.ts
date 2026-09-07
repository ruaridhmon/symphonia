import {describe,it,expect} from 'vitest';
import {buildNextDelphi} from './delphiPlanning';
import {ratingProgress} from './delphiProgress';
import type {Round,RoundWithResponses} from '../types/summary';
const q={questionId:'original',sectionTitle:'Reserve half of savings for staffing.',label:'Your response',inputType:'single_select',options:['Agree','Disagree']};
const round:Round={id:3,round_number:3,is_active:true,synthesis:'',questions:[q]};
const responses:RoundWithResponses[]=[{...round,responses:[{id:1,round_id:3,email:null,timestamp:'',version:1,answers:{q1:{position:'Agree'}}}]}];
const proposal={id:'new',parentId:'original',text:'Fund staffing where shortages are demonstrated.',rationale:'Test needs-based allocation rather than a fixed percentage.'};
describe('linked Delphi planning',()=>{
 it('keeps original identifiers and starts linked proposals without inherited votes',()=>{
  const questions=buildNextDelphi(round,[round],responses,['original'],[proposal]);
  expect(questions[0].questionId).toBe('original');expect(questions[0].options).toEqual(q.options);
  expect(questions[2].parentClaimId).toBe('original');expect(questions[2].introducedRound).toBe(4);
  const next={...round,id:4,round_number:4,questions};
  const rows=ratingProgress(next,[round,next],responses);
  expect(rows[1].answered).toBe(0);expect(rows[1].delta).toBeNull();expect(rows[1].history).toEqual([]);
 });
 it('allows an original to leave the next questionnaire without mutating prior results',()=>{
  expect(buildNextDelphi(round,[round],responses,[],[proposal])).toHaveLength(2);
  expect(round.questions).toEqual([q]);expect(responses[0].responses).toHaveLength(1);
 });
 it('rejects orphaned, empty and duplicate proposals',()=>{
  for(const p of [{...proposal,parentId:'absent'},{...proposal,text:''},{...proposal,text:q.sectionTitle}])expect(()=>buildNextDelphi(round,[round],responses,[],[p])).toThrow();
  expect(()=>buildNextDelphi(round,[round],responses,[],[])).toThrow();
 });
});

import {renderDelphiPlanner} from './renderDelphiPlanner';
it('requires review before publishing and invalidates preview when edited',()=>{
 const root=document.createElement('div');document.body.append(root);renderDelphiPlanner(root,round,[round],responses,async()=>{});
 expect(root.textContent).not.toContain('Open reviewed round');
 (root.querySelector('input') as HTMLInputElement).click();
 root.querySelector('form')!.dispatchEvent(new Event('submit',{cancelable:true}));
 expect(root.textContent).toContain('Open reviewed round');
 (root.querySelector('input') as HTMLInputElement).click();
 expect(root.textContent).not.toContain('Open reviewed round');
});
