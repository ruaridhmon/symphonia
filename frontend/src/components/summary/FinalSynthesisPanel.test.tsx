// @vitest-environment jsdom
import {fireEvent,render,screen,waitFor,cleanup} from '@testing-library/react';
import {afterEach,expect,it,vi} from 'vitest';
import FinalSynthesisPanel from './FinalSynthesisPanel';
const client=vi.hoisted(()=>({get:vi.fn(),post:vi.fn()}));
vi.mock('../../api/client',()=>({api:client,getApiErrorDetail:()=>null}));
afterEach(()=>{cleanup();vi.clearAllMocks();localStorage.clear();});
it('replaces the reasoning view after saving instead of appending duplicate graphs',async()=>{
 const graph={version:1,response_count:1,mapped_response_count:1,rejected_flow_count:0,flows:[{id:'one',title:'Original reasoning',response_number:1,nodes:[{id:'a',kind:'premise',text:'A premise.',quote:'Exact original words.'}],edges:[]}]};
 const account={revision:'revision',title:'Fictional panel',stage:4,markdown:'Account',round_two_count:1,round_three_count:1,claims:[],reasoning_graph:graph};
 client.get.mockResolvedValue({preview:account,saved:null,stale:false,collection_open:true});
 const saved={...account,saved_at:'2026-10-06T00:00:00Z'};
 client.post.mockResolvedValue({preview:saved,saved,stale:false,collection_open:true});
 render(<FinalSynthesisPanel formId={1}/>);
 await waitFor(()=>expect(document.querySelectorAll('.final-synthesis .rf-workspace')).toHaveLength(1));
 fireEvent.click(screen.getByRole('button',{name:'Save snapshot'}));
 await waitFor(()=>expect(screen.getByText(/Saved snapshot/)).toBeInTheDocument());
 expect(document.querySelectorAll('.final-synthesis .rf-workspace')).toHaveLength(1);
 expect(client.post).toHaveBeenCalledWith('/forms/1/final_synthesis',{expected_revision:'revision',complete:false,threshold:60});
});
it('keeps snapshot controls in consultation options and removes them when leaving synthesis',async()=>{
 const account={revision:'revision',title:'Panel',stage:4,markdown:'Account',round_two_count:3,round_three_count:3,claims:[],saved_at:'2026-10-06T00:00:00Z'};
 client.get.mockResolvedValue({preview:account,saved:account,stale:false,collection_open:false});
 const {unmount}=render(<section className="consultation-workspace"><details className="cw-options"><summary>Consultation options</summary><div/></details><FinalSynthesisPanel formId={1} questions={['What should schools do about phones?']}/></section>);
 await waitFor(()=>expect(document.querySelector('.cw-options .fs-menu-actions')).not.toBeNull());
 expect(document.querySelector('.final-synthesis .fs-menu-actions')).toBeNull();
 expect(screen.getByRole('button',{name:'Generate draft'})).toBeInTheDocument();
 expect(document.querySelector('.fs-question')).toHaveTextContent('What should schools do about phones?');
 expect(document.querySelector('.fs-question')?.nextElementSibling).toHaveClass('fs-display-controls');
 expect(document.querySelector('.cw-options')).toHaveTextContent('Save snapshot');
 expect(document.querySelector('.cw-options')).toHaveTextContent('Download synthesis');
 expect(client.post).not.toHaveBeenCalled();
 unmount();expect(document.querySelector('.fs-menu-actions')).toBeNull();
});

it('uses matching groups in text and table, and regroups without changing saved judgments',async()=>{
 const claims=[{id:'a',text:'A supported claim.',origin:'explicit',positions:[{label:'Agree',count:3},{label:'Disagree',count:2}],confidence:[],changes:0,matched:0,final_responses:[],round_two:[]},{id:'b',text:'An uncertain claim.',origin:'inferred',positions:[{label:'Unable to judge',count:5}],confidence:[],changes:0,matched:0,final_responses:[],round_two:[]}];
 const account={revision:'revision',title:'Panel',stage:4,markdown:'Account',round_two_count:5,round_three_count:5,claims};
 client.get.mockResolvedValue({preview:account,saved:account,stale:false,collection_open:false});render(<FinalSynthesisPanel formId={4}/>);
 await screen.findByRole('button',{name:'Generate draft'});fireEvent.click(screen.getByRole('button',{name:'Table'}));
 expect(screen.getByRole('table',{name:'Consensus claims'})).toHaveTextContent('A supported claim.');expect(screen.getByRole('table',{name:'Disagreement claims'})).toHaveTextContent('Inferred · unconfirmed');
 fireEvent.click(screen.getByText('Consensus ≥ 60%'));fireEvent.change(screen.getByRole('slider',{name:'Consensus threshold'}),{target:{value:'80'}});
 expect(screen.queryByRole('table',{name:'Consensus claims'})).not.toBeInTheDocument();expect(screen.getByRole('table',{name:'Disagreement claims'})).toHaveTextContent('A supported claim.');
 expect(client.post).not.toHaveBeenCalled();expect(JSON.parse(localStorage.getItem('symphonia:final-view:v1:4')!)).toEqual({threshold:80,view:'table'});
 fireEvent.click(screen.getByRole('button',{name:'Text'}));expect(screen.queryByRole('table')).not.toBeInTheDocument();expect(screen.getByRole('status')).toHaveTextContent('Generate a draft');
});

it('generates model text once, retains table math, and hides prose after threshold changes',async()=>{
 const claims=[{id:'a',text:'Retain access exceptions.',origin:'explicit',positions:[{label:'Agree',count:3},{label:'Disagree',count:2}],confidence:[],changes:0,matched:0,final_responses:[],round_two:[]}];
 const account={revision:'r1',title:'Panel',stage:4,markdown:'Audit',round_two_count:5,round_three_count:5,claims};
 const result={preview:account,saved:null,stale:false,collection_open:false};
 const narrative={revision:'r1',threshold:60,model:'configured-model',generated_at:'2026-10-07T00:00:00Z',prompt_version:'v1',sections:[{id:'consensus',paragraphs:[{text:'Experts supported exceptions to preserve access, while dissent centred on how they would be applied.',claim_ids:['a']}]},{id:'disagreement',paragraphs:[]}]};
 client.get.mockResolvedValue(result);client.post.mockResolvedValue({...result,narrative});
 render(<FinalSynthesisPanel formId={5}/>);fireEvent.click(await screen.findByRole('button',{name:'Generate draft'}));
 await screen.findByText(narrative.sections[0].paragraphs[0].text);
 expect(client.post).toHaveBeenCalledTimes(1);expect(client.post).toHaveBeenCalledWith('/forms/5/final_synthesis/generate',{expected_revision:'r1',threshold:60});
 fireEvent.click(screen.getByRole('button',{name:'Table'}));expect(screen.getByRole('table',{name:'Consensus claims'})).toHaveTextContent('60%');
 fireEvent.click(screen.getByRole('button',{name:'Text'}));fireEvent.change(screen.getByRole('slider',{name:'Consensus threshold'}),{target:{value:'80'}});
 expect(screen.queryByText(narrative.sections[0].paragraphs[0].text)).not.toBeInTheDocument();expect(screen.getByRole('status')).toHaveTextContent('Generate a new draft');expect(client.post).toHaveBeenCalledTimes(1);
});
it('does not display a narrative written for different recorded judgments',async()=>{
 const account={revision:'current',title:'Panel',stage:4,markdown:'Audit',round_two_count:2,round_three_count:2,claims:[]};
 client.get.mockResolvedValue({preview:account,saved:null,stale:false,collection_open:false,narrative:{revision:'old',threshold:60,sections:[{id:'consensus',paragraphs:[{text:'Stale model paragraph',claim_ids:[]}]}]}});
 render(<FinalSynthesisPanel formId={6}/>);await screen.findByRole('button',{name:'Generate draft'});expect(screen.queryByText('Stale model paragraph')).not.toBeInTheDocument();
});
