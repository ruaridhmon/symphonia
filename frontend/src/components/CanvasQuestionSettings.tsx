import {useEffect,useRef,useState,type ReactNode} from 'react';
import {DEFAULT_LIKERT_OPTIONS,isSurveyQuestion,type ConfigurableQuestion} from '../utils/questions';

export function CanvasSheet({title,onClose,children}:{title:string;onClose:()=>void;children:ReactNode}){
 const ref=useRef<HTMLDialogElement>(null);
 useEffect(()=>{const dialog=ref.current!;const previous=document.activeElement as HTMLElement|null;dialog.showModal();return()=>{dialog.close();if(previous?.isConnected)previous.focus();};},[]);
 return <dialog ref={ref} className="fc-sheet" aria-label={title} onCancel={event=>{event.preventDefault();onClose();}} onClick={event=>{if(event.target===event.currentTarget)onClose();}}>
  <div className="fc-sheet-body"><header><h2>{title}</h2><button type="button" onClick={onClose} aria-label={`Close ${title.toLowerCase()}`}>×</button></header>{children}<footer><span>Changes apply to your draft</span><button type="button" className="cw-primary" onClick={onClose}>Done</button></footer></div>
 </dialog>;
}

export default function CanvasQuestionSettings({question:q,index,onChange,onClose,onMove,onRemove,first,last,only}:{question:ConfigurableQuestion;index:number;onChange:(q:ConfigurableQuestion)=>void;onClose:()=>void;onMove:(direction:number)=>void;onRemove:()=>void;first:boolean;last:boolean;only:boolean}){
 const [options,setOptions]=useState((q.options??(q.inputType==='likert'?DEFAULT_LIKERT_OPTIONS:[])).join('\n'));
 const patch=(update:Partial<ConfigurableQuestion>)=>onChange({...q,...update});
 const type=q.inputType||'textarea';
 return <CanvasSheet title={`Question ${index+1} settings`} onClose={onClose}>
  <p className="fc-sheet-context">{q.label||'Untitled question'}</p>
  <label className="fc-setting-toggle"><span>Required answer</span><input type="checkbox" role="switch" checked={!q.optional} onChange={e=>patch({optional:!e.target.checked})}/></label>
  {(type==='single_select'||type==='multi_select'||type==='likert')&&isSurveyQuestion(q)?<label className="fc-setting-field">{type==='likert'?'Scale labels':'Options'}<textarea aria-label={type==='likert'?'Scale labels':'Options'} rows={5} value={options} placeholder="One choice per line" onChange={e=>{setOptions(e.target.value);patch({options:e.target.value.split('\n').map(s=>s.trim()).filter(Boolean)});}}/><small>One choice per line</small></label>:null}
  {type==='multi_select'&&isSurveyQuestion(q)?<label className="fc-setting-field">Maximum selections<input type="number" min={1} value={q.maxSelections??''} onChange={e=>patch({maxSelections:e.target.value?Number(e.target.value):null})}/></label>:null}
  {type==='likert'&&isSurveyQuestion(q)?<label className="fc-setting-toggle"><span>Include “Don’t know / unsure”</span><input type="checkbox" role="switch" checked={q.allowUnsure??true} onChange={e=>patch({allowUnsure:e.target.checked})}/></label>:null}
  {type==='slider'&&isSurveyQuestion(q)?<div className="fc-scale-settings"><label className="fc-setting-field">Minimum<input type="number" value={q.minValue??0} onChange={e=>patch({minValue:Number(e.target.value)})}/></label><label className="fc-setting-field">Maximum<input type="number" value={q.maxValue??10} onChange={e=>patch({maxValue:Number(e.target.value)})}/></label><label className="fc-setting-field">Start label<input value={q.minLabel??''} placeholder="Optional" onChange={e=>patch({minLabel:e.target.value||null})}/></label><label className="fc-setting-field">End label<input value={q.maxLabel??''} placeholder="Optional" onChange={e=>patch({maxLabel:e.target.value||null})}/></label></div>:null}
  <label className="fc-setting-field">Guidance <span className="fc-optional">Optional</span><input value={q.helpText??''} placeholder="Add a useful hint for participants" onChange={e=>patch({helpText:e.target.value||null})}/></label>
  <details className="fc-advanced"><summary>More settings</summary>
   <label className="fc-setting-field">Section heading<input value={q.sectionTitle??''} placeholder="Group related questions" onChange={e=>patch({sectionTitle:e.target.value||null})}/></label>
   {(type==='text'||type==='textarea')&&isSurveyQuestion(q)?<label className="fc-setting-field">Answer placeholder<input value={q.placeholder??''} placeholder="Write your response here" onChange={e=>patch({placeholder:e.target.value||null})}/></label>:null}
   <label className="fc-setting-toggle"><span>Ask for evidence, reservations and confidence</span><input type="checkbox" checked={!isSurveyQuestion(q)} onChange={e=>patch({requireEvidence:e.target.checked,requireCounterarguments:e.target.checked,requireConfidence:e.target.checked})}/></label>
   <div className="fc-sheet-order"><button type="button" disabled={first} onClick={()=>onMove(-1)}>Move up</button><button type="button" disabled={last} onClick={()=>onMove(1)}>Move down</button><button type="button" disabled={only} onClick={onRemove}>Remove question</button></div>
  </details>
 </CanvasSheet>;
}
