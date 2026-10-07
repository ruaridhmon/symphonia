// @vitest-environment jsdom
import {useState} from 'react';
import {act,cleanup,fireEvent,render,screen} from '@testing-library/react';
import {afterEach,expect,it,vi} from 'vitest';
import DictationField,{DictationProvider} from './DictationField';
class Speech {
 static current:Speech;
 continuous=false;interimResults=false;lang='';onstart:any;onresult:any;onerror:any;onend:any;
 constructor(){Speech.current=this;}
 start=vi.fn(()=>this.onstart?.());stop=vi.fn();abort=vi.fn();
 results(items:{text:string;final:boolean}[]){act(()=>this.onresult?.({results:items.map(x=>({isFinal:x.final,0:{transcript:x.text}}))}));}
}
const activity=vi.fn();
function Editor(){const [text,setText]=useState('Existing text.');return <DictationProvider onActiveChange={activity}><DictationField onTranscript={setText}><textarea aria-label="Answer" value={text} onChange={e=>setText(e.target.value)}/></DictationField></DictationProvider>;}
function setup(){(window as any).webkitSpeechRecognition=Speech;return render(<Editor/>);}
afterEach(()=>{cleanup();delete (window as any).webkitSpeechRecognition;vi.clearAllMocks();});
it('keeps interim text out of the answer and accepts each final result once, including after finish',()=>{
 setup();const field=screen.getByRole('textbox');(field as HTMLTextAreaElement).setSelectionRange(14,14);fireEvent.click(screen.getByRole('button',{name:'Dictate response'}));const r=Speech.current;
 expect(field).toHaveAttribute('readonly');expect(r.interimResults).toBe(true);r.results([{text:'New thought.',final:false}]);expect(field).toHaveValue('Existing text.');expect(screen.getByRole('status')).toHaveTextContent('New thought.');
 r.results([{text:'New thought.',final:true}]);r.results([{text:'New thought.',final:true},{text:'Another thought.',final:true}]);expect(field).toHaveValue('Existing text. New thought. Another thought.');
 fireEvent.click(screen.getByRole('button',{name:'Finish dictation'}));expect(r.stop).toHaveBeenCalledOnce();expect(screen.getByRole('button',{name:'Finish dictation'})).toBeDisabled();
 r.results([{text:'New thought.',final:true},{text:'Another thought.',final:true},{text:'Last words.',final:true}]);act(()=>r.onend());expect(field).toHaveValue('Existing text. New thought. Another thought. Last words.');expect(field).not.toHaveAttribute('readonly');expect(activity).toHaveBeenLastCalledWith(false);
});
it('inserts at the selection and cancels only the current dictation',()=>{
 setup();const field=screen.getByRole('textbox');(field as HTMLTextAreaElement).setSelectionRange(0,8);fireEvent.click(screen.getByRole('button',{name:'Dictate response'}));Speech.current.results([{text:'Updated',final:true}]);expect(field).toHaveValue('Updated text.');fireEvent.click(screen.getByRole('button',{name:'Cancel dictation'}));expect(field).toHaveValue('Existing text.');expect(Speech.current.abort).toHaveBeenCalledOnce();
});
it('shows actionable permission failures without erasing recognized text',()=>{
 setup();fireEvent.click(screen.getByRole('button',{name:'Dictate response'}));act(()=>Speech.current.onerror({error:'not-allowed'}));expect(screen.getByRole('alert')).toHaveTextContent('Allow microphone access');expect(screen.getByRole('textbox')).toHaveValue('Existing text.');expect(screen.getByRole('button',{name:'Dictate response'})).toBeEnabled();
});
it('aborts and disconnects recognition when the form closes',()=>{
 const {unmount}=setup();fireEvent.click(screen.getByRole('button',{name:'Dictate response'}));const r=Speech.current;unmount();expect(r.abort).toHaveBeenCalledOnce();expect(r.onresult).toBeNull();expect(activity).toHaveBeenLastCalledWith(false);
});
it('keeps typing available when speech recognition is unsupported',()=>{
 render(<Editor/>);fireEvent.click(screen.getByRole('button',{name:'Dictate response'}));expect(screen.getByRole('alert')).toHaveTextContent('unavailable in this browser');expect(screen.getByRole('textbox')).not.toHaveAttribute('readonly');
});

it('ends the previous field session before starting another and ignores late events',()=>{
 (window as any).webkitSpeechRecognition=Speech;render(<><Editor/><Editor/></>);const buttons=screen.getAllByRole('button',{name:'Dictate response'});fireEvent.click(buttons[0]);const first=Speech.current;fireEvent.click(buttons[1]);expect(first.abort).toHaveBeenCalledOnce();expect(first.onresult).toBeNull();expect(screen.getAllByRole('textbox')[0]).not.toHaveAttribute('readonly');expect(screen.getAllByRole('textbox')[1]).toHaveAttribute('readonly');
});
it('recovers if the browser does not finish the recording',()=>{
 vi.useFakeTimers();setup();fireEvent.click(screen.getByRole('button',{name:'Dictate response'}));fireEvent.click(screen.getByRole('button',{name:'Finish dictation'}));act(()=>vi.advanceTimersByTime(8000));expect(screen.getByRole('alert')).toHaveTextContent('too long to finish');expect(screen.getByRole('textbox')).not.toHaveAttribute('readonly');vi.useRealTimers();
});
