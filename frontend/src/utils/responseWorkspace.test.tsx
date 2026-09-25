import * as React from 'react';
import {render,screen,fireEvent,cleanup,waitFor} from '@testing-library/react';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {createResponseWorkspace} from './responseWorkspace';
import {renderResponseReading} from './responseReading';
const questions=[{questionId:'claim',sectionTitle:'Preserve the exact claim',label:'Your response',inputType:'single_select',options:['Agree','Disagree']}];
const rounds=[{id:2,round_number:2,synthesis:'',is_active:false,questions},{id:3,round_number:3,synthesis:'',is_active:true,questions}];
const answer=(id:number,email:string,round_id:number)=>({id,email,round_id,timestamp:'2026-09-14T10:00:00Z',version:1,answers:{q1:{position:'Agree',evidence:`Original evidence ${id}`},orphan:'Retained unmatched answer'}});
const structuredRounds=[{...rounds[0],responses:[answer(1,'Earlier expert',2)]},{...rounds[1],questions:[],responses:[answer(2,'Alice',3),answer(3,'Bob',3)]}];
const Editor=({questions,response,onUpdated,roundNumber}:any)=><>{renderResponseReading(React.createElement,questions,response.answers,roundNumber)}<button onClick={()=>onUpdated({...response,version:2})}>Save fixture edit</button></>;
const base={rounds,structuredRounds,formQuestions:questions,initialRoundId:3,onResponseUpdated:vi.fn()};
beforeEach(()=>{vi.spyOn(window,'scrollTo').mockImplementation(()=>{});});
afterEach(()=>{cleanup();vi.restoreAllMocks();});
it('shows all answers for one claim without a separate reader or back navigation',()=>{
 const Workspace=createResponseWorkspace(React,Editor);render(<Workspace {...base}/>);
 expect(screen.getByText('Original evidence 2')).toBeInTheDocument();
 expect(screen.getByText('Original evidence 3')).toBeInTheDocument();
 expect(screen.queryByRole('button',{name:/All responses/})).not.toBeInTheDocument();
 fireEvent.change(screen.getByRole('combobox',{name:'Question or claim'}),{target:{value:'Additional response · orphan'}});
 expect(screen.getAllByText('Retained unmatched answer')).toHaveLength(2);
 expect(screen.queryByRole('navigation',{name:'Response layout'})).not.toBeInTheDocument();
});
it('compares only identical question wording and retains a participant across rounds',()=>{
 const Workspace=createResponseWorkspace(React,Editor);
 render(<Workspace {...base} structuredRounds={[{...rounds[0],responses:[answer(1,'Alice',2)]},structuredRounds[1]]}/>);
 fireEvent.click(screen.getByRole('button',{name:/Alice.*Earlier answers/}));
 expect(screen.getByText('Original evidence 1')).toBeInTheDocument();
 expect(screen.getByText('Original evidence 2')).toBeInTheDocument();
 expect(screen.getByText('Original evidence 3')).toBeInTheDocument();
 expect(screen.getByRole('button',{name:/Alice.*Hide history/})).toHaveAttribute('aria-expanded','true');
});
it('searches all answer fields and distinguishes rounds',()=>{
 const Workspace=createResponseWorkspace(React,Editor);render(<Workspace {...base} initialRoundId={undefined}/>);
 fireEvent.click(screen.getByRole('button',{name:'Search responses'}));
 fireEvent.change(screen.getByRole('combobox',{name:'Round'}),{target:{value:'all'}});expect(screen.getByText('Earlier expert')).toBeInTheDocument();
 fireEvent.change(screen.getByRole('searchbox'),{target:{value:'Retained unmatched answer'}});expect(screen.getByText('3 responses found')).toBeInTheDocument();
 fireEvent.change(screen.getByRole('searchbox'),{target:{value:'absent'}});expect(screen.getByText('No responses match these filters.')).toBeInTheDocument();
});
it('retains successful deletions and remaining selection when a later deletion fails',async()=>{
 const remove=vi.fn().mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error('Server unavailable'));const onResponseDeleted=vi.fn();vi.spyOn(window,'confirm').mockReturnValue(true);
 const Workspace=createResponseWorkspace(React,Editor,remove);render(<Workspace {...base} onResponseDeleted={onResponseDeleted}/>);
 fireEvent.click(screen.getByRole('button',{name:'Manage responses'}));fireEvent.click(screen.getByRole('button',{name:'Select visible'}));fireEvent.click(screen.getByRole('button',{name:'Delete selected'}));
 await waitFor(()=>expect(screen.getByRole('alert')).toHaveTextContent('Server unavailable'));
 expect(onResponseDeleted).toHaveBeenCalledExactlyOnceWith(3,2);expect(screen.getByRole('checkbox',{name:'Select Alice, round 3'})).not.toBeChecked();expect(screen.getByRole('checkbox',{name:'Select Bob, round 3'})).toBeChecked();
});
it('preserves the selected claim across views and does not mark neutral ratings as disagreement',()=>{
 const Workspace=createResponseWorkspace(React,Editor);
 const neutral={...answer(4,'Neutral participant',3),answers:{q1:{position:'Neither agree nor disagree'}}};
 render(<Workspace {...base} structuredRounds={[structuredRounds[0],{...rounds[1],responses:[neutral]}]}/>);
 expect(screen.getByText('Neither agree nor disagree')).toHaveClass('rp-neutral');
 expect(screen.getByRole('combobox',{name:'Question or claim'})).toHaveValue('Preserve the exact claim');
});
it('includes the opening response as context without inventing a round-one claim rating',()=>{
 const opening={id:1,round_number:1,is_active:false,synthesis:'',questions:['What matters before testing?']};
 const initial={...answer(9,'Alice',1),answers:{q1:{position:'Start with a useful experiment.'}}};
 const revised={...answer(2,'Alice',3),answers:{q1:{position:'Agree',evidence:'My explanation changed after feedback.'}}};
 const Workspace=createResponseWorkspace(React,Editor);
 render(<Workspace {...base} rounds={[opening,...rounds]} structuredRounds={[{...opening,responses:[initial]},{...rounds[0],responses:[answer(1,'Alice',2)]},{...rounds[1],responses:[revised]}]}/>);
 fireEvent.click(screen.getByRole('button',{name:/Alice.*Earlier answers/}));
 expect(screen.getByText('Start with a useful experiment.')).toBeInTheDocument();
 expect(screen.getAllByText('What matters before testing?').length).toBeGreaterThan(0);
 expect(screen.getByText('Round 1 · Opening context')).toBeInTheDocument();
 expect(screen.getByText('Round 2')).toBeInTheDocument();
 expect(screen.getByText('Original evidence 1')).toBeInTheDocument();
});

it('uses the parent round selector without repeating it in the response toolbar',()=>{const Workspace=createResponseWorkspace(React,Editor);const view=render(<Workspace {...base}/>);expect(screen.queryByRole('combobox',{name:'Round'})).not.toBeInTheDocument();view.rerender(<Workspace {...base} initialRoundId={2}/>);expect(screen.getByText('Earlier expert')).toBeInTheDocument();expect(screen.queryByText('Alice')).not.toBeInTheDocument();});

it('shows a change from the nearest earlier exact claim and hides history initially',()=>{const Workspace=createResponseWorkspace(React,Editor);const earlier={...answer(1,'Alice',2),answers:{q1:{position:'Disagree',evidence:'Before'}}};render(<Workspace {...base} structuredRounds={[{...rounds[0],responses:[earlier]},structuredRounds[1]]}/>);expect(screen.getByText('Disagree → Agree')).toBeInTheDocument();expect(screen.queryByText('Before')).not.toBeInTheDocument();fireEvent.click(screen.getByRole('button',{name:/Alice.*Earlier answers/}));expect(screen.getByText('Before')).toBeInTheDocument();});
it('does not match anonymous identities or differently worded questions',()=>{const Workspace=createResponseWorkspace(React,Editor);render(<Workspace {...base} structuredRounds={[{...{...rounds[0],questions:[{...questions[0],sectionTitle:'Different claim'}]},responses:[answer(1,'Alice',2),answer(7,'',2)]},{...rounds[1],responses:[answer(2,'Alice',3),answer(8,'',3)]}]}/>);expect(screen.queryByText('Earlier answers')).not.toBeInTheDocument();expect(screen.queryByText(/→/)).not.toBeInTheDocument();});
