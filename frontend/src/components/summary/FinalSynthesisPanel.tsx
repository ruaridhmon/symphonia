import * as React from 'react';
import {api, getApiErrorDetail} from '../../api/client';
import type {ReasoningGraph} from '../../types/synthesis';
import {renderReasoningFlow,clearReasoningFlow} from '../../utils/reasoningFlow';
type Recorded={expert:string;response_id:number;position:string;confidence:string;justification:string;original_answers?:Record<string,unknown>;before?:Recorded|null;position_changed?:boolean|null;confidence_changed?:boolean|null};
type Account={revision:string;title:string;stage:number;markdown:string;saved_at?:string;completed?:boolean;reasoning_graph?:ReasoningGraph|null;round_two_count:number;round_three_count:number;unrated_claims?:{id:string;text:string;origin:string}[];claims:{id:string;text:string;origin:string;inference_question?:string;positions:{label:string;count:number}[];confidence:{label:string;count:number}[];changes:number;matched:number;final_responses:Recorded[];round_two:Recorded[]}[]};
type Result={preview:Account;saved:Account|null;stale:boolean;collection_open:boolean};
export interface FinalSynthesisProps{formId:number;onComplete?:()=>void;}
export default function FinalSynthesisPanel({formId,onComplete}:FinalSynthesisProps){
 const [result,setResult]=React.useState<Result|null>(null),[error,setError]=React.useState(''),[busy,setBusy]=React.useState(false),[showCurrent,setShowCurrent]=React.useState(false);
 const graph=React.useRef<HTMLDivElement>(null);
 const account=showCurrent?result?.preview:result?.saved || result?.preview;
 const refresh=React.useCallback(async()=>{setBusy(true);setError('');try{setResult(await api.get<Result>(`/forms/${formId}/final_synthesis`));}catch(e){setError(getApiErrorDetail(e) || 'Could not load final synthesis.');}finally{setBusy(false);}},[formId]);
 React.useEffect(()=>{let active=true;setResult(null);setError('');api.get<Result>(`/forms/${formId}/final_synthesis`).then(r=>{if(active)setResult(r);}).catch(e=>{if(active)setError(getApiErrorDetail(e) || 'Could not load final synthesis.');});return()=>{active=false;};},[formId]);
 React.useEffect(()=>{const root=graph.current;if(root&&account?.reasoning_graph)renderReasoningFlow(root,account.reasoning_graph);return()=>{if(root)clearReasoningFlow(root);};},[account]);
 async function save(complete=false){
  if(!result)return;
  if(complete&&!window.confirm(`Finish this study with ${result.preview.round_three_count} Round 3 responses? This closes Round 3 submissions and saves the final synthesis.`))return;
  setBusy(true);setError('');try{const saved=await api.post<Result>(`/forms/${formId}/final_synthesis`,{expected_revision:result.preview.revision,complete});setResult(saved);setShowCurrent(false);if(complete)onComplete?.();}catch(e){setError(getApiErrorDetail(e) || 'Could not save final synthesis.');}finally{setBusy(false);}
 }
 function download(kind:'json'|'md'){
  if(!account)return;
  const blob=new Blob([kind==='json'?JSON.stringify(account,null,2):account.markdown],{type:kind==='json'?'application/json':'text/markdown'}),url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=`symphonia-final-${formId}.${kind}`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
 }
 return <section className="final-synthesis" aria-label="Final synthesis">
  <header className="fs-heading"><div><h2>Round 4 · Final synthesis</h2><p>Three expert rounds, followed by one faithful account of the panel’s reasoning.</p></div><button type="button" onClick={()=>void refresh()} disabled={busy}>Refresh</button></header>
  {error&&<p role="alert" className="cw-notice">{error}</p>}
  {!account&&!error&&<p role="status">Loading the recorded judgments…</p>}
  {account&&<>
   <div className="fs-status"><span>{account.completed?'Completed':result?.saved&&!showCurrent?'Saved snapshot':'Preview · not yet saved'}{account.saved_at?` · ${new Date(account.saved_at).toLocaleString()}`:''}</span><span>{account.round_two_count} Round 2 responses · {account.round_three_count} Round 3 responses</span></div>
   {result?.collection_open&&<p className="fs-note">Round 3 is still open. Save a snapshot or finish the study when the panel has responded.</p>}
   {result?.stale&&<p role="status" className="cw-notice">Recorded data has changed since this snapshot. <button type="button" onClick={()=>setShowCurrent(v=>!v)}>{showCurrent?'View saved snapshot':'Review current data'}</button></p>}
   <div className="fs-actions"><button type="button" disabled={busy || !!(result?.stale&&!showCurrent)} onClick={()=>void save()}>Save snapshot</button>{result?.collection_open&&<button type="button" className="cw-primary" disabled={busy || !!(result?.stale&&!showCurrent)} onClick={()=>void save(true)}>Finish study</button>}<details><summary>Download</summary><button type="button" onClick={()=>download('md')}>Readable account (.md)</button><button type="button" onClick={()=>download('json')}>Full audit data (.json)</button></details></div>
   <p className="fs-note">Claim wording is unchanged. Counts come from recorded answers; confidence is separate from agreement. Minority positions, missing answers and persistent disagreement remain visible. This account uses a reproducible data organizer.</p>
   <div className="fs-claims">{account.claims.map(c=><article key={c.id}>
    <h3>{c.text}</h3>{c.origin==='inferred'&&<p className="fs-inferred">Inferred · unconfirmed. Not directly stated by an expert. {c.inference_question}</p>}
    <p>{c.positions.filter(d=>d.count).map(d=>`${d.count} ${d.label.toLowerCase()}`).join(' · ')}</p>
    <p className="fs-note">Confidence: {c.confidence.filter(d=>d.count).map(d=>`${d.count} ${d.label.toLowerCase()}`).join(' · ')}</p>
    <p className="fs-note">{c.changes} of {c.matched} matched returning experts changed their exact position.</p>
    <details><summary>Expert responses and changes</summary><div className="fs-records">{c.final_responses.map(r=><section key={r.response_id}><h4>{r.expert} · {r.position || 'Not answered'}</h4><p>Confidence: {r.confidence || 'Not recorded'}</p>{r.before&&<p className="fs-note">Round 2: {r.before.position || 'Not answered'} · confidence: {r.before.confidence || 'Not recorded'}. {r.position_changed?'Position revised.':'Position retained.'}{r.confidence_changed?' Confidence revised.':''}</p>}<blockquote>{r.justification || 'No final justification supplied.'}</blockquote>{r.original_answers&&<details><summary>Original submitted fields</summary><pre className="rf-original-answer">{JSON.stringify(r.original_answers,null,2)}</pre></details>}{r.before?.justification&&<details><summary>Round 2 justification</summary><blockquote>{r.before.justification}</blockquote></details>}</section>)}<details><summary>All Round 2 responses, including experts who did not return</summary>{c.round_two.map(r=><section key={r.response_id}><h4>{r.expert} · {r.position || 'Not answered'}</h4><p>Confidence: {r.confidence || 'Not recorded'}</p><blockquote>{r.justification || 'No justification supplied.'}</blockquote></section>)}</details></div></details>
   </article>)}</div>
   {!!account.unrated_claims?.length&&<details><summary>Opening claims not reviewed by the panel</summary>{account.unrated_claims.map(c=><p key={c.id}>{c.text} · {c.origin==='inferred'?'Inferred · unconfirmed · ':''}Not rated; no final position can be inferred.</p>)}</details>}
   {account.reasoning_graph?<details className="fs-graph"><summary>Reasoning graph and original sources</summary><div ref={graph}/></details>:<p className="fs-note">No opening reasoning graph was saved. This account does not invent one.</p>}
  </>}
 </section>;
}
