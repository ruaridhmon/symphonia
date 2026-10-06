// @vitest-environment jsdom
import {fireEvent,render,screen,waitFor,cleanup} from '@testing-library/react';
import {afterEach,expect,it,vi} from 'vitest';
import FinalSynthesisPanel from './FinalSynthesisPanel';
const client=vi.hoisted(()=>({get:vi.fn(),post:vi.fn()}));
vi.mock('../../api/client',()=>({api:client,getApiErrorDetail:()=>null}));
afterEach(()=>{cleanup();vi.clearAllMocks();});
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
