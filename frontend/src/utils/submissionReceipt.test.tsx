import * as React from 'react';
import {render,screen,fireEvent,cleanup,waitFor} from '@testing-library/react';
import {afterEach,expect,it,vi} from 'vitest';
import {createSubmissionReceipt} from './submissionReceipt';
afterEach(()=>{cleanup();sessionStorage.clear();});
it('offers only published findings and retains consultation context',async()=>{
 const get=vi.fn((path:string)=>Promise.resolve(path.endsWith('active_round')?{round_number:3}:{summary:'Published findings'}));const navigate=vi.fn();const Receipt=createSubmissionReceipt(React,get);
 render(<Receipt context={{formId:'9',formTitle:'Synthetic consultation',roundNumber:3}} navigate={navigate}/>);
 fireEvent.click(await screen.findByRole('button',{name:'View published findings →'}));expect(navigate).toHaveBeenCalledWith('/result',{state:expect.objectContaining({formId:'9',roundNumber:3})});
 expect(screen.queryByText(/preparing the next round/i)).toBeNull();
});
it('handles failed checks without claiming the response was lost',async()=>{
 const Receipt=createSubmissionReceipt(React,vi.fn().mockRejectedValue(new Error('offline')));
 render(<Receipt context={{formId:'9',roundNumber:1}} navigate={vi.fn()}/>);
 expect(await screen.findByText(/Your submitted response is still saved/)).toBeInTheDocument();expect(screen.queryByRole('button',{name:/View published/})).toBeNull();
});
it('restores context after reload and offers a newly opened round',async()=>{
 sessionStorage.setItem('symphonia-submission-receipt',JSON.stringify({formId:'9',roundNumber:1}));
 const get=vi.fn((path:string)=>Promise.resolve(path.endsWith('active_round')?{round_number:2}:{summary:''}));const navigate=vi.fn();const Receipt=createSubmissionReceipt(React,get);
 render(<Receipt context={{}} navigate={navigate}/>);fireEvent.click(await screen.findByRole('button',{name:'Continue to round 2 →'}));expect(navigate).toHaveBeenCalledWith('/form/9');
});
