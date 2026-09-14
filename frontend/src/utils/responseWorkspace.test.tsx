import * as React from 'react';
import {render,screen,fireEvent,cleanup,waitFor} from '@testing-library/react';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {createResponseWorkspace} from './responseWorkspace';
import {renderResponseReading} from './responseReading';
const questions=[{questionId:'claim',sectionTitle:'Preserve the exact claim',label:'Your response',inputType:'single_select',options:['Agree','Disagree']}];
const rounds=[{id:2,round_number:2,synthesis:'',is_active:false,questions},{id:3,round_number:3,synthesis:'',is_active:true,questions}];
const answer=(id:number,email:string,round_id:number)=>({id,email,round_id,timestamp:'2026-09-14T10:00:00Z',version:1,answers:{q1:{position:'Agree',evidence:`Original evidence ${id}`},orphan:'Retained unmatched answer'}});
const structuredRounds=[{...rounds[0],responses:[answer(1,'Earlier expert',2)]},{...rounds[1],responses:[answer(2,'Alice',3),answer(3,'Bob',3)]}];
const Editor=({questions,response,onUpdated}:any)=><>{renderResponseReading(React.createElement,questions,response.answers)}<button onClick={()=>onUpdated({...response,version:2})}>Save fixture edit</button></>;
const base={rounds,structuredRounds,formQuestions:questions,initialRoundId:3,onResponseUpdated:vi.fn()};
beforeEach(()=>{vi.spyOn(window,'scrollTo').mockImplementation(()=>{});});
afterEach(()=>{cleanup();vi.restoreAllMocks();});
it('starts with a full list, preserves filters and opens one complete response with previous/next navigation',()=>{
 const Workspace=createResponseWorkspace(React,Editor);render(<Workspace {...base}/>);
 expect(screen.queryByRole('navigation',{name:'Response navigation'})).toBeNull();expect(screen.queryByText('Earlier expert')).toBeNull();
 fireEvent.change(screen.getByRole('searchbox'),{target:{value:'Original evidence'}});
 fireEvent.click(screen.getByRole('button',{name:"Read response from Alice, round 3"}));
 expect(screen.getByRole('heading',{name:'Alice'})).toHaveFocus();expect(screen.getByText('Retained unmatched answer')).toBeInTheDocument();
 expect(screen.queryByRole('searchbox')).toBeNull();expect(screen.getByRole('button',{name:'Previous'})).toBeDisabled();
 fireEvent.click(screen.getByRole('button',{name:'Next'}));expect(screen.getByRole('heading',{name:'Bob'})).toBeInTheDocument();
 fireEvent.click(screen.getByRole('button',{name:'Save fixture edit'}));expect(base.onResponseUpdated).toHaveBeenCalledWith(3,expect.objectContaining({id:3,version:2}));
 fireEvent.click(screen.getByRole('button',{name:'← All responses'}));expect(screen.getByRole('searchbox')).toHaveValue('Original evidence');expect(screen.getByRole('button',{name:"Read response from Bob, round 3"})).toHaveFocus();
});
it('searches all answer fields and distinguishes rounds',()=>{
 const Workspace=createResponseWorkspace(React,Editor);render(<Workspace {...base}/>);
 fireEvent.change(screen.getByRole('combobox'),{target:{value:'all'}});expect(screen.getByText('Earlier expert')).toBeInTheDocument();
 fireEvent.change(screen.getByRole('searchbox'),{target:{value:'Retained unmatched answer'}});expect(screen.getByText('3 responses found')).toBeInTheDocument();
 fireEvent.change(screen.getByRole('searchbox'),{target:{value:'absent'}});expect(screen.getByText('No responses match these filters.')).toBeInTheDocument();
});
it('retains successful deletions and remaining selection when a later deletion fails',async()=>{
 const remove=vi.fn().mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error('Server unavailable'));const onResponseDeleted=vi.fn();vi.spyOn(window,'confirm').mockReturnValue(true);
 const Workspace=createResponseWorkspace(React,Editor,remove);render(<Workspace {...base} onResponseDeleted={onResponseDeleted}/>);
 fireEvent.click(screen.getByRole('button',{name:'Manage'}));fireEvent.click(screen.getByRole('button',{name:'Select visible'}));fireEvent.click(screen.getByRole('button',{name:'Delete selected'}));
 await waitFor(()=>expect(screen.getByRole('alert')).toHaveTextContent('Server unavailable'));
 expect(onResponseDeleted).toHaveBeenCalledExactlyOnceWith(3,2);expect(screen.getByRole('checkbox',{name:'Select Alice, round 3'})).not.toBeChecked();expect(screen.getByRole('checkbox',{name:'Select Bob, round 3'})).toBeChecked();
});
