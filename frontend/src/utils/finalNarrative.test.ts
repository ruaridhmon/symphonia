import {expect,it} from 'vitest';
import {finalNarrative} from './finalNarrative';
it('preserves exact claims and minority disagreement without turning ratings into a policy conclusion',()=>{
 const claims=[{text:'Evidence is weak.',origin:'explicit',positions:[{label:'Agree',count:2},{label:'Unable to judge',count:1}]},{text:'Ban all phones.',origin:'explicit',positions:[{label:'Agree',count:1},{label:'Disagree',count:1},{label:'Unable to judge',count:1}]},{text:'Storage reduces interruptions.',origin:'inferred',positions:[{label:'Agree',count:2},{label:'Disagree',count:1}]}];
 const prose=finalNarrative(claims).join('\n');
 for(const c of claims)expect(prose).toContain(c.text);
 expect(prose).toContain('remained divided');expect(prose).toContain('unable to judge');expect(prose).toContain('unconfirmed assumption');expect(prose).toContain('Experts disagreed');expect(prose).not.toContain('confident');expect(prose).not.toContain('consensus');
});
it('does not manufacture agreement from absent or unsure positions',()=>{
 const prose=finalNarrative([{text:'A claim.',origin:'explicit',positions:[{label:'Agree',count:1},{label:'Not recorded',count:2}]}]).join('');expect(prose).toContain('No clear shared position');expect(prose).not.toContain('broad support');
});

it('leads supported prose with the substantive claims rather than a generic endorsement',()=>{const claim={text:'Trials should measure workload intensity.',origin:'explicit',positions:[{label:'Agree',count:4},{label:'Disagree',count:1}]};const text=finalNarrative([claim],60)[0];expect(text).toMatch(/^Trials should measure workload intensity\./);expect(text).not.toContain('supported this account');expect(text).toContain('not unanimous');});
