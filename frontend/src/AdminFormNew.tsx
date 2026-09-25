import {useEffect, useRef, useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {api, getApiErrorDetail} from './api/client';
import LegacyAdminFormNew from './LegacyAdminFormNew';
import SurveyQuestionInput from './components/SurveyQuestionInput';
import StructuredInput from './components/StructuredInput';
import SurveyQuestionConfigurator from './components/SurveyQuestionConfigurator';
import QuestionnaireImporter from './components/QuestionnaireImporter';
import ConsentSettings from './components/ConsentSettings';
import PublicShareSettings from './components/PublicShareSettings';
import {emptyStructuredResponse, type StructuredResponse} from './types/structured-input';
import {isSurveyQuestion, type ConfigurableQuestion} from './utils/questions';

const blank = ():ConfigurableQuestion => ({label:'',inputType:'textarea',rows:4,requireEvidence:false,requireCounterarguments:false,requireConfidence:false,optional:false});
type Draft={title:string;description:string;questions:ConfigurableQuestion[];allowJoin:boolean;allowPublicResponses:boolean;requireConsent:boolean;consentText:string;consentDocument:string};
const fresh = ():Draft=>({title:'',description:'',questions:[blank()],allowJoin:true,allowPublicResponses:false,requireConsent:false,consentText:'I understand the purpose of this consultation and consent to my response being used within it.',consentDocument:''});
function draftKey(){try{return `symphonia:canvas-draft:v1:${localStorage.getItem('email')||'current'}`;}catch{return 'symphonia:canvas-draft:v1';}}
function readDraft():Draft{try{const value=JSON.parse(localStorage.getItem(draftKey())||'null');if(value&&typeof value.title==='string'&&typeof value.description==='string'&&Array.isArray(value.questions)&&value.questions.length&&value.questions.every((q:any)=>q&&typeof q.label==='string'))return {...fresh(),...value};}catch{}return fresh();}

/** One canvas and the same answer components in author and participant-view modes. */
export default function AdminFormNew(){
 const navigate=useNavigate();
 const [draft,setDraft]=useState<Draft>(readDraft);
 const [preview,setPreview]=useState(false);
 const [settings,setSettings]=useState(false);
 const [legacy,setLegacy]=useState(false);
 const [selected,setSelected]=useState<number|null>(null);
 const [answers,setAnswers]=useState<Record<string,StructuredResponse>>({});
 const [saving,setSaving]=useState(false);
 const [saved,setSaved]=useState('');
 const [error,setError]=useState('');
 const [importNotice,setImportNotice]=useState('');
 const created=useRef(false);
 const canvas=useRef<HTMLDivElement>(null);
 useEffect(()=>{document.title='Create a consultation — Symphonia';},[]);
 useEffect(()=>{if(created.current)return;try{localStorage.setItem(draftKey(),JSON.stringify(draft));setSaved('Draft saved on this device');}catch{setSaved('Draft could not be saved on this device');}},[draft]);
 const change=(patch:Partial<Draft>)=>setDraft(previous=>({...previous,...patch}));
 const updateQuestion=(index:number,question:ConfigurableQuestion)=>setDraft(previous=>({...previous,questions:previous.questions.map((q,i)=>i===index?question:q)}));
 const reorder=(from:number,to:number)=>{if(to<0||to>=draft.questions.length)return;const questions=[...draft.questions];[questions[from],questions[to]]=[questions[to],questions[from]];change({questions});setAnswers({});setSelected(to);};
 const add=()=>{const index=draft.questions.length;change({questions:[...draft.questions,blank()]});setSelected(index);requestAnimationFrame(()=>canvas.current?.querySelector<HTMLTextAreaElement>(`[aria-label="Question ${index+1}"]`)?.focus());};
 const isVisible=(q:ConfigurableQuestion)=>{
  const options=q.conditionalOnOptions?.length?q.conditionalOnOptions:q.conditionalOnOption?[q.conditionalOnOption]:[];
  if(!preview||!q.conditionalOnQuestionId||!options.length)return true;
  const index=draft.questions.findIndex(item=>item.questionId===q.conditionalOnQuestionId);
  const chosen=(answers[`q${index+1}`]?.position||'').split('\n').map(value=>value.trim());
  return index>=0&&options.some(option=>chosen.includes(option));
 };
 const create=async()=>{
  if(saving||created.current)return;
  if(!draft.title.trim()){setError('Give your consultation a title.');return;}
  if(!draft.questions.length||draft.questions.some(q=>!q.label.trim())){setError('Write a question in each block, or remove any empty blocks.');setPreview(false);return;}
  if(draft.requireConsent&&!draft.consentText.trim()){setError('Add the consent text participants should review.');setSettings(true);return;}
  setSaving(true);setError('');
  try{const form=await api.post<{id:number}>('/forms/create',{title:draft.title.trim(),description:draft.description.trim(),questions:draft.questions,document_template:null,allow_join:draft.allowJoin,allow_public_responses:draft.allowPublicResponses,require_consent:draft.requireConsent,consent_text:draft.requireConsent?draft.consentText:null,consent_document:draft.requireConsent?draft.consentDocument||null:null,public_require_consent:false,public_require_upload:false,join_code:String(Math.floor(10000+Math.random()*90000))});created.current=true;try{localStorage.removeItem(draftKey());}catch{}navigate(`/admin/form/${form.id}/summary`);}catch(e){setError(getApiErrorDetail(e)||'Could not create the consultation. Your draft is still here.');setSaving(false);}
 };
 if(legacy)return <><div className="fc-legacy-return"><button type="button" onClick={()=>setLegacy(false)}>← Back to question canvas</button></div><LegacyAdminFormNew/></>;
 return <main className="form-canvas" ref={canvas}>
  <header className="fc-toolbar"><button type="button" onClick={()=>navigate('/')}>← Consultations</button><span role="status" className="fc-save-state">{saved}</span><div><button type="button" aria-pressed={preview} onClick={()=>setPreview(!preview)}>{preview?'Edit form':'View as participant'}</button><button type="button" aria-expanded={settings} onClick={()=>setSettings(!settings)}>Settings</button><button type="button" className="cw-primary" disabled={saving} onClick={create}>{saving?'Creating…':'Create consultation'}</button></div></header>
  {error?<p role="alert" className="fc-error">{error}</p>:null}
  {settings?<aside className="fc-settings" aria-label="Consultation settings"><div className="fc-settings-title"><h2>Consultation settings</h2><button type="button" onClick={()=>setSettings(false)}>Close</button></div>
   <label><input type="checkbox" checked={draft.allowJoin} onChange={e=>change({allowJoin:e.target.checked})}/> Allow participants to join with the invitation code</label>
   <PublicShareSettings enabled={draft.allowPublicResponses} onEnabledChange={allowPublicResponses=>change({allowPublicResponses})}/>
   <ConsentSettings enabled={draft.requireConsent} onEnabledChange={requireConsent=>change({requireConsent})} consentText={draft.consentText} onConsentTextChange={consentText=>change({consentText})} consentDocument={draft.consentDocument} onConsentDocumentChange={consentDocument=>change({consentDocument})}/>
   <details><summary>Import questions</summary><QuestionnaireImporter onQuestionsImported={questions=>{change({questions});setAnswers({});setSelected(0);}} onImported={result=>setImportNotice(`Imported ${result.questions.length} questions. ${result.warnings.join(' ')}`)}/>{importNotice?<p role="status">{importNotice}</p>:null}</details>
   <button type="button" onClick={()=>setLegacy(true)}>Templates and document editor →</button>
  </aside>:null}
  <div className="fc-paper" data-preview={preview}>
   <p className="fc-eyebrow">{preview?'Participant view · answers here are for testing only':'Opening round'}</p>
   <div className="fc-introduction">{preview?<><h1>{draft.title||'Untitled consultation'}</h1>{draft.description?<p>{draft.description}</p>:null}</>:<><textarea aria-label="Consultation title" className="fc-title" rows={1} placeholder="Untitled consultation" value={draft.title} onChange={e=>change({title:e.target.value})}/><textarea aria-label="Introduction" className="fc-description" rows={1} placeholder="Add a short introduction for your participants…" value={draft.description} onChange={e=>change({description:e.target.value})}/></>}</div>
   {draft.questions.map((q,i)=>isVisible(q)?<section key={i} className={`fc-question ${selected===i?'fc-selected':''}`}>
    <div className="fc-question-top"><span>Question {i+1}{q.optional?' · Optional':''}</span>{!preview?<button type="button" aria-expanded={selected===i} onClick={()=>setSelected(selected===i?null:i)}>Question settings</button>:null}</div>
    {q.sectionTitle?<p className="fc-section-title">{q.sectionTitle}</p>:null}
    {preview?<h2>{q.label||'Write your question'}</h2>:<textarea aria-label={`Question ${i+1}`} className="fc-question-label" rows={1} placeholder="What would you like to ask?" value={q.label} onChange={e=>updateQuestion(i,{...q,label:e.target.value})}/>}
    {q.helpText?<p>{q.helpText}</p>:null}
    {!preview&&selected===i?<div className="fc-question-settings">
     <label><input type="checkbox" checked={!q.optional} onChange={e=>updateQuestion(i,{...q,optional:!e.target.checked})}/> Required</label>
     <label><input type="checkbox" checked={!isSurveyQuestion(q)} onChange={e=>updateQuestion(i,{...q,requireEvidence:e.target.checked,requireCounterarguments:e.target.checked,requireConfidence:e.target.checked})}/> Ask for evidence, reservations and confidence</label>
     {isSurveyQuestion(q)?<SurveyQuestionConfigurator question={q} index={i} onChange={value=>updateQuestion(i,value)}/>:null}
     <div className="fc-order"><button type="button" disabled={i===0} onClick={()=>reorder(i,i-1)} aria-label={`Move question ${i+1} up`}>Move up</button><button type="button" disabled={i===draft.questions.length-1} onClick={()=>reorder(i,i+1)} aria-label={`Move question ${i+1} down`}>Move down</button><button type="button" disabled={draft.questions.length===1} onClick={()=>{change({questions:draft.questions.filter((_,index)=>index!==i)});setAnswers({});setSelected(null);}} aria-label={`Remove question ${i+1}`}>Remove</button></div>
    </div>:null}
    <div className="fc-answer" aria-label={`Answer to question ${i+1}`}>
    {isSurveyQuestion(q)?<SurveyQuestionInput question={q} value={answers[`q${i+1}`]||emptyStructuredResponse()} onChange={value=>setAnswers(previous=>({...previous,[`q${i+1}`]:value}))} previewOnly={!preview}/>:<StructuredInput formId="canvas-preview" questionIndex={i} value={answers[`q${i+1}`]||emptyStructuredResponse()} onChange={value=>setAnswers(previous=>({...previous,[`q${i+1}`]:value}))} persistDraft={false} showEvidence={q.requireEvidence} showCounterarguments={q.requireCounterarguments} showConfidence={q.requireConfidence}/>}
    </div>
   </section>:null)}
   {!preview?<button type="button" className="fc-add" onClick={add}>+ Add question</button>:<p className="fc-preview-note">This is a preview. Test answers are not submitted or included in results.</p>}
  </div>
 </main>;
}
