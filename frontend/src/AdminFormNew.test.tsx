import {afterEach,expect,it,vi} from 'vitest';
import {cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import AdminFormNew from './AdminFormNew';
import {api} from './api/client';
vi.mock('./api/client',()=>({api:{post:vi.fn()},getApiErrorDetail:()=>''}));
vi.mock('./LegacyAdminFormNew',()=>({default:()=>null}));
vi.mock('./components/ConsentSettings',()=>({default:()=>null}));
vi.mock('./components/QuestionnaireImporter',()=>({default:()=>null}));
afterEach(()=>{cleanup();localStorage.clear();vi.clearAllMocks();});
const show=()=>render(<MemoryRouter><AdminFormNew/></MemoryRouter>);
it('edits on the same canvas, preserves test answers and restores the authoring draft',()=>{
 const view=show();
 fireEvent.change(screen.getByLabelText('Consultation title'),{target:{value:'An important question'}});
 fireEvent.change(screen.getByLabelText('Question 1'),{target:{value:'What should we test?'}});
 fireEvent.click(screen.getByRole('button',{name:'View as participant'}));
 expect(screen.getByRole('heading',{name:'An important question'})).toBeInTheDocument();
 expect(screen.getByRole('heading',{name:'What should we test?'})).toBeInTheDocument();
 expect(screen.queryByLabelText('Question 1')).not.toBeInTheDocument();
 fireEvent.change(screen.getByPlaceholderText('Write your response here'),{target:{value:'Try a small pilot'}});
 fireEvent.click(screen.getByRole('button',{name:'Edit form'}));
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
 show();fireEvent.click(screen.getByRole('button',{name:'View as participant'}));
 expect(screen.queryByRole('heading',{name:'Explain why'})).not.toBeInTheDocument();
 fireEvent.click(screen.getByRole('radio',{name:'Yes'}));
 expect(screen.getByRole('heading',{name:'Explain why'})).toBeInTheDocument();
});
it('changes answer types inline and opens only the relevant configuration',()=>{
 show();fireEvent.change(screen.getByLabelText('Answer type for question 1'),{target:{value:'single_select'}});
 expect(screen.getByLabelText('Options')).toBeInTheDocument();
 expect(screen.queryByLabelText('Response type')).not.toBeInTheDocument();
 expect(screen.queryByLabelText('Required')).not.toBeInTheDocument();
});
