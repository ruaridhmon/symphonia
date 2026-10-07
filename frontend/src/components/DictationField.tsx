import {cloneElement,createContext,useContext,useEffect,useId,useRef,useState,type ReactElement,type ReactNode} from 'react';
import {Mic,Square,X} from 'lucide-react';

type ResultEvent={results:ArrayLike<{isFinal?:boolean;0:{transcript:string}}>};
type Recognition={continuous:boolean;interimResults:boolean;lang:string;onstart:(()=>void)|null;onresult:((e:ResultEvent)=>void)|null;onerror:((e:{error:string})=>void)|null;onend:(()=>void)|null;start:()=>void;stop:()=>void;abort?:()=>void};
type Constructor=new()=>Recognition;
const Activity=createContext<(active:boolean)=>void>(()=>{});
let activeSession:(()=>void)|null=null;
export function DictationProvider({onActiveChange,children}:{onActiveChange:(active:boolean)=>void;children:ReactNode}){return <Activity.Provider value={onActiveChange}>{children}</Activity.Provider>;}

type Field=ReactElement<{value?:string;readOnly?:boolean;'aria-describedby'?:string}>;
/** Dictation is an editable draft. Only final recognition results enter the answer. */
export default function DictationField({children,onTranscript,disabled=false}:{children:Field;onTranscript:(text:string)=>void;disabled?:boolean}){
 const root=useRef<HTMLDivElement>(null),session=useRef<Recognition|null>(null),latest=useRef(String(children.props.value||'')),callback=useRef(onTranscript),setActivity=useContext(Activity),activity=useRef(setActivity);
 const baseline=useRef(''),cursor=useRef(0),end=useRef(0),processed=useRef(new Set<number>()),finishing=useRef(false);
 const [state,setState]=useState<'idle'|'starting'|'listening'|'stopping'>('idle'),[interim,setInterim]=useState(''),[error,setError]=useState('');
 const stopTimer=useRef<ReturnType<typeof setTimeout>|null>(null);
 const statusId=useId();latest.current=String(children.props.value||'');callback.current=onTranscript;activity.current=setActivity;
 const speechWindow=window as unknown as {SpeechRecognition?:Constructor;webkitSpeechRecognition?:Constructor};
 const Recognition=speechWindow.SpeechRecognition||speechWindow.webkitSpeechRecognition;
 const focus=()=>requestAnimationFrame(()=>{const field=root.current?.querySelector<HTMLInputElement|HTMLTextAreaElement>('textarea,input');if(field){field.focus();field.setSelectionRange(cursor.current,cursor.current);}});
 const detach=(r:Recognition)=>{r.onstart=null;r.onresult=null;r.onerror=null;r.onend=null;};
 const clear=(focusField=true)=>{if(stopTimer.current)clearTimeout(stopTimer.current);stopTimer.current=null;session.current=null;activeSession=null;finishing.current=false;activity.current(false);setState('idle');setInterim('');if(focusField)focus();};
 const cancel=()=>{const r=session.current;if(!r)return;detach(r);r.abort?.();latest.current=baseline.current;callback.current(baseline.current);cursor.current=baseline.current.length;clear();};
 const stop=()=>{const r=session.current;if(!r||finishing.current)return;finishing.current=true;setState('stopping');setInterim('');try{r.stop();if(session.current===r)stopTimer.current=setTimeout(()=>{if(session.current===r){detach(r);r.abort?.();setError('Dictation took too long to finish. Your transcribed text is still here.');clear();}},8000);}catch{detach(r);clear();}};
 useEffect(()=>{const field=root.current?.querySelector<HTMLTextAreaElement>('textarea.overflow-hidden');if(field){field.style.height='auto';field.style.height=`${Math.max(140,field.scrollHeight)}px`;}},[children.props.value]);
 useEffect(()=>()=>{if(stopTimer.current)clearTimeout(stopTimer.current);const r=session.current;if(r){detach(r);r.abort?.();session.current=null;activeSession=null;activity.current(false);}},[]);
 useEffect(()=>{if(disabled&&session.current){const r=session.current;detach(r);r.abort?.();clear(false);}},[disabled]);
 const start=()=>{
  if(disabled||session.current)return;
  setError('');if(!Recognition){setError('Dictation is unavailable in this browser. You can still type your response.');return;}
  activeSession?.();
  const field=root.current?.querySelector<HTMLInputElement|HTMLTextAreaElement>('textarea,input');baseline.current=latest.current;cursor.current=field?.selectionStart??latest.current.length;end.current=field?.selectionEnd??cursor.current;processed.current=new Set();finishing.current=false;
  let r:Recognition;try{r=new Recognition();}catch{setError('Could not start dictation. Try again in a supported browser.');return;}session.current=r;activeSession=()=>{detach(r);r.abort?.();clear(false);};r.continuous=true;r.interimResults=true;r.lang=document.documentElement.lang||navigator.language||'en-GB';
  activity.current(true);setState('starting');
  r.onstart=()=>{if(session.current===r&&!finishing.current)setState('listening');};
  r.onresult=e=>{if(session.current!==r)return;const pending:string[]=[];
   for(let i=0;i<e.results.length;i++){const result=e.results[i],text=result[0]?.transcript.trim();if(!text)continue;
    if(!result.isFinal){pending.push(text);continue;}if(processed.current.has(i))continue;processed.current.add(i);
    const before=latest.current.slice(0,cursor.current),after=latest.current.slice(end.current);
    const inserted=(before&&!/\s$/.test(before)?' ':'')+text+(after&&!/^\s|^[.,!?;:]/.test(after)?' ':'');
    latest.current=before+inserted+after;cursor.current=before.length+inserted.length;end.current=cursor.current;callback.current(latest.current);
   }if(!finishing.current)setInterim(pending.join(' '));
  };
  r.onerror=e=>{if(session.current!==r)return;setError(({ 'not-allowed':'Allow microphone access in your browser, then try again.','service-not-allowed':'Your browser blocked dictation. Check microphone permissions and try again.','audio-capture':'No microphone was found. Connect one and try again.','network':'Dictation lost its connection. Your transcribed text is still here.','no-speech':'No speech was detected. Try dictating again.' } as Record<string,string>)[e.error]||'Dictation stopped. Your transcribed text is still here.');detach(r);r.abort?.();clear();};
  r.onend=()=>{if(session.current===r){detach(r);clear();}};
  try{r.start();}catch{detach(r);setError('Could not start dictation. Check microphone access and try again.');clear();}
 };
 const live=state!=='idle';
 return <div ref={root} className={`dictation-field${live?' is-dictating':''}`}>
  <div className="dictation-composer">{cloneElement(children,{readOnly:disabled||live||children.props.readOnly,'aria-describedby':[children.props['aria-describedby'],error||live?statusId:''].filter(Boolean).join(' ')||undefined})}
  <div className="dictation-controls">
   {live?<><span className="dictation-activity" aria-hidden="true"><i/><i/><i/><i/></span><span className="dictation-state">{state==='starting'?'Connecting…':state==='stopping'?'Finishing…':'Listening…'}</span><button type="button" className="dictation-cancel" aria-label="Cancel dictation" title="Discard this dictation" onClick={cancel}><X size={15}/></button><button type="button" className="dictation-stop" aria-label="Finish dictation" title="Finish dictation" disabled={state==='stopping'} onClick={stop}><Square size={12} fill="currentColor"/></button></>:<button type="button" className="dictation-start" aria-label="Dictate response" title={Recognition?'Dictate response':'Dictation unavailable in this browser'} disabled={disabled||children.props.readOnly} onClick={start}><Mic size={17}/></button>}
  </div>
  </div>
  {(live||error)&&<p id={statusId} className={`dictation-status${error?' dictation-error':''}`} role={error?'alert':'status'}>{error||interim|| (state==='starting'?'Allow microphone access to start dictating.':state==='stopping'?'Finishing your transcript…':'Speak naturally. Finish to review and edit.')}</p>}
 </div>;
}
