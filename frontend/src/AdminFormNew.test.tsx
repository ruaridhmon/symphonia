import {afterEach,beforeAll,expect,it,vi} from 'vitest';
import {cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import AdminFormNew from './AdminFormNew';
import {api} from './api/client';
vi.mock('./api/client',()=>({api:{post:vi.fn()},getApiErrorDetail:()=>''}));
vi.mock('./LegacyAdminFormNew',()=>({default:()=>null}));
vi.mock('./components/ConsentSettings',()=>({default:()=>null}));
vi.mock('./components/QuestionnaireImporter',()=>({default:()=>null}));
beforeAll(()=>{HTMLDialogElement.prototype.showModal=function(){this.open=true;};HTMLDialogElement.prototype.close=function(){this.open=false;};});
afterEach(()=>{cleanup();localStorage.clear();vi.clearAllMocks();});
const show=()=>render(<MemoryRouter><AdminFormNew/></MemoryRouter>);
it('edits on the same canvas, preserves test answers and restores the authoring draft',()=>{
 const view=show();
 fireEvent.change(screen.getByLabelText('Consultation title'),{target:{value:'An important question'}});
 fireEvent.change(screen.getByLabelText('Question 1'),{target:{value:'What should we test?'}});
 fireEvent.click(screen.getByRole('button',{name:'Preview'}));
 expect(screen.getByRole('heading',{name:'An important question'})).toBeInTheDocument();
 expect(screen.getByRole('heading',{name:'What should we test?'})).toBeInTheDocument();
 expect(screen.queryByLabelText('Question 1')).not.toBeInTheDocument();
 fireEvent.change(screen.getByPlaceholderText('Write your response here'),{target:{value:'Try a small pilot'}});
 fireEvent.click(screen.getByRole('button',{name:'Edit'}));
 expect(screen.getByLabelText('Question 1')).toHaveValue('What should we test?');
 expect(screen.getByPlaceholderText('Write your response here')).toHaveValue('Try a small pilot');
 view.unmount();show();expect(screen.getByLabelText('Consultation title')).toHaveValue('An important question');
});
it('rejects unfinished blocks and retains the draft after a failed save',async()=>{
 show();fireEvent.click(screen.getByRole('button',{name:'Create consultation'}));
 expect(screen.getByRole('alert')).toHaveTextContent('Give your consultation a title.');
 fireEvent.change(screen.getByLabelText('Consultation title'),{target:{value:'Test'}});
 fireEvent.click(screen.getByRole('button',{name:'Create consultation'}));expect(api.post).not.toHaveBeenCalled();
 fireEvent.change(screen.getByLabelText('Question 1'),{target:{value:'Why?'}});
 vi.mocked(api.post).mockRejectedValueOnce(new Error('offline'));
 fireEvent.click(screen.getByRole('button',{name:'Create consultation'}));
 await waitFor(()=>expect(screen.getByRole('alert')).toHaveTextContent('Your draft is still here'));
 expect(screen.getByLabelText('Question 1')).toHaveValue('Why?');
 expect(JSON.parse(localStorage.getItem('symphonia:canvas-draft:v1:current')!).questions[0].label).toBe('Why?');
});
it('applies imported conditional visibility in participant view',()=>{
 localStorage.setItem('symphonia:canvas-draft:v1:current',JSON.stringify({title:'Routed survey',description:'',questions:[
  {label:'Choose a route',questionId:'route',inputType:'single_select',options:['Yes','No'],requireEvidence:false,requireCounterarguments:false,requireConfidence:false},
  {label:'Explain why',questionId:'detail',inputType:'textarea',conditionalOnQuestionId:'route',conditionalOnOption:'Yes',requireEvidence:false,requireCounterarguments:false,requireConfidence:false}
 ]}));
 show();fireEvent.click(screen.getByRole('button',{name:'Preview'}));
 expect(screen.queryByRole('heading',{name:'Explain why'})).not.toBeInTheDocument();
 fireEvent.click(screen.getByRole('radio',{name:'Yes'}));
 expect(screen.getByRole('heading',{name:'Explain why'})).toBeInTheDocument();
});
it('changes answer types inline and opens only the relevant configuration',()=>{
 show();fireEvent.change(screen.getByLabelText('Answer type for question 1'),{target:{value:'single_select'}});
 expect(screen.getByLabelText('Options')).toBeInTheDocument();
 expect(screen.queryByLabelText('Response type')).not.toBeInTheDocument();
 expect(screen.getByRole('switch',{name:'Required answer'})).toBeChecked();
});
it('creates a document through the same canvas without requiring hidden question blocks',async()=>{
 localStorage.setItem('symphonia:canvas-draft:v1:current',JSON.stringify({title:'Document consultation',description:'',questions:[{label:'',inputType:'textarea'}],format:'document',documentTemplate:'{{long:Your response}}'}));
 vi.mocked(api.post).mockRejectedValueOnce(new Error('offline'));show();
 fireEvent.click(screen.getByRole('button',{name:'Create consultation'}));
 await waitFor(()=>expect(api.post).toHaveBeenCalledWith('/forms/create',expect.objectContaining({document_template:'{{long:Your response}}',title:'Document consultation'})));
 await screen.findByRole('alert');expect(screen.getByLabelText('Consultation title')).toHaveValue('Document consultation');
});

it('keeps question settings focused, preserves multiline options, and closes without losing changes',()=>{show();fireEvent.change(screen.getByLabelText('Answer type for question 1'),{target:{value:'single_select'}});expect(screen.getByRole('dialog',{name:'Question 1 settings'})).toBeInTheDocument();fireEvent.change(screen.getByLabelText('Options'),{target:{value:'First\n'}});expect(screen.getByLabelText('Options')).toHaveValue('First\n');fireEvent.change(screen.getByLabelText('Options'),{target:{value:'First\nSecond'}});fireEvent.click(screen.getByRole('button',{name:'Done'}));expect(screen.queryByRole('dialog')).not.toBeInTheDocument();expect(JSON.parse(localStorage.getItem('symphonia:canvas-draft:v1:current')!).questions[0].options).toEqual(['First','Second']);});
it('exposes scale limits and prevents publishing an invalid scale',()=>{show();fireEvent.change(screen.getByLabelText('Consultation title'),{target:{value:'Scale survey'}});fireEvent.change(screen.getByLabelText('Question 1'),{target:{value:'How confident are you?'}});fireEvent.change(screen.getByLabelText('Answer type for question 1'),{target:{value:'slider'}});fireEvent.change(screen.getByLabelText('Minimum'),{target:{value:'10'}});fireEvent.change(screen.getByLabelText('Maximum'),{target:{value:'5'}});fireEvent.click(screen.getByRole('button',{name:'Done'}));fireEvent.click(screen.getByRole('button',{name:'Create consultation'}));expect(screen.getByRole('alert')).toHaveTextContent('maximum');expect(api.post).not.toHaveBeenCalled();});
