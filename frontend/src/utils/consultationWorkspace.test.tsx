// @vitest-environment jsdom
import * as React from 'react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createConsultationWorkspace, type WorkspaceProps } from './consultationWorkspace';
const Workspace = createConsultationWorkspace(React);
beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function () { this.open = true; };
  HTMLDialogElement.prototype.close = function () { this.open = false; };
});
afterEach(cleanup);
it('adds entries only to the current round from Responses and refreshes after saving',async()=>{
 const Sheet=({round,onSaved,onClose}:any)=><div role="dialog" aria-label="Add response"><span>Adding to {round.id}</span><button onClick={async()=>{await onSaved();onClose();}}>Save entry</button></div>;
 const AdminWorkspace=createConsultationWorkspace(React,Sheet);
 const p={...props(),view:'responses' as const,onResponseAdded:vi.fn()};
 const mounted=render(<AdminWorkspace {...p}/>);
 fireEvent.click(screen.getByRole('button',{name:'Add response'}));
 expect(screen.getByText('Adding to 12')).toBeInTheDocument();
 fireEvent.click(screen.getByRole('button',{name:'Save entry'}));
 await waitFor(()=>expect(screen.getByRole('status')).toHaveTextContent('Response saved'));
 expect(p.onResponseAdded).toHaveBeenCalledOnce();
 mounted.rerender(<AdminWorkspace {...p} selectedRoundId={11}/>);
 expect(screen.getByRole('button',{name:'Add response'})).toBeDisabled();
});
function props(): WorkspaceProps {
  return {form:{id:7,title:'A panel on research',join_code:'ABC 123',allow_join:true,questions:['Opening question']},rounds:[{id:11,round_number:1,is_active:false,questions:['What matters?'],synthesis:''},{id:12,round_number:2,is_active:true,questions:[{label:'Your response',sectionTitle:'Claim 1: Keep independent review',options:['Agree','Disagree']}],synthesis:''}],selectedRoundId:12,view:'synthesis',onView:vi.fn(),onRound:vi.fn(),onMakeLive:vi.fn(),responses:[{id:12,round_number:2,synthesis:'',is_active:true,responses:[]}]} ;
}
describe('consultation workspace', () => {
  it('keeps original questions above review summaries, with extra questions disclosed', () => {
    const p=props();p.rounds[0].questions=['What matters?',{label:'What could go wrong?'}];
    const mounted=render(<Workspace {...p}/>);
    const context=screen.getByLabelText('Consultation question');
    expect(context).toHaveTextContent('What matters?');
    expect(context).not.toHaveTextContent('Your response');
    expect(context.querySelector('details')).not.toHaveAttribute('open');
    expect(context).toHaveTextContent('What could go wrong?');
    mounted.rerender(<Workspace {...p} selectedRoundId={11}/>);
    expect(screen.getByLabelText('Consultation question')).toHaveTextContent('What matters?');
    mounted.rerender(<Workspace {...p} view="responses"/>);
    expect(screen.queryByLabelText('Consultation question')).toBeNull();
  });
  it('views a previous round without changing the live round', () => {
    const p=props();render(<Workspace {...p}/>);
    fireEvent.click(screen.getByRole('button',{name:'Round 1'}));
    expect(p.onRound).toHaveBeenCalledWith(p.rounds[0]);expect(p.onMakeLive).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button',{name:'Responses'}));expect(p.onView).toHaveBeenCalledWith('responses');
  });
  it('previews the actual questions and options', async () => {
    render(<Workspace {...props()}/>);fireEvent.click(screen.getByRole('button',{name:'View questions',hidden:true}));
    expect(await screen.findByRole('dialog',{name:'Round 2 questions'})).toBeTruthy();
    expect(screen.getByText('Claim 1: Keep independent review')).toBeTruthy();expect(screen.getByText('Agree · Disagree')).toBeTruthy();
  });
  it('copies an encoded invitation without opening access or sending invitations', async () => {
    const writeText=vi.fn().mockResolvedValue(undefined);Object.defineProperty(navigator,'clipboard',{value:{writeText},configurable:true});
    const p=props();p.form.allow_join=false;render(<Workspace {...p}/>);
    fireEvent.click(screen.getByRole('button',{name:'Invite people'}));
    expect(screen.getByText(/Joining is currently closed/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button',{name:'Copy invite link'}));
    await waitFor(()=>expect(writeText).toHaveBeenCalledWith(new URL('/share/ABC%20123',window.location.origin).href));
    expect(await screen.findByText('Link copied')).toBeTruthy();
    fireEvent.click(screen.getByRole('button',{name:'Close dialog'}));
    expect(screen.queryByRole('dialog')).toBeNull();
  });
  it('explains clipboard failure and keeps a selectable link',async()=>{
    Object.defineProperty(navigator,'clipboard',{value:{writeText:vi.fn().mockRejectedValue(new Error('denied'))},configurable:true});
    render(<Workspace {...props()}/>);fireEvent.click(screen.getByRole('button',{name:'Invite people'}));fireEvent.click(screen.getByRole('button',{name:'Copy invite link'}));
    expect(await screen.findByText(/Copy unavailable/)).toBeTruthy();expect(screen.getByRole('textbox',{name:'Invitation link'})).toBeTruthy();
  });
});

it('groups rating and explanation under one claim without repeating the scale',()=>{
 const Workspace=createConsultationWorkspace(React);
 const claim='Claim 1: An exact claim';
 const questions=[{sectionTitle:claim,label:'Your response',inputType:'single_select',options:['Agree','Disagree']},{sectionTitle:claim,label:'Explain your position',inputType:'textarea'}];
 const round={id:22,round_number:2,is_active:true,synthesis:'',questions};
 render(<Workspace form={{id:1,title:'Panel',questions,allow_join:true,join_code:'abc'}} rounds={[round]} selectedRoundId={22} view="synthesis" onView={()=>{}} onRound={()=>{}}/>);
 fireEvent.click(screen.getByRole('button',{name:'View questions',hidden:true}));
 expect(screen.getAllByRole('heading',{name:claim})).toHaveLength(1);
 expect(screen.getAllByText('Rating',{exact:true}).length).toBeGreaterThan(0);
 expect(screen.getByText('Written explanation',{exact:false})).toBeInTheDocument();
});
it('offers only Summary and Responses with directly selectable rounds',()=>{
 render(<Workspace {...props()}/>);
 expect(screen.getByRole('button',{name:'Summary'})).toBeInTheDocument();
 expect(screen.queryByRole('button',{name:'Analysis'})).not.toBeInTheDocument();
 expect(screen.queryByText('Reflection')).not.toBeInTheDocument();
 expect(screen.getByRole('button',{name:'Round 2'})).toHaveAttribute('aria-pressed','true');
});

it('makes Add response available from Summary and places invitations inside the options menu',()=>{
 const AdminWorkspace=createConsultationWorkspace(React,()=>null);
 render(<AdminWorkspace {...props()} onResponseAdded={()=>{}}/>);
 expect(screen.getByRole('button',{name:'Add response'})).toBeEnabled();
 const invite=screen.getByRole('button',{name:'Invite people',hidden:true});
 expect(invite.closest('details')).toHaveClass('cw-options');
 fireEvent.click(invite);
 expect(invite.closest('details')).not.toHaveAttribute('open');
 expect(screen.getByRole('dialog',{name:'Invite people'})).toBeInTheDocument();
});

it('opens the final stage without creating a fourth expert round',()=>{
 const Final=({formId,questions}:any)=><div>Final account for {formId}<p>{questions.join(' / ')}</p></div>;
 const AdminWorkspace=createConsultationWorkspace(React,undefined,Final);
 const p=props();p.rounds.push({...p.rounds[1],id:13,round_number:3});
 render(<AdminWorkspace {...p}/>);fireEvent.click(screen.getByRole('button',{name:'Final synthesis'}));
 expect(screen.getByText('Final account for 7')).toBeInTheDocument();
 expect(screen.getByText('What matters?')).toBeInTheDocument();
 expect(screen.queryByText('Your response')).not.toBeInTheDocument();
 expect(p.onView).toHaveBeenCalledWith('synthesis');expect(p.onMakeLive).not.toHaveBeenCalled();
 expect(screen.queryByRole('button',{name:'Round 4'})).not.toBeInTheDocument();
 fireEvent.click(screen.getByRole('button',{name:'Round 1'}));expect(screen.queryByText('Final account for 7')).not.toBeInTheDocument();
});

it('keeps the right menu focused on study actions and removes the duplicate map view',()=>{
 render(<Workspace {...props()}/>);
 const menu=document.querySelector('.cw-options')!;
 expect(menu.textContent).not.toMatch(/Rename|Unpin|Pin/);
 expect(menu.textContent).toContain('Invite people');
 expect(screen.queryByRole('button',{name:'Claim map',hidden:true})).toBeNull();
});

it('reviews the saved next questionnaire before making it current',async()=>{
 const p=props();p.rounds[0].is_active=true;p.rounds[1].is_active=false;p.selectedRoundId=11;
 render(<Workspace {...p}/>);fireEvent.click(screen.getByRole('button',{name:'Review Round 2'}));
 const dialog=await screen.findByRole('dialog',{name:'Round 2 questions'});
 expect(dialog).toHaveTextContent('Keep independent review');expect(p.onMakeLive).not.toHaveBeenCalled();
 fireEvent.click(screen.getByRole('button',{name:'Open Round 2'}));expect(p.onMakeLive).toHaveBeenCalledWith(p.rounds[1]);
});
it('prepares a missing next round only on request and uses the current round from historical views',()=>{
 const p=props(),prepare=vi.fn();render(<Workspace {...p} selectedRoundId={11} onPrepareNextRound={prepare}/>);
 expect(screen.getByLabelText('Delphi next step')).toHaveTextContent('Viewing Round 1 · Current: Round 2');
 expect(prepare).not.toHaveBeenCalled();fireEvent.click(screen.getByRole('button',{name:'Review Round 3'}));expect(prepare).toHaveBeenCalledOnce();expect(p.onMakeLive).not.toHaveBeenCalled();
});
