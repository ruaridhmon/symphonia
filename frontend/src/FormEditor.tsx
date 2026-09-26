import {useEffect, useState} from 'react';
import {useParams} from 'react-router-dom';
import {api, getApiErrorDetail} from './api/client';
import {FormCanvas, type CanvasEdit, type Draft} from './AdminFormNew';
import {normalizeQuestion, type QuestionInput} from './utils/questions';

type FormRecord={title:string;description?:string;questions:QuestionInput[];document_template?:string|null;allow_join:boolean;allow_public_responses:boolean;consent_required?:boolean;consent_text?:string;consent_document?:string;public_require_consent?:boolean;public_consent_text?:string;public_require_upload?:boolean;public_upload_prompt?:string};
type Round={id:number;context_settings?:Record<string,unknown>;round_number:number;is_active:boolean;questions:QuestionInput[];response_count:number;draft_count?:number};
export function editPayload(form:FormRecord,draft:Draft){
 return {title:draft.title.trim(),questions:draft.questions,document_template:draft.format==='document'?draft.documentTemplate: null,allow_public_responses:draft.allowPublicResponses,require_consent:draft.requireConsent,consent_text:draft.requireConsent?draft.consentText:null,consent_document:draft.requireConsent?draft.consentDocument||null:null,public_require_consent:form.public_require_consent??false,public_consent_text:form.public_consent_text??null,public_require_upload:form.public_require_upload??false,public_upload_prompt:form.public_upload_prompt??null};
}
export default function FormEditor(){
 const {id}=useParams();
 const [data,setData]=useState<{id:string;edit:CanvasEdit;document:boolean}|null>(null);
 const [error,setError]=useState('');
 const [retry,setRetry]=useState(0);
 useEffect(()=>{let cancelled=false;setData(null);setError('');
  Promise.all([api.get<FormRecord>(`/forms/${id}`),api.get<Round[]>(`/forms/${id}/rounds`)]).then(([form,rounds])=>{
   if(cancelled||!id)return;
   const active=rounds.find(round=>round.is_active);
   const initial:Draft={format:form.document_template?'document':'questions',documentTemplate:form.document_template||'',title:form.title,description:String(active?.context_settings?.intro_body||form.description||''),questions:(active?.questions??form.questions).map(normalizeQuestion),allowJoin:form.allow_join,allowPublicResponses:form.allow_public_responses,requireConsent:!!(form.consent_required||form.public_require_consent),consentText:form.consent_text||form.public_consent_text||'',consentDocument:form.consent_document||''};
   let savedIntroduction=initial.description;
   setData({id,document:!!form.document_template,edit:{id,initial,roundNumber:active?.round_number??1,locked:!!active&&(active.response_count>0||(active.draft_count??0)>0),save:async draft=>{await api.put(`/forms/${id}`,editPayload(form,draft));if(active&&draft.description!==savedIntroduction){await api.patch(`/forms/${id}/rounds/${active.id}`,{context_settings:{...active.context_settings,intro_body:draft.description.trim()}});savedIntroduction=draft.description;}}}});
  }).catch(e=>{if(!cancelled)setError(getApiErrorDetail(e)||'Could not load this consultation. Your saved form has not changed.');});
  return()=>{cancelled=true;};
 },[id,retry]);
 if(error)return <main className="form-canvas"><p role="alert" className="fc-error">{error}</p><button onClick={()=>setRetry(value=>value+1)}>Try again</button></main>;
 if(!data||data.id!==id)return <main className="form-canvas"><p role="status" className="fc-eyebrow">Loading consultation…</p></main>;
 return <FormCanvas key={id} edit={data.edit}/>;
}
