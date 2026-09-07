import {it,expect} from 'vitest';
import {responseSections} from './responseReading';
const q=[{questionId:'c1',sectionTitle:'Claim 1: A precise claim',label:'Your response',inputType:'single_select',options:['Agree','Disagree']},{questionId:'why',sectionTitle:'Claim 1: A precise claim',label:'Explain your position',inputType:'textarea'}];
it('groups the actual claim, exact rating and unchanged reasoning together',()=>{
 const rows=responseSections(q,{q1:{position:'Strongly disagree'},q2:{position:'First line.\nSecond line.'}});
 expect(rows).toEqual([{title:'A precise claim',rating:'Strongly disagree',blocks:[{label:'Reasoning',text:'First line.\nSecond line.'}]}]);
});
it('reads question IDs, retains evidence and preserves orphaned answers',()=>{
 const rows=responseSections(q,{c1:{position:'Agree',evidence:'Observed result'},why:{position:'Because of this result'},unmapped:{position:'Still visible'}});
 expect(rows[0].blocks).toEqual([{label:'Evidence',text:'Observed result'},{label:'Reasoning',text:'Because of this result'}]);
 expect(rows[1].blocks[0].text).toContain('Still visible');
});
it('does not merge unrelated questions and retains zero-valued answers',()=>{
 const rows=responseSections(['First','Second'],{q1:0,q2:'An independent answer'});
 expect(rows).toHaveLength(2);expect(rows[0].blocks[0].text).toBe('0');
});
it('shows the open question instead of a generic section heading and hides empty metadata',()=>{
 const rows=responseSections([{label:'What should we do?',sectionTitle:'Section 1',inputType:'textarea'}],{q1:{position:'Keep it simple.',citations:[],expertNominations:[]}});
 expect(rows[0].title).toBe('What should we do?');expect(rows[0].blocks).toEqual([{label:'',text:'Keep it simple.'}]);
});
