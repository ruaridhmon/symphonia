// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeAll, expect, it, vi } from 'vitest';
import ManualResponseSheet from './ManualResponseSheet';
const mocks=vi.hoisted(()=>({get:vi.fn(),post:vi.fn()}));
vi.mock('../../api/forms',()=>({getForm:mocks.get}));
vi.mock('../../api/client',()=>({api:{post:mocks.post},getApiErrorDetail:(e:Error)=>e.message}));
vi.mock('../DocumentTemplateResponse',()=>({default:()=>null}));
beforeAll(()=>{HTMLDialogElement.prototype.showModal=function(){this.open=true;};});
afterEach(()=>{cleanup();vi.clearAllMocks();});
const question={label:'What matters?',inputType:'textarea',requireEvidence:false,requireCounterarguments:false,requireConfidence:false};
const props={form:{id:9,title:'Panel',questions:[question],allow_join:true,join_code:'abc'},round:{id:21,round_number:1,is_active:true,questions:[question],synthesis:''},onClose:vi.fn(),onSaved:vi.fn()};
it('keeps failed entries and retries the same request without using participant submission',async()=>{
 mocks.get.mockResolvedValue({...props.form,consent_required:false});mocks.post.mockRejectedValueOnce(new Error('Offline')).mockResolvedValueOnce({ok:true});
 render(<ManualResponseSheet {...props}/>);
 await screen.findByRole('textbox',{name:'What matters?'});
 expect(screen.getByRole('dialog',{name:'Add response'})).toBeInTheDocument();
 fireEvent.change(screen.getByRole('textbox',{name:'Respondent name'}),{target:{value:'Alex'}});
 fireEvent.click(screen.getByRole('button',{name:'Save response'}));
 expect(await screen.findByRole('alert')).toHaveTextContent('Please answer');expect(mocks.post).not.toHaveBeenCalled();
 fireEvent.change(screen.getByRole('textbox',{name:'What matters?'}),{target:{value:'Independent review'}});
 fireEvent.click(screen.getByRole('button',{name:'Save response'}));
 expect(await screen.findByRole('alert')).toHaveTextContent('Offline');
 expect(screen.getByRole('textbox',{name:'What matters?'})).toHaveValue('Independent review');
 fireEvent.click(screen.getByRole('button',{name:'Save response'}));
 await waitFor(()=>expect(props.onSaved).toHaveBeenCalledOnce());
 expect(mocks.post.mock.calls[0][0]).toBe('/forms/9/rounds/21/responses');
 expect(mocks.post.mock.calls[1][1].request_id).toBe(mocks.post.mock.calls[0][1].request_id);
 expect(mocks.post.mock.calls[1][1].expected_questions).toEqual([question]);
});

it('retains inferred provenance and round feedback during offline entry',async()=>{
 const q={...question,sectionTitle:'An inferred claim',groupPrompt:'Inferred · unconfirmed. Round 2: 1 disagree; confidence: extremely confident.'};mocks.get.mockResolvedValue({...props.form,consent_required:false});
 render(<ManualResponseSheet {...props} round={{...props.round,questions:[q,{...q,label:'Reason'}]}}/>);
 expect(await screen.findByText(q.groupPrompt)).toBeInTheDocument();expect(screen.getAllByText(q.groupPrompt)).toHaveLength(1);
});

it('waits for the final dictation result before saving the editable transcript',async()=>{
 let speech:any;
 (window as any).webkitSpeechRecognition=class {onstart:any;onresult:any;onend:any;onerror:any;constructor(){speech=this;}start(){this.onstart?.();}stop(){}abort(){}};
 mocks.get.mockResolvedValue({...props.form,consent_required:false});mocks.post.mockResolvedValue({ok:true});
 const {unmount}=render(<ManualResponseSheet {...props}/>);await screen.findByRole('textbox',{name:'What matters?'});
 fireEvent.change(screen.getByRole('textbox',{name:'Respondent name'}),{target:{value:'Alex'}});
 fireEvent.click(screen.getByRole('button',{name:'Dictate response'}));expect(screen.getByRole('button',{name:'Save response'})).toBeDisabled();
 fireEvent.click(screen.getByRole('button',{name:'Finish dictation'}));expect(screen.getByRole('button',{name:'Save response'})).toBeDisabled();
 act(()=>{speech.onresult({results:[{isFinal:true,0:{transcript:'Independent review.'}}]});speech.onend();});
 expect(screen.getByRole('textbox',{name:'What matters?'})).toHaveValue('Independent review.');expect(screen.getByRole('button',{name:'Save response'})).toBeEnabled();
 fireEvent.click(screen.getByRole('button',{name:'Save response'}));await waitFor(()=>expect(mocks.post).toHaveBeenCalledOnce());
 expect(mocks.post.mock.calls[0][1].answers.q1.position).toBe('Independent review.');unmount();delete (window as any).webkitSpeechRecognition;
});
