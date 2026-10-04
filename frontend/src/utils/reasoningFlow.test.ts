import {expect,it} from 'vitest';
import {renderReasoningFlow} from './reasoningFlow';
import {renderDelphiInsights} from './renderDelphiInsights';
import type {ReasoningGraph} from '../types/synthesis';
const graph:ReasoningGraph={version:1,response_count:2,mapped_response_count:2,rejected_flow_count:0,flows:[{id:'one',title:'First argument',response_number:1,nodes:[{id:'a',kind:'premise',text:'A premise',quote:'Original words.',source_text:'Original words. Full context.'},{id:'b',kind:'assumption',text:'A possible bridge',question:'Is this what you mean?'}],edges:[{from:'a',to:'b',relation:'supports'}]},{id:'two',title:'A different view',response_number:2,nodes:[{id:'x',kind:'recommendation',text:'Different recommendation',quote:'Another response.'}],edges:[]}]};
it('switches contributions and exposes sources without attributing assumptions',()=>{
 const root=document.createElement('div');document.body.replaceChildren(root);renderReasoningFlow(root,graph);
 expect(root.querySelector('.rf-detail')?.textContent).toContain('Original words.');
 (root.querySelector('[data-rf-node="b"]') as HTMLElement).click();expect(root.querySelector('.rf-detail')?.textContent).toContain('INFERRED · UNCONFIRMED');expect(root.querySelector('.rf-detail')?.textContent).toContain('Is this what you mean?');expect(root.querySelector('.rf-detail')?.textContent).not.toContain('Original words.');
 (root.querySelectorAll('.rf-tabs button')[1] as HTMLElement).click();expect(root.querySelectorAll('.rf-node')).toHaveLength(1);expect(root.querySelector('.rf-detail')?.textContent).toContain('Another response.');
});
it('renders source content as text, not executable HTML',()=>{
 const root=document.createElement('div');const copy=structuredClone(graph);copy.flows[0].nodes[0].quote='<img src=x onerror=alert(1)>';renderReasoningFlow(root,copy);expect(root.querySelector('img')).toBeNull();expect(root.textContent).toContain('<img src=x');
});
it('shows reasoning only in round one and only for its matching saved synthesis',()=>{
 const root=document.createElement('div');const base={id:1,round_number:1,is_active:true,questions:['Views?'],synthesis:'saved',synthesis_json:{narrative:'saved',reasoning_graph:graph} as any};
 renderDelphiInsights(root,base,[base],[{...base,responses:[]}]);expect(root.querySelector('.rf-workspace')).not.toBeNull();
 renderDelphiInsights(root,{...base,round_number:2},[base],[]);expect(root.querySelector('.rf-workspace')).toBeNull();
 renderDelphiInsights(root,{...base,synthesis:'edited'},[base],[]);expect(root.querySelector('.rf-workspace')).toBeNull();
});
