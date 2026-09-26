import {afterEach,expect,it,vi} from 'vitest';
import {cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react';
import {MemoryRouter,Routes,Route} from 'react-router-dom';
import FormEditor from './FormEditor';
import {api} from './api/client';
vi.mock('./api/client',()=>({api:{get:vi.fn(),put:vi.fn(),patch:vi.fn()},getApiErrorDetail:()=>''}));
vi.mock('./LegacyAdminFormNew',()=>({default:()=>null}));
vi.mock('./LegacyFormEditor',()=>({default:()=> <p>Document editor</p>}));
vi.mock('./components/QuestionnaireImporter',()=>({default:()=>null}));
afterEach(()=>{cleanup();localStorage.clear();vi.resetAllMocks();});
const question={label:'Original question',questionId:'stable-id',inputType:'textarea',requireEvidence:false,requireCounterarguments:false,requireConfidence:false,conditionalOnQuestionId:'parent',conditionalOnOption:'Yes'};
const form={title:'Saved consultation',questions:[question],allow_join:false,allow_public_responses:true,consent_required:true,consent_text:'Specific consent',consent_document:'https://example.com/consent'};
function show(count=0){vi.mocked(api.get).mockImplementation(async url=>url.endsWith('/rounds')?[{round_number:2,is_active:true,questions:[question],response_count:count}]:form);return render(<MemoryRouter initialEntries={['/admin/form/42']}><Routes><Route path='/admin/form/:id' element={<FormEditor/>}/></Routes></MemoryRouter>);}
it('loads server data rather than the create draft and saves stable metadata and settings',async()=>{
 localStorage.setItem('symphonia:canvas-draft:v1:current',JSON.stringify({title:'Unrelated draft',description:'',questions:[question]}));
 show();await screen.findByDisplayValue('Saved consultation');
 expect(screen.getByRole('button',{name:'Save changes'})).toBeDisabled();
 fireEvent.change(screen.getByLabelText('Consultation title'),{target:{value:'Revised consultation'}});
 fireEvent.click(screen.getByRole('button',{name:'Save changes'}));
 await waitFor(()=>expect(screen.getByRole('status')).toHaveTextContent('Changes saved'));
 expect(api.put).toHaveBeenCalledWith('/forms/42',expect.objectContaining({title:'Revised consultation',questions:[expect.objectContaining(question)],allow_public_responses:true,require_consent:true,consent_text:'Specific consent',consent_document:'https://example.com/consent',document_template:null}));
 expect(JSON.parse(localStorage.getItem('symphonia:canvas-draft:v1:current')!).title).toBe('Unrelated draft');
});
it('retains edits after a failed save and allows retry',async()=>{
 vi.mocked(api.put).mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce({});show();await screen.findByDisplayValue('Saved consultation');
 fireEvent.change(screen.getByLabelText('Question 1'),{target:{value:'Revised question'}});
 fireEvent.click(screen.getByRole('button',{name:'Save changes'}));
 await screen.findByRole('alert');expect(screen.getByLabelText('Question 1')).toHaveValue('Revised question');
 fireEvent.click(screen.getByRole('button',{name:'Save changes'}));
 await waitFor(()=>expect(screen.getByRole('status')).toHaveTextContent('Changes saved'));
});
it('keeps answered questions and their order fixed while allowing title and settings edits',async()=>{
 show(10);await screen.findByDisplayValue('Saved consultation');
 expect(screen.queryByRole('button',{name:'+ Add question'})).not.toBeInTheDocument();
 expect(screen.queryByLabelText('Question 1')).not.toBeInTheDocument();
 expect(screen.getByRole('heading',{name:'Original question'})).toBeInTheDocument();
 expect(screen.getByLabelText('Consultation title')).toBeEnabled();
});
it('does not offer saving when loading fails',async()=>{
 vi.mocked(api.get).mockRejectedValue(new Error('offline'));
 render(<MemoryRouter><FormEditor/></MemoryRouter>);await screen.findByRole('alert');
 expect(screen.queryByRole('button',{name:'Save changes'})).not.toBeInTheDocument();expect(api.put).not.toHaveBeenCalled();
});
it('uses the shared canvas for documents and preserves the template on title edits',async()=>{
 vi.mocked(api.get).mockImplementation(async url=>url.endsWith('/rounds')?[{round_number:1,is_active:true,questions:[question],response_count:0}]:{...form,document_template:'{{long:Your response}}'});
 render(<MemoryRouter initialEntries={['/admin/form/42']}><Routes><Route path='/admin/form/:id' element={<FormEditor/>}/></Routes></MemoryRouter>);
 await screen.findByDisplayValue('Saved consultation');expect(screen.queryByText('Document editor')).not.toBeInTheDocument();
 fireEvent.change(screen.getByLabelText('Consultation title'),{target:{value:'Updated document'}});
 fireEvent.click(screen.getByRole('button',{name:'Save changes'}));
 await waitFor(()=>expect(api.put).toHaveBeenCalledWith('/forms/42',expect.objectContaining({title:'Updated document',document_template:'{{long:Your response}}'})));
});

it('loads and saves the introduction without replacing other round context',async()=>{
 vi.mocked(api.get).mockImplementation(async url=>url.endsWith('/rounds')?[{id:9,round_number:1,is_active:true,questions:[question],response_count:0,context_settings:{intro_body:'Original introduction',show_previous_response:true}}]:form);
 render(<MemoryRouter initialEntries={['/admin/form/42']}><Routes><Route path='/admin/form/:id' element={<FormEditor/>}/></Routes></MemoryRouter>);
 await screen.findByDisplayValue('Original introduction');fireEvent.change(screen.getByLabelText('Introduction'),{target:{value:'Updated introduction'}});fireEvent.click(screen.getByRole('button',{name:'Save changes'}));await waitFor(()=>expect(api.patch).toHaveBeenCalledWith('/forms/42/rounds/9',{context_settings:{intro_body:'Updated introduction',show_previous_response:true}}));
});
