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
 expect(client.post).toHaveBeenCalledWith('/forms/1/final_synthesis',{expected_revision:'revision',complete:false});
});
it('keeps snapshot controls in consultation options and removes them when leaving synthesis',async()=>{
 const account={revision:'revision',title:'Panel',stage:4,markdown:'Account',round_two_count:3,round_three_count:3,claims:[],saved_at:'2026-10-06T00:00:00Z'};
 client.get.mockResolvedValue({preview:account,saved:account,stale:false,collection_open:false});
 const {unmount}=render(<section className="consultation-workspace"><details className="cw-options"><summary>Consultation options</summary><div/></details><FinalSynthesisPanel formId={1} questions={['What should schools do about phones?']}/></section>);
 await waitFor(()=>expect(document.querySelector('.cw-options .fs-menu-actions')).not.toBeNull());
 expect(document.querySelector('.final-synthesis .fs-menu-actions')).toBeNull();
 expect(screen.getByRole('heading',{name:'Consensus 0'})).toBeInTheDocument();
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
 await screen.findByRole('heading',{name:'Consensus 1'});fireEvent.click(screen.getByRole('button',{name:'Table'}));
 expect(screen.getByRole('table',{name:'Consensus claims'})).toHaveTextContent('A supported claim.');expect(screen.getByRole('table',{name:'Disagreement claims'})).toHaveTextContent('Inferred · unconfirmed');
 fireEvent.click(screen.getByText('Consensus ≥ 60%'));fireEvent.change(screen.getByRole('slider',{name:'Consensus threshold'}),{target:{value:'80'}});
 expect(screen.queryByRole('table',{name:'Consensus claims'})).not.toBeInTheDocument();expect(screen.getByRole('table',{name:'Disagreement claims'})).toHaveTextContent('A supported claim.');
 expect(client.post).not.toHaveBeenCalled();expect(JSON.parse(localStorage.getItem('symphonia:final-view:v1:4')!)).toEqual({threshold:80,view:'table'});
 fireEvent.click(screen.getByRole('button',{name:'Text'}));expect(screen.queryByRole('table')).not.toBeInTheDocument();expect(screen.getByText(/unconfirmed assumption/)).toBeInTheDocument();
});
