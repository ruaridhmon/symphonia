import {useEffect, useRef, useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {api, getApiErrorDetail} from './api/client';
import DocumentTemplateEditor from './components/DocumentTemplateEditor';
import DocumentTemplateResponse from './components/DocumentTemplateResponse';
import {buildInitialDocumentTemplateResponses, getEditableDocumentQuestion, parseDocumentTemplateFields} from './utils/documentTemplate';
import SurveyQuestionInput from './components/SurveyQuestionInput';
import StructuredInput from './components/StructuredInput';
import SurveyQuestionConfigurator, {ensureTypeTransition} from './components/SurveyQuestionConfigurator';
import QuestionnaireImporter from './components/QuestionnaireImporter';
import ConsentSettings from './components/ConsentSettings';
import PublicShareSettings from './components/PublicShareSettings';
import {emptyStructuredResponse, type StructuredResponse} from './types/structured-input';
import {isSurveyQuestion, type ConfigurableQuestion, type SurveyInputType} from './utils/questions';

const blank = ():ConfigurableQuestion => ({label:'',inputType:'textarea',rows:4,requireEvidence:false,requireCounterarguments:false,requireConfidence:false,optional:false});
export type Draft={format?:'questions'|'document';documentTemplate?:string;title:string;description:string;questions:ConfigurableQuestion[];allowJoin:boolean;allowPublicResponses:boolean;requireConsent:boolean;consentText:string;consentDocument:string};
const fresh = ():Draft=>({title:'',description:'',questions:[blank()],allowJoin:true,allowPublicResponses:false,requireConsent:false,consentText:'I understand the purpose of this consultation and consent to my response being used within it.',consentDocument:''});
function draftKey(){try{return `symphonia:canvas-draft:v1:${localStorage.getItem('email')||'current'}`;}catch{return 'symphonia:canvas-draft:v1';}}
function readDraft():Draft{try{const value=JSON.parse(localStorage.getItem(draftKey())||'null');if(value&&typeof value.title==='string'&&typeof value.description==='string'&&Array.isArray(value.questions)&&value.questions.length&&value.questions.every((q:any)=>q&&typeof q.label==='string'))return {...fresh(),...value};}catch{}return fresh();}

/** One canvas and the same answer components in author and participant-view modes. */
export type CanvasEdit = {id:string; initial:Draft; roundNumber:number; locked:boolean; save:(draft:Draft)=>Promise<void>};
export default function AdminFormNew(){return <FormCanvas/>;}
export function FormCanvas({edit}:{edit?:CanvasEdit}){
 const navigate=useNavigate();
 const [draft,setDraft]=useState<Draft>(()=>edit?.initial??readDraft());
 const [preview,setPreview]=useState(false);
 const [settings,setSettings]=useState(false);
 const documentMode=draft.format==='document';
 const template=draft.documentTemplate||'';
 const [selected,setSelected]=useState<number|null>(null);
 const [answers,setAnswers]=useState<Record<string,StructuredResponse>>(()=>buildInitialDocumentTemplateResponses(edit?.initial.documentTemplate||''));
 const [saving,setSaving]=useState(false);
 const [saved,setSaved]=useState('');
 const [error,setError]=useState('');
 const [importNotice,setImportNotice]=useState('');
 const created=useRef(false);
 const canvas=useRef<HTMLDivElement>(null);
 const [baseline,setBaseline]=useState(()=>JSON.stringify(edit?.initial));
 const dirty=edit?JSON.stringify(draft)!==baseline:true;
 useEffect(()=>{document.title=`${edit?'Edit':'Create'} a consultation — Symphonia`;},[!!edit]);
 useEffect(()=>{if(!edit||!dirty)return;const warn=(event:BeforeUnloadEvent)=>{event.preventDefault();event.returnValue='';};window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn);},[!!edit,dirty]);
 useEffect(()=>{if(created.current||edit)return;try{localStorage.setItem(draftKey(),JSON.stringify(draft));setSaved('Draft saved on this device');}catch{setSaved('Draft could not be saved on this device');}},[draft]);
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
  if(!documentMode&&(!draft.questions.length||draft.questions.some(q=>!q.label.trim()))){setError('Write a question in each block, or remove any empty blocks.');setPreview(false);return;}
  if(documentMode&&!getEditableDocumentQuestion(template)&&!parseDocumentTemplateFields(template).length){setError('Add at least one response field to the document.');setPreview(false);return;}
  if(draft.requireConsent&&!draft.consentText.trim()){setError('Add the consent text participants should review.');setSettings(true);return;}
  setSaving(true);setError('');
  try{if(edit){await edit.save(draft);setBaseline(JSON.stringify(draft));setSaved('Changes saved');setSaving(false);return;}const form=await api.post<{id:number}>('/forms/create',{title:draft.title.trim(),description:draft.description.trim(),questions:draft.questions,document_template:documentMode?template:null,allow_join:draft.allowJoin,allow_public_responses:draft.allowPublicResponses,require_consent:draft.requireConsent,consent_text:draft.requireConsent?draft.consentText:null,consent_document:draft.requireConsent?draft.consentDocument||null:null,public_require_consent:false,public_require_upload:false,join_code:String(Math.floor(10000+Math.random()*90000))});created.current=true;try{localStorage.removeItem(draftKey());}catch{}navigate(`/admin/form/${form.id}/summary`);}catch(e){setError(getApiErrorDetail(e)||`Could not ${edit?'save':'create'} the consultation. Your draft is still here.`);setSaving(false);}
 };
 return <main className="form-canvas" ref={canvas}>
  <header className="fc-toolbar"><button type="button" onClick={()=>{if(!edit||!dirty||window.confirm('Leave without saving your changes?'))navigate(edit?`/admin/form/${edit.id}/summary`:'/');}}>← {edit?'Summary':'Consultations'}</button><span role="status" className="fc-save-state">{edit?(dirty?'Unsaved changes':saved||'All changes saved'):saved}</span><div><button type="button" aria-pressed={preview} onClick={()=>setPreview(!preview)}>{preview?'Edit':'Preview'}</button><button type="button" aria-expanded={settings} onClick={()=>setSettings(!settings)}>Settings</button><button type="button" className="cw-primary" disabled={saving||(!!edit&&!dirty)} onClick={create}>{saving?(edit?'Saving…':'Creating…'):(edit?'Save changes':'Create consultation')}</button></div></header>
  {error?<p role="alert" className="fc-error">{error}</p>:null}
  {settings?<aside className="fc-settings" aria-label="Consultation settings"><div className="fc-settings-title"><h2>Consultation settings</h2><button type="button" onClick={()=>setSettings(false)}>Close</button></div>
   {!edit?<label><input type="checkbox" checked={draft.allowJoin} onChange={e=>change({allowJoin:e.target.checked})}/> Allow participants to join with the invitation code</label>:null}
   <PublicShareSettings enabled={draft.allowPublicResponses} onEnabledChange={allowPublicResponses=>change({allowPublicResponses})}/>
   <ConsentSettings enabled={draft.requireConsent} onEnabledChange={requireConsent=>change({requireConsent})} consentText={draft.consentText} onConsentTextChange={consentText=>change({consentText})} consentDocument={draft.consentDocument} onConsentDocumentChange={consentDocument=>change({consentDocument})}/>
   {!edit?.locked&&!documentMode?<details><summary>Import questions</summary><QuestionnaireImporter onQuestionsImported={questions=>{change({questions});setAnswers({});setSelected(0);}} onImported={result=>setImportNotice(`Imported ${result.questions.length} questions. ${result.warnings.join(' ')}`)}/>{importNotice?<p role="status">{importNotice}</p>:null}</details>:null}
   {!edit?.locked?<fieldset className="fc-format"><legend>Response format</legend>{(['questions','document'] as const).map(format=><label key={format}><input type="radio" name="response-format" checked={(draft.format||'questions')===format} onChange={()=>{change({format,documentTemplate:draft.documentTemplate||'{{long:Your response}}'});setAnswers({});}}/>{format==='questions'?'Questions':'Document'}</label>)}</fieldset>:null}
  </aside>:null}
  <div className="fc-paper" data-preview={preview}>
   <p className="fc-eyebrow">{preview?'Preview · test answers are not submitted':edit?`Round ${edit.roundNumber}`:'Create a consultation'}</p>
   {!edit&&!preview?<p className="fc-create-guide">Write your questions, preview the form, then invite your panel.</p>:null}
   <div className="fc-introduction">{preview?<><h1>{draft.title||'Untitled consultation'}</h1>{draft.description?<p>{draft.description}</p>:null}</>:<><label className="fc-field-label" htmlFor="canvas-title">Consultation title</label><textarea id="canvas-title" aria-label="Consultation title" className="fc-title" rows={1} placeholder="What is your consultation about?" value={draft.title} onChange={e=>change({title:e.target.value})}/>{!edit?<textarea aria-label="Introduction" className="fc-description" rows={1} placeholder="Add a short introduction for your participants…" value={draft.description} onChange={e=>change({description:e.target.value})}/>:null}</>}</div>
   {edit?.locked&&!preview?<p className="fc-preview-note">This round has responses. Questions are preserved so answers keep their meaning. Use a new round to revise them.</p>:null}
   {documentMode?<div className="fc-document">{preview||edit?.locked?<DocumentTemplateResponse template={template} answers={answers} onChange={(key,value)=>setAnswers(previous=>({...previous,[key]:value}))}/>:<DocumentTemplateEditor value={template} onChange={documentTemplate=>{change({documentTemplate});setAnswers(buildInitialDocumentTemplateResponses(documentTemplate));}} previewAnswers={answers} onPreviewChange={(key,value)=>setAnswers(previous=>({...previous,[key]:value}))}/>}</div>:draft.questions.map((q,i)=>isVisible(q)?<section key={i} className={`fc-question ${selected===i?'fc-selected':''}`}>
    <div className="fc-question-top"><span>Question {i+1}{q.optional?' · Optional':''}</span>{!preview&&!edit?.locked?<div className="fc-question-actions">{isSurveyQuestion(q)?<select aria-label={`Answer type for question ${i+1}`} value={q.inputType||'textarea'} onChange={e=>{updateQuestion(i,ensureTypeTransition(q,e.target.value as SurveyInputType));setAnswers({});if(['single_select','multi_select','slider','likert'].includes(e.target.value))setSelected(i);}}><option value="textarea">Long answer</option><option value="text">Short answer</option><option value="single_select">Single choice</option><option value="multi_select">Multiple choice</option><option value="slider">Number scale</option><option value="likert">Rating scale</option></select>:null}<button type="button" aria-expanded={selected===i} onClick={()=>setSelected(selected===i?null:i)}>Options</button></div>:null}</div>
    {q.sectionTitle&&q.sectionTitle!==draft.questions[i-1]?.sectionTitle?<p className="fc-section-title">{q.sectionTitle}</p>:null}
    {preview||edit?.locked?<h2>{q.label||'Write your question'}</h2>:<textarea aria-label={`Question ${i+1}`} className="fc-question-label" rows={1} placeholder="What would you like to ask?" value={q.label} onChange={e=>updateQuestion(i,{...q,label:e.target.value})}/>}

    {!preview&&!edit?.locked&&selected===i?<div className="fc-question-settings">
     {!isSurveyQuestion(q)?<label><input type="checkbox" checked={!q.optional} onChange={e=>updateQuestion(i,{...q,optional:!e.target.checked})}/> Required</label>:null}
     <label><input type="checkbox" checked={!isSurveyQuestion(q)} onChange={e=>updateQuestion(i,{...q,requireEvidence:e.target.checked,requireCounterarguments:e.target.checked,requireConfidence:e.target.checked})}/> Ask for evidence, reservations and confidence</label>
     {isSurveyQuestion(q)?<SurveyQuestionConfigurator showType={false} question={q} index={i} onChange={value=>updateQuestion(i,value)}/>:null}
     <div className="fc-order"><button type="button" disabled={i===0} onClick={()=>reorder(i,i-1)} aria-label={`Move question ${i+1} up`}>Move up</button><button type="button" disabled={i===draft.questions.length-1} onClick={()=>reorder(i,i+1)} aria-label={`Move question ${i+1} down`}>Move down</button><button type="button" disabled={draft.questions.length===1} onClick={()=>{change({questions:draft.questions.filter((_,index)=>index!==i)});setAnswers({});setSelected(null);}} aria-label={`Remove question ${i+1}`}>Remove</button></div>
    </div>:null}
    <div className="fc-answer" aria-label={`Answer to question ${i+1}`}>
    {isSurveyQuestion(q)?<SurveyQuestionInput question={q} authoring={!preview} value={answers[`q${i+1}`]||emptyStructuredResponse()} onChange={value=>setAnswers(previous=>({...previous,[`q${i+1}`]:value}))} previewOnly={!preview}/>:<StructuredInput formId="canvas-preview" questionIndex={i} value={answers[`q${i+1}`]||emptyStructuredResponse()} onChange={value=>setAnswers(previous=>({...previous,[`q${i+1}`]:value}))} persistDraft={false} showEvidence={q.requireEvidence} showCounterarguments={q.requireCounterarguments} showConfidence={q.requireConfidence}/>}
    </div>
   </section>:null)}
   {!preview&&!edit?.locked&&!documentMode?<button type="button" className="fc-add" onClick={add}>+ Add question</button>:preview?<p className="fc-preview-note">This is a preview. Test answers are not submitted or included in results.</p>:null}
  </div>
 </main>;
}
