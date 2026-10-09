import { expect, it, vi } from 'vitest';
import { prepareRoundTwoEntry } from './prepareRoundTwoEntry';
const api=vi.hoisted(()=>({getRounds:vi.fn(),updateRound:vi.fn()}));
vi.mock('../api/rounds',()=>api);
const old={questionId:'claim_1_response',sectionTitle:'Claim 1: Preserve this wording',label:'Do you agree?',inputType:'likert',options:['Strongly agree','Agree','Disagree','Strongly disagree']};
const confidence={questionId:'claim_1_confidence',label:'Confidence',inputType:'single_select',options:['Low','High'],optional:true};
const round={id:2,round_number:2,is_active:true,synthesis:'',questions:[old,confidence]};
it('updates an empty second-round scale while retaining claim wording, IDs and confidence scale',async()=>{
 api.getRounds.mockResolvedValue([{...round,response_count:0,draft_count:0}]);api.updateRound.mockImplementation(async(_f,_r,config)=>({questions:config.questions}));
 const questions=await prepareRoundTwoEntry(9,round);
 expect(questions[0]).toEqual({...old,inputType:'single_select',options:['Agree','Neither agree nor disagree','Disagree'],optional:false});
 expect(questions[1]).toEqual({...confidence,optional:false});
 expect(api.updateRound).toHaveBeenLastCalledWith(9,2,{questions,expected_questions:round.questions,require_unanswered:true});
});
it.each([{response_count:1},{draft_count:1},{is_active:false}])('retains an occupied or historical questionnaire: %o',async(status)=>{
 api.updateRound.mockClear();api.getRounds.mockResolvedValue([{...round,...status}]);
 expect(await prepareRoundTwoEntry(9,round)).toBe(round.questions);expect(api.updateRound).not.toHaveBeenCalled();
});
it('retains fixed scales once Round 3 exists',async()=>{
 api.updateRound.mockClear();api.getRounds.mockResolvedValue([round,{...round,id:3,round_number:3}]);
 expect(await prepareRoundTwoEntry(9,round)).toBe(round.questions);expect(api.updateRound).not.toHaveBeenCalled();
});
it('replaces a copied opening question only with claims extracted from the saved first-round synthesis',async()=>{
 api.getRounds.mockResolvedValue([{...round,id:1,round_number:1,synthesis:'<div><p>Claim 1: <strong>Humans should set research priorities.</strong></p></div>'},{...round,questions:['Opening question']}]);
 const questions=await prepareRoundTwoEntry(9,{...round,questions:['Opening question']});
 expect(questions).toHaveLength(3);expect(questions[0]).toMatchObject({claimText:'Humans should set research priorities.',options:['Agree','Neither agree nor disagree','Disagree']});
});
