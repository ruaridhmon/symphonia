import type * as React from 'react';
import type {Round, RoundWithResponses, StructuredResponse} from '../types/summary';
import {responseSections} from './responseReading';
type Props={structuredRounds:RoundWithResponses[];rounds:Round[];formQuestions:(string|Record<string,unknown>)[];token?:string;initialRoundId?:number;onResponseUpdated:(roundId:number,response:any)=>void;onResponseDeleted?:(roundId:number,responseId:number)=>void};
/** Uses the host's React/editor/API so source and the deployed mirror share one reader. */
export function createResponseWorkspace(R:typeof React,Editor:React.ComponentType<any>,remove?:(id:number)=>Promise<unknown>){
 const h=R.createElement;
 const label=(response:StructuredResponse,index:number)=>(response.email||`Anonymous response ${index+1}`).replace(/^Guest:\s*/,'').replace(/\s*\[[A-Za-z0-9_-]{8}\]$/,'');
 const timestamp=(value:string)=>{const date=new Date(value);return Number.isNaN(date.getTime())?'':date.toLocaleString(undefined,{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'});};
 return function ResponseWorkspace(p:Props){
  const [roundId,setRoundId]=R.useState<number|'all'>(()=>p.initialRoundId??p.rounds.find(r=>r.is_active)?.id??p.structuredRounds.at(-1)?.id??'all');
  const [mode,setMode]=R.useState<'question'|'person'|'changes'>('question'); const [question,setQuestion]=R.useState(''); const [expanded,setExpanded]=R.useState<Set<number>>(new Set());
  const [query,setQuery]=R.useState('');const [active,setActive]=R.useState<number|null>(null);const [managing,setManaging]=R.useState(false);
  const [selected,setSelected]=R.useState<Set<number>>(new Set());const [busy,setBusy]=R.useState(false);const [error,setError]=R.useState('');
  const container=R.useRef<HTMLElement>(null);
  const rows=R.useMemo(()=>p.structuredRounds.flatMap(round=>{
   const embedded=(round as RoundWithResponses & {questions?:Round['questions']}).questions;
   const questions=(embedded?.length?embedded:null)||p.rounds.find(r=>r.id===round.id)?.questions||p.formQuestions;
   return round.responses.map((response,index)=>{const sections=responseSections(questions,response.answers);const name=label(response,index);return {response,round,questions,name,sections,search:JSON.stringify([name,sections]).toLowerCase()};});
  }),[p.structuredRounds,p.rounds,p.formQuestions]);
  const filtered=rows.filter(row=>(roundId==='all'||row.round.id===roundId)&&row.search.includes(query.trim().toLowerCase()));
  R.useEffect(()=>{if(p.initialRoundId!==undefined){setRoundId(p.initialRoundId);setActive(null);}},[p.initialRoundId]);
  R.useEffect(()=>{setSelected(previous=>{const next=new Set([...previous].filter(id=>rows.some(r=>r.response.id===id)));return next.size===previous.size?previous:next;});},[rows]);
  const allowLeave=()=>!container.current?.querySelector('textarea')||window.confirm('Discard unsaved response edits?');
  const open=(id:number)=>{if(allowLeave())setActive(id);};
  const toggle=(id:number)=>setSelected(prev=>{const next=new Set(prev);next.has(id)?next.delete(id):next.add(id);return next;});
  const canManage=!!remove&&!!p.onResponseDeleted;
  const selectedRows=rows.filter(row=>selected.has(row.response.id));
  const deleteSelected=async()=>{
   if(!remove||!p.onResponseDeleted||!selectedRows.length||busy)return;
   if(!window.confirm(`Delete ${selectedRows.length} selected response${selectedRows.length===1?'':'s'}? This removes them from summaries and exports.`))return;
   setBusy(true);setError('');
   try{for(const row of selectedRows){await remove(row.response.id);p.onResponseDeleted(row.round.id,row.response.id);setSelected(prev=>{const next=new Set(prev);next.delete(row.response.id);return next;});}}
   catch(e){setError(e instanceof Error?e.message:'Could not delete the selected responses.');}finally{setBusy(false);}
  };
  const button=(text:string,onClick:()=>void,props:Record<string,unknown>={})=>h('button',{type:'button',onClick,...props},text);
  const titles=[...new Set((mode==='changes'?rows:filtered).flatMap(row=>row.sections.map(s=>s.title)))];
  const chosen=titles.includes(question)?question:titles[0];
  const badge=(rating?:string)=>rating?h('span',{className:`rp-rating ${/^(strongly )?disagree$/i.test(rating)?'rp-disagree':/^(strongly )?agree$/i.test(rating)?'rp-agree':'rp-neutral'}`},rating):null;
  const blocks=(section:any)=>section?h('div',{className:'rp-answer'},badge(section.rating),...section.blocks.map((b:any,i:number)=>h('div',{key:i},b.label?h('span',{className:'rp-block-label'},b.label):null,h('p',null,b.text)))):h('span',{className:'rp-missing'},'Not answered');
  const editor=(row:typeof rows[number])=>active===row.response.id?h('div',{className:'rp-edit'},button('Close editor',()=>{if(allowLeave())setActive(null);}),h(Editor,{response:row.response,questions:row.questions,roundNumber:row.round.round_number,token:p.token,onUpdated:(response:any)=>{p.onResponseUpdated(row.round.id,response);setActive(null);}})):null;
  const identity=(row:typeof rows[number])=>h('header',{className:'rp-person-heading'},h('strong',{title:row.response.email||undefined},row.name),h('span',null,`Round ${row.round.round_number}`),managing?button('Edit response',()=>open(row.response.id)):null);
  const changeRows=rows.filter(row=>row.search.includes(query.trim().toLowerCase())&&row.sections.some(s=>s.title===chosen));
  // Match identities exactly, never merge anonymous records or infer equivalent claim wording.
  const identities=[...new Set(changeRows.map(row=>row.response.email||`anonymous-${row.response.id}`))];
  return h('section',{className:'response-workspace response-panel','aria-label':'Expert responses',ref:container},
    h('h2',{className:'sr-only'},'Panel responses'),
    h('div',{className:'rp-controls'},h('nav',{'aria-label':'Response layout'},...([['question','By question'],['person','By person'],['changes','Across rounds']] as const).map(([value,text])=>button(text,()=>{if(allowLeave()){setQuestion(chosen);setMode(value);setActive(null);}},{key:value,'aria-pressed':mode===value}))),h('label',{className:'rp-search'},h('span',{className:'sr-only'},'Search responses'),h('input',{type:'search',value:query,placeholder:'Search the panel…',onChange:(e:React.ChangeEvent<HTMLInputElement>)=>{if(allowLeave())setQuery(e.target.value);}})),mode!=='changes'?h('label',null,h('span',{className:'sr-only'},'Round'),h('select',{'aria-label':'Round',value:roundId,onChange:(e:React.ChangeEvent<HTMLSelectElement>)=>{if(allowLeave()){setRoundId(e.target.value==='all'?'all':Number(e.target.value));setActive(null);}}},h('option',{value:'all'},'All rounds'),...p.structuredRounds.map(r=>h('option',{key:r.id,value:r.id},`Round ${r.round_number}`)))):null,canManage?button(managing?'Done':'Manage',()=>{if(allowLeave()){setManaging(!managing);setSelected(new Set());setActive(null);}},{disabled:busy,'aria-pressed':managing}):null),
    managing?h('div',{className:'rw-management'},button('Select visible',()=>setSelected(new Set(filtered.map(r=>r.response.id))),{disabled:busy}),button('Clear selection',()=>setSelected(new Set()),{disabled:busy||!selected.size}),h('span',null,`${selectedRows.length} selected`),button(busy?'Deleting…':'Delete selected',deleteSelected,{disabled:busy||!selectedRows.length,className:'rw-delete'}),h('div',null,...filtered.map(row=>h('label',{key:row.response.id},h('input',{type:'checkbox','aria-label':`Select ${row.name}, round ${row.round.round_number}`,checked:selected.has(row.response.id),disabled:busy,onChange:()=>toggle(row.response.id)}),row.name,` · R${row.round.round_number}`)))):null,
    error?h('p',{role:'alert',className:'rw-error'},error):null,
    mode!=='person'&&titles.length?h('div',{className:'rp-question-bar'},h('label',null,h('span',null,'Question / claim'),h('select',{'aria-label':'Question or claim',value:chosen,onChange:(e:React.ChangeEvent<HTMLSelectElement>)=>{if(allowLeave()){setQuestion(e.target.value);setActive(null);}}},...titles.map(title=>h('option',{key:title,value:title},title)))),h('h3',null,chosen)):null,
    h('p',{className:'rp-count','aria-live':'polite'},mode==='changes'?`${identities.length} participants · compare identical questions across rounds`:`${filtered.length} response${filtered.length===1?'':'s'}${query?' found':''}`),
    mode==='question'?h('div',{className:'rp-answer-list'},...filtered.filter(row=>row.sections.some(s=>s.title===chosen)).map(row=>h('article',{key:row.response.id,className:'rp-person-answer'},identity(row),blocks(row.sections.find(s=>s.title===chosen)),editor(row)))):null,
    mode==='person'?h('div',{className:'rp-person-list'},...filtered.map(row=>h('article',{key:row.response.id,className:'rp-person-answer'},h('button',{type:'button',className:'rp-expand','aria-expanded':expanded.has(row.response.id),onClick:()=>{if(allowLeave())setExpanded(previous=>{const next=new Set(previous);next.has(row.response.id)?next.delete(row.response.id):next.add(row.response.id);return next;});}},h('strong',null,row.name),h('span',null,`Round ${row.round.round_number}`),h('span',{'aria-hidden':true},expanded.has(row.response.id)?'−':'+')),expanded.has(row.response.id)?h('div',null,...row.sections.map((section,i)=>h('section',{key:i,className:'rp-person-section'},h('h4',null,section.title),blocks(section))),managing?button('Edit response',()=>open(row.response.id)):null,editor(row)):h('p',{className:'rp-person-preview'},row.sections[0]?.blocks[0]?.text||row.sections[0]?.rating||'No answer text recorded.')))):null,
    mode==='changes'?h('div',{className:'rp-evolution'},...identities.map(identityKey=>{
      const history=rows.filter(row=>(row.response.email||`anonymous-${row.response.id}`)===identityKey&&row.sections.some(s=>s.title===chosen)).sort((a,b)=>a.round.round_number-b.round.round_number);
      const rated=history.map(row=>row.sections.find(s=>s.title===chosen)?.rating).filter(Boolean); const movement=rated.length>1?(rated.every(value=>value===rated[0])?'Position unchanged':`${rated[0]} → ${rated.at(-1)}`):'One round recorded';
      return h('article',{key:identityKey,className:'rp-person-answer'},h('header',{className:'rp-person-heading'},h('h4',null,history[0].name),h('span',null,movement)),h('div',{className:'rp-timeline'},...history.map(row=>h('section',{key:row.response.id},h('p',{className:'rp-round-label'},`Round ${row.round.round_number}`),blocks(row.sections.find(s=>s.title===chosen))))));
    })):null,
    (mode==='changes'?!identities.length:!filtered.length)?h('p',{className:'rw-empty'},rows.length?'No responses match these filters.':'Invite your panel to begin. Their responses will appear here as they submit.'):null
  );
 };
}
