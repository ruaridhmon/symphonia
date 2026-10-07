import {expect,it} from 'vitest';
import {groupFinalClaims,groupedFinalMarkdown} from './finalGrouping';
const claim=(text:string,agree:number,disagree:number,unsure=0,missing=0)=>({text,origin:'explicit',positions:[{label:'Agree',count:agree},{label:'Disagree',count:disagree},{label:'Unable to judge',count:unsure},{label:'Not recorded',count:missing}]});
it('uses the exact threshold in either direction and retains every claim once',()=>{
 const claims=[claim('At the boundary.',3,2),claim('Opposed.',1,4),claim('Unknown.',0,0,5),claim('Missing.',1,0,0,4),claim('Unrated.',0,0)];
 const groups=groupFinalClaims(claims,60);expect(groups[0].claims.map(c=>c.text)).toEqual(['At the boundary.','Opposed.']);
 expect(groups.flatMap(g=>g.claims)).toHaveLength(5);expect(groupFinalClaims(claims,61)[0].claims.map(c=>c.text)).toEqual(['Opposed.']);
});
it('includes unsure and missing positions instead of inflating agreement',()=>{
 expect(groupFinalClaims([claim('Only half agree.',2,0,1,1)],60)[0].claims).toHaveLength(0);
});
it('preserves inferred origins, verbatim wording and both grouping formats in export',()=>{
 const claims=[{...claim('An unconfirmed assumption.',4,1),origin:'inferred'},claim('Contested | claim.',2,3)];
 const text=groupedFinalMarkdown('Panel',claims,80,'text',['Opening question?']);const table=groupedFinalMarkdown('Panel',claims,80,'table');
 expect(text).toContain('## Consensus');expect(text).toContain('## Disagreement');expect(text).toContain('An unconfirmed assumption.');expect(text).toContain('unconfirmed');expect(text).toContain('Opening question?');
 expect(table).toContain('Contested \\| claim.');expect(table).toContain('80%');expect(table).toContain('Inferred · unconfirmed');
});

it('keeps recorded neutral positions distinct from missing ratings',()=>{
 const c={text:'Neutral matters.',origin:'explicit',positions:[{label:'Agree',count:2},{label:'Neither agree nor disagree',count:2},{label:'Not answered',count:1}]};
 expect(groupFinalClaims([c],60)[0].claims).toHaveLength(0);
 const exported=groupedFinalMarkdown('Panel',[c],60,'table');expect(exported).toContain('Other positions');expect(exported).toContain('| 40% | 0% | 0% | 20% | 40% |');
});
