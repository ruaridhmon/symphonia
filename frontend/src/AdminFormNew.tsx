import {useEffect, useLayoutEffect, useRef, useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {api, getApiErrorDetail} from './api/client';
import DocumentTemplateEditor from './components/DocumentTemplateEditor';
import DocumentTemplateResponse from './components/DocumentTemplateResponse';
import {buildInitialDocumentTemplateResponses, getEditableDocumentQuestion, parseDocumentTemplateFields} from './utils/documentTemplate';
import SurveyQuestionInput from './components/SurveyQuestionInput';
import StructuredInput from './components/StructuredInput';
import {ensureTypeTransition} from './components/SurveyQuestionConfigurator';
import InlineQuestionSettings, {CanvasSheet} from './components/CanvasQuestionSettings';
import ConsultationCreated from './components/ConsultationCreated';
import QuestionnaireImporter from './components/QuestionnaireImporter';
import ConsentSettings from './components/ConsentSettings';
import PublicShareSettings from './components/PublicShareSettings';
import {emptyStructuredResponse, type StructuredResponse} from './types/structured-input';
import {isSurveyQuestion, type ConfigurableQuestion, type SurveyInputType} from './utils/questions';

const blank = ():ConfigurableQuestion => ({label:'',inputType:'textarea',rows:4,requireEvidence:false,requireCounterarguments:false,requireConfidence:false,optional:false});
export type Draft={pendingFormId?:number;pendingJoinCode?:string;format?:'questions'|'document';documentTemplate?:string;title:string;description:string;questions:ConfigurableQuestion[];allowJoin:boolean;allowPublicResponses:boolean;requireConsent:boolean;consentText:string;consentDocument:string};
const fresh = ():Draft=>({title:'',description:'',questions:[blank()],allowJoin:true,allowPublicResponses:false,requireConsent:false,consentText:'I understand the purpose of this consultation and consent to my response being used within it.',consentDocument:''});
function draftKey(){try{return `symphonia:canvas-draft:v1:${localStorage.getItem('email')||'current'}`;}catch{return 'symphonia:canvas-draft:v1';}}
function readDraft():Draft{try{const value=JSON.parse(localStorage.getItem(draftKey())||'null');if(value&&typeof value.title==='string'&&typeof value.description==='string'&&Array.isArray(value.questions)&&value.questions.every((q:any)=>q&&typeof q.label==='string'))return {...fresh(),...value};}catch{}return fresh();}

/** One canvas and the same answer components in author and participant-view modes. */
export type CanvasEdit = {id:string; initial:Draft; roundNumber:number; locked:boolean; save:(draft:Draft)=>Promise<void>};
export default function AdminFormNew(){return <FormCanvas/>;}
export function FormCanvas({edit}:{edit?:CanvasEdit}){
 const navigate=useNavigate();
 const [draft,setDraft]=useState<Draft>(()=>edit?.initial??readDraft());
 const [preview,setPreview]=useState(false);
 const [settings,setSettings]=useState(false);
 const [importing,setImporting]=useState(false);
 const [receipt,setReceipt]=useState<{id:number;joinCode:string}|null>(null);
 const [fieldError,setFieldError]=useState<{index?:number;message:string}|null>(null);
 const pendingJoinCode=useRef(draft.pendingJoinCode||'');
 const documentMode=draft.format==='document';
 const template=draft.documentTemplate||'';
 const [selected,setSelected]=useState<number|null>(null);
 const [answers,setAnswers]=useState<Record<string,StructuredResponse>>(()=>buildInitialDocumentTemplateResponses(edit?.initial.documentTemplate||''));
 const [saving,setSaving]=useState(false);
 const [saved,setSaved]=useState('');
 const [error,setError]=useState('');
 const [importNotice,setImportNotice]=useState('');
 const [removed,setRemoved]=useState<{question:ConfigurableQuestion;index:number}|null>(null);
 const created=useRef(false);
 const pendingFormId=useRef<number|undefined>(draft.pendingFormId);
 const canvas=useRef<HTMLDivElement>(null);
 const [baseline,setBaseline]=useState(()=>JSON.stringify(edit?.initial));
 const dirty=edit?JSON.stringify(draft)!==baseline:true;
 useEffect(()=>{document.title=`${edit?'Edit':'Create'} a consultation — Symphonia`;},[!!edit]);
 useEffect(()=>{if(!edit||!dirty)return;const warn=(event:BeforeUnloadEvent)=>{event.preventDefault();event.returnValue='';};window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn);},[!!edit,dirty]);
 useEffect(()=>{if(created.current||edit)return;try{localStorage.setItem(draftKey(),JSON.stringify(draft));setSaved('Draft saved on this device');}catch{setSaved('Draft could not be saved on this device');}},[draft]);
 useLayoutEffect(()=>{canvas.current?.querySelectorAll<HTMLTextAreaElement>('.fc-title,.fc-description,.fc-question-label').forEach(field=>{field.style.height='auto';field.style.height=`${field.scrollHeight}px`;});},[draft,preview]);
 const focusQuestion=(index:number)=>requestAnimationFrame(()=>{const field=canvas.current?.querySelector<HTMLTextAreaElement>(`[aria-label="Question ${index+1}"]`);(field??canvas.current?.querySelector<HTMLButtonElement>('.fc-add'))?.focus();});
 const remove=(index:number)=>{
  if(edit?.locked)return;
  const question=draft.questions[index];
  if(question.questionId&&draft.questions.some(q=>q.conditionalOnQuestionId===question.questionId)){setError('This question controls a follow-up. Remove its dependent questions first.');return;}
  setRemoved({question,index});change({questions:draft.questions.filter((_,i)=>i!==index)});setAnswers({});setSelected(null);setError('');focusQuestion(Math.min(index,draft.questions.length-2));
 };
 const undoRemove=()=>{if(!removed)return;const questions=[...draft.questions];const index=Math.min(removed.index,questions.length);questions.splice(index,0,removed.question);change({questions});setAnswers({});setRemoved(null);focusQuestion(index);};
 const change=(patch:Partial<Draft>)=>{setFieldError(null);setDraft(previous=>({...previous,...patch}));};
 const updateQuestion=(index:number,question:ConfigurableQuestion)=>{setFieldError(null);setDraft(previous=>({...previous,questions:previous.questions.map((q,i)=>i===index?question:q)}));};
 const reorder=(from:number,to:number)=>{if(to<0||to>=draft.questions.length)return;const questions=[...draft.questions];[questions[from],questions[to]]=[questions[to],questions[from]];change({questions});setAnswers({});setSelected(to);};
 const add=()=>{const index=draft.questions.length;change({questions:[...draft.questions,blank()]});setSelected(null);requestAnimationFrame(()=>canvas.current?.querySelector<HTMLTextAreaElement>(`[aria-label="Question ${index+1}"]`)?.focus());};
 const isVisible=(q:ConfigurableQuestion,visited=new Set<ConfigurableQuestion>()):boolean=>{
  if(visited.has(q))return false;visited.add(q);
  const options=q.conditionalOnOptions?.length?q.conditionalOnOptions:q.conditionalOnOption?[q.conditionalOnOption]:[];
  if(!preview||!q.conditionalOnQuestionId||!options.length)return true;
  const index=draft.questions.findIndex(item=>item.questionId===q.conditionalOnQuestionId);
  const chosen=(answers[`q${index+1}`]?.position||'').split('\n').map(value=>value.trim());
  return index>=0&&isVisible(draft.questions[index],visited)&&options.some(option=>chosen.includes(option));
 };
 const invalid=(message:string,index?:number,control?:string)=>{
  setError('');setFieldError({index,message});setPreview(false);setSettings(false);setImporting(false);if(control)setSelected(index??null);
  requestAnimationFrame(()=>{const scope=index===undefined?canvas.current:canvas.current?.querySelector(`[data-question-index="${index}"]`);const field=scope?.querySelector<HTMLElement>(control?`[aria-label="${control}"]`:index===undefined?'#canvas-title':`[aria-label="Question ${index+1}"]`);field?.focus();field?.scrollIntoView?.({block:'center',behavior:'smooth'});});
 };
 const create=async()=>{
  if(saving||created.current)return;
  setFieldError(null);
  if(!draft.title.trim()){invalid('Give your consultation a title.');return;}
  if(!documentMode&&!draft.questions.length){setError('Add at least one question.');setPreview(false);focusQuestion(0);return;}
  if(!documentMode){for(const [index,q] of draft.questions.entries()){
   if(!q.label.trim()){invalid('Write a question, or delete this empty block.',index);return;}
   if(isSurveyQuestion(q)&&q.inputType==='slider'&&(q.maxValue??10)<=(q.minValue??0)){invalid('The maximum must be greater than the minimum.',index,'Maximum');return;}
   if(isSurveyQuestion(q)&&['single_select','multi_select'].includes(q.inputType||'')&&(q.options?.length??0)<2){invalid('Add at least two choices.',index,'Options');return;}
   if(q.inputType==='multi_select'&&q.maxSelections!=null&&(!Number.isInteger(q.maxSelections)||q.maxSelections<1)){invalid('Use a positive whole number for maximum selections.',index,'Maximum selections');return;}
  }}
  if(documentMode&&!getEditableDocumentQuestion(template)&&!parseDocumentTemplateFields(template).length){setError('Add at least one response field to the document.');setPreview(false);return;}
  if(draft.requireConsent&&!draft.consentText.trim()){setError('Add the consent text participants should review.');setSettings(true);return;}
  setSaving(true);setError('');
  try{if(edit){await edit.save(draft);setBaseline(JSON.stringify(draft));setSaved('Changes saved');setSaving(false);return;}if(pendingFormId.current)await api.put(`/forms/${pendingFormId.current}`,{title:draft.title.trim(),questions:draft.questions,document_template:documentMode?template:null,allow_public_responses:draft.allowPublicResponses,require_consent:draft.requireConsent,consent_text:draft.requireConsent?draft.consentText:null,consent_document:draft.requireConsent?draft.consentDocument||null:null});const form=pendingFormId.current?{id:pendingFormId.current,join_code:pendingJoinCode.current}:await api.post<{id:number;join_code:string}>('/forms/create',{title:draft.title.trim(),questions:draft.questions,document_template:documentMode?template:null,allow_join:draft.allowJoin,allow_public_responses:draft.allowPublicResponses,require_consent:draft.requireConsent,consent_text:draft.requireConsent?draft.consentText:null,consent_document:draft.requireConsent?draft.consentDocument||null:null,public_require_consent:false,public_require_upload:false,});pendingFormId.current=form.id;pendingJoinCode.current=form.join_code||pendingJoinCode.current;change({pendingFormId:form.id,pendingJoinCode:pendingJoinCode.current});if(draft.description.trim()||draft.pendingFormId){change({pendingFormId:form.id});const rounds=await api.get<{id:number;is_active:boolean;context_settings?:Record<string,unknown>}[]>(`/forms/${form.id}/rounds`);const active=rounds.find(r=>r.is_active);if(!active)throw new Error('The first round is not ready. Retry to finish creating this consultation.');await api.patch(`/forms/${form.id}/rounds/${active.id}`,{context_settings:{...active.context_settings,intro_body:draft.description.trim()}});}if(!pendingJoinCode.current){const savedForm=await api.get<{join_code:string}>(`/forms/${form.id}`);pendingJoinCode.current=savedForm.join_code;}created.current=true;try{localStorage.removeItem(draftKey());}catch{}setSaving(false);setReceipt({id:form.id,joinCode:pendingJoinCode.current});}catch(e){setError(getApiErrorDetail(e)||`Could not ${edit?'save':'create'} the consultation. Your draft is still here.`);setSaving(false);}
 };
 if(receipt)return <ConsultationCreated title={draft.title} joinCode={receipt.joinCode} allowJoin={draft.allowJoin} publicResponses={draft.allowPublicResponses} onContinue={()=>navigate(`/admin/form/${receipt.id}/summary`)} onEdit={()=>navigate(`/admin/form/${receipt.id}`)}/>;
 return <main className="form-canvas fc-composer" ref={canvas}>
  <header className="fc-toolbar"><button type="button" onClick={()=>{if(!edit||!dirty||window.confirm('Leave without saving your changes?'))navigate(edit?`/admin/form/${edit.id}/summary`:'/');}}>← {edit?'Summary':'Consultations'}</button><span role="status" className="fc-save-state">{edit?(dirty?'Unsaved changes':saved||'All changes saved'):saved}</span><div><nav className="fc-mode-switch" aria-label="Canvas mode"><button type="button" aria-pressed={!preview} onClick={()=>{setSelected(null);setPreview(false);}}>Edit</button><button type="button" aria-pressed={preview} onClick={()=>{setSelected(null);setPreview(true);}}>Preview</button></nav><button type="button" onClick={()=>setImporting(true)} disabled={!!edit?.locked}>Import questions</button><button type="button" aria-expanded={settings} onClick={()=>setSettings(!settings)}>Settings</button><button type="button" className="cw-primary" disabled={saving||(!!edit&&!dirty)} onClick={create}>{saving?(edit?'Saving…':'Creating…'):(edit?'Save changes':'Create consultation')}</button></div></header>
  {error?<p role="alert" className="fc-error">{error}</p>:null}
  {settings?<CanvasSheet title="Consultation settings" onClose={()=>setSettings(false)}><div className="fc-settings">
   {!edit?<label><input type="checkbox" checked={draft.allowJoin} onChange={e=>change({allowJoin:e.target.checked})}/> Allow participants to join with the invitation code</label>:null}
   <PublicShareSettings enabled={draft.allowPublicResponses} onEnabledChange={allowPublicResponses=>change({allowPublicResponses})}/>
   <ConsentSettings enabled={draft.requireConsent} onEnabledChange={requireConsent=>change({requireConsent})} consentText={draft.consentText} onConsentTextChange={consentText=>change({consentText})} consentDocument={draft.consentDocument} onConsentDocumentChange={consentDocument=>change({consentDocument})}/>
   {!edit?.locked?<fieldset className="fc-format"><legend>Response format</legend>{(['questions','document'] as const).map(format=><label key={format}><input type="radio" name="response-format" checked={(draft.format||'questions')===format} onChange={()=>{change({format,documentTemplate:draft.documentTemplate||'{{long:Your response}}'});setAnswers({});}}/>{format==='questions'?'Questions':'Document'}</label>)}</fieldset>:null}
  </div></CanvasSheet>:null}
  {importing?<CanvasSheet title="Import questions" onClose={()=>setImporting(false)}><QuestionnaireImporter onQuestionsImported={questions=>{change({questions,format:'questions'});setAnswers({});setSelected(null);setRemoved(null);}} onImported={result=>{setImportNotice(`Imported ${result.questions.length} questions. ${result.warnings.join(' ')}`);setImporting(false);}}/></CanvasSheet>:null}
  {importNotice?<p className="fc-import-notice" role="status">{importNotice}</p>:null}
  <div className="fc-paper" data-preview={preview}>
   <p className="fc-eyebrow">{edit?`Round ${edit.roundNumber}`:'New consultation'}<span>{documentMode?'Document':`${draft.questions.length} question${draft.questions.length===1?'':'s'}`}</span></p>

   <div className="fc-introduction">{preview?<><h1 className={!draft.title?'fc-empty-title':undefined}>{draft.title||'Name your consultation'}</h1><p className={!draft.description?'fc-empty-intro':undefined}>{draft.description||'Add an introduction (optional)'}</p></>:<><label className="sr-only" htmlFor="canvas-title">Consultation title</label><textarea aria-invalid={fieldError?.index===undefined&&!!fieldError} aria-describedby={fieldError?.index===undefined&&fieldError?"fc-title-error":undefined} id="canvas-title" aria-label="Consultation title" className="fc-title" rows={1} placeholder="Name your consultation" value={draft.title} onChange={e=>change({title:e.target.value})}/>{<textarea aria-label="Introduction" className="fc-description" rows={1} placeholder="Add an introduction (optional)" value={draft.description} onChange={e=>change({description:e.target.value})}/>}</>}</div>
   {fieldError&&fieldError.index===undefined?<p id="fc-title-error" role="alert" className="fc-error">{fieldError.message}</p>:null}
   {edit?.locked&&!preview?<p className="fc-preview-note">This round has responses. Questions are preserved so answers keep their meaning. Use a new round to revise them.</p>:null}
   {documentMode?<div className="fc-document">{preview||edit?.locked?<DocumentTemplateResponse template={template} answers={answers} onChange={(key,value)=>setAnswers(previous=>({...previous,[key]:value}))}/>:<DocumentTemplateEditor value={template} onChange={documentTemplate=>{change({documentTemplate});setAnswers(buildInitialDocumentTemplateResponses(documentTemplate));}} previewAnswers={answers} onPreviewChange={(key,value)=>setAnswers(previous=>({...previous,[key]:value}))}/>}</div>:draft.questions.map((q,i)=>isVisible(q)?<section key={i} data-question-index={i} data-preview={preview} className={`fc-question ${fieldError?.index===i?'fc-invalid':''} ${selected===i?'fc-selected':''}`}>
    <div className="fc-question-top"><span>Question {i+1}{q.optional?' · Optional':''}</span>{!edit?.locked?<div className="fc-question-actions" style={preview?{visibility:'hidden'}:undefined} aria-hidden={preview||undefined}>{isSurveyQuestion(q)?<select aria-label={`Answer type for question ${i+1}`} value={q.inputType||'textarea'} onChange={e=>{updateQuestion(i,ensureTypeTransition(q,e.target.value as SurveyInputType));setAnswers({});if(['single_select','multi_select','slider','likert'].includes(e.target.value))setSelected(i);}}><option value="textarea">Long answer</option><option value="text">Short answer</option><option value="single_select">Single choice</option><option value="multi_select">Multiple choice</option><option value="slider">Number scale</option><option value="likert">Rating scale</option></select>:null}<button type="button" aria-label={`Options for question ${i+1}`} aria-expanded={selected===i} onClick={()=>setSelected(selected===i?null:i)}>Options</button><button type="button" className="fc-delete" aria-label={`Delete question ${i+1}`} title="Delete question" onClick={()=>remove(i)}><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M3 6h18M9 6V4h6v2M5 6l1 14h12l1-14M10 10v6m4-6v6"/></svg><span>Delete</span></button></div>:null}</div>
    {q.sectionTitle&&q.sectionTitle!==draft.questions[i-1]?.sectionTitle?<p className="fc-section-title">{q.sectionTitle}</p>:null}
    {preview||edit?.locked?<h2 className={!q.label?'fc-empty-question':undefined}>{q.label||(i===0?'What would you like to ask your panel?':'Write your next question…')}</h2>:<textarea aria-invalid={fieldError?.index===i} aria-describedby={fieldError?.index===i?`fc-question-error-${i}`:undefined} aria-label={`Question ${i+1}`} className="fc-question-label" rows={1} placeholder={i===0?"What would you like to ask your panel?":"Write your next question…"} value={q.label} onChange={e=>updateQuestion(i,{...q,label:e.target.value})}/>}

    {fieldError?.index===i?<p id={`fc-question-error-${i}`} className="fc-error" role="alert">{fieldError.message}</p>:null}
    {!isSurveyQuestion(q)&&q.helpText?<p className="fc-guidance">{q.helpText}</p>:null}
    <div className="fc-answer" aria-label={`Answer to question ${i+1}`}>
    {isSurveyQuestion(q)?<SurveyQuestionInput question={q} authoring={!preview} value={answers[`q${i+1}`]||emptyStructuredResponse()} onChange={value=>setAnswers(previous=>({...previous,[`q${i+1}`]:value}))} previewOnly={false}/>:<StructuredInput formId="canvas-preview" questionIndex={i} value={answers[`q${i+1}`]||emptyStructuredResponse()} onChange={value=>setAnswers(previous=>({...previous,[`q${i+1}`]:value}))} persistDraft={false} showEvidence={q.requireEvidence} showCounterarguments={q.requireCounterarguments} showConfidence={q.requireConfidence}/>}
    </div>
    {!preview&&!edit?.locked&&selected===i?<InlineQuestionSettings key={`${i}:${q.inputType}`} question={q} index={i} onChange={value=>updateQuestion(i,value)} onClose={()=>{setSelected(null);requestAnimationFrame(()=>canvas.current?.querySelector<HTMLButtonElement>(`[aria-label="Options for question ${i+1}"]`)?.focus());}} first={i===0} last={i===draft.questions.length-1} only={draft.questions.length===1} onMove={direction=>reorder(i,i+direction)} onRemove={()=>remove(i)}/>:null}
   </section>:null)}
   {removed&&!preview?<div className="fc-undo" role="status"><span>Question deleted</span><button type="button" onClick={undoRemove}>Undo</button><button type="button" aria-label="Dismiss undo" onClick={()=>setRemoved(null)}>×</button></div>:null}
   {!draft.questions.length&&!documentMode?<p className="fc-empty-state">Add a question to begin.</p>:null}
   {!edit?.locked&&!documentMode?<button type="button" className="fc-add" style={preview?{visibility:'hidden'}:undefined} aria-hidden={preview||undefined} tabIndex={preview?-1:0} onClick={add}>+ Add question</button>:null}
   <p className="fc-canvas-hint">{preview?'Try the form as a participant. These answers are not submitted.':edit?'Preview to see what participants will see. Save changes when you’re ready.':'Your draft saves automatically. Preview to see what participants will see.'}</p>
  </div>
 </main>;
}
