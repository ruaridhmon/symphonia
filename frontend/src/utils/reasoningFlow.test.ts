import {beforeAll,expect,it} from 'vitest';
beforeAll(()=>{HTMLDialogElement.prototype.showModal=function(){this.open=true;};HTMLDialogElement.prototype.close=function(){this.open=false;};});
import {renderReasoningFlow} from './reasoningFlow';
import {renderDelphiInsights} from './renderDelphiInsights';
import type {ReasoningGraph} from '../types/synthesis';
const graph:ReasoningGraph={version:1,response_count:2,mapped_response_count:2,rejected_flow_count:0,flows:[{id:'one',title:'First argument',response_number:1,nodes:[{id:'a',kind:'premise',text:'A premise',quote:'Original words.',source_text:'Original words. Full context.'},{id:'b',kind:'assumption',text:'A possible bridge',question:'Is this what you mean?'}],edges:[{from:'a',to:'b',relation:'supports'}]},{id:'two',title:'A different view',response_number:2,nodes:[{id:'x',kind:'recommendation',text:'Different recommendation',quote:'Another response.'}],edges:[]}]};
it('switches contributions and exposes sources without attributing assumptions',()=>{
 const root=document.createElement('div');document.body.replaceChildren(root);renderReasoningFlow(root,graph);
 expect(root.querySelector('.rf-detail')?.textContent).toContain('Original words.');
 (root.querySelector('[data-rf-node="b"]') as HTMLElement).click();expect(root.querySelector('.rf-detail')?.textContent).toContain('Inferred · unconfirmed');expect(root.querySelector('.rf-detail')?.textContent).toContain('Is this what you mean?');expect(root.querySelector('.rf-detail')?.textContent).not.toContain('Original words.');
 const picker=root.querySelector<HTMLSelectElement>('.rf-source-picker')!;picker.value='1';picker.dispatchEvent(new Event('change'));expect(root.querySelectorAll('.rf-node')).toHaveLength(1);expect(root.querySelector('.rf-detail')?.textContent).toContain('Another response.');
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

it('shows a saved first-round graph even when synthesis already has parsed claim rows',()=>{
 const root=document.createElement('div');const base={id:1,round_number:1,is_active:true,questions:['Views?'],synthesis:'<p>Claim 1: Phones interrupt lessons.</p>',synthesis_json:{narrative:'<p>Claim 1: Phones interrupt lessons.</p>',reasoning_graph:graph} as any};
 renderDelphiInsights(root,base,[base],[]);expect(root.querySelector('.rf-workspace')).not.toBeNull();
});

it('uses matching numbers and keeps evidence closed until selection',()=>{
 const root=document.createElement('div');renderReasoningFlow(root,graph);
 expect(root.querySelector('.rf-number')?.textContent).toBe('1.1');expect(root.querySelector<HTMLElement>('.rf-detail')?.hidden).toBe(true);
 (root.querySelector('[data-rf-node="b"]') as HTMLButtonElement).click();expect(root.querySelector<HTMLElement>('.rf-detail')?.hidden).toBe(false);expect(root.textContent).not.toContain('EXPLICIT · SOURCE-LINKED CLAIM');expect(root.querySelector('.rf-header')).toBeNull();
});

it('orders dependent claims after premises and links only to their upstream reasoning',()=>{
 const root=document.createElement('div');const copy=structuredClone(graph);copy.flows[0].nodes.reverse();renderReasoningFlow(root,copy);
 expect([...root.querySelectorAll('[data-rf-node]')].map(n=>(n as HTMLElement).dataset.rfNode)).toEqual(['a','b']);
 expect(root.querySelector('.rf-wires')).toBeNull();expect(root.querySelector('.rf-list-origin')?.textContent).toBe('Inferred assumption · unconfirmed');
 expect(root.querySelectorAll('.rf-dependencies button')).toHaveLength(1);expect(root.querySelector('.rf-dependencies')?.textContent).toContain('Supported by 1.1');
 (root.querySelector('.rf-dependencies button') as HTMLButtonElement).click();expect(root.querySelector('.rf-detail')?.textContent).toContain('Original words.');
});
