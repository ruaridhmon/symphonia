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
  const [people,setPeople]=R.useState<Set<number>>(new Set());
  const [expanded,setExpanded]=R.useState<Set<number>>(new Set());
  const [searching,setSearching]=R.useState(false);const [query,setQuery]=R.useState('');const [active,setActive]=R.useState<number|null>(null);const [managing,setManaging]=R.useState(false);
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
  const button=(text:string,onClick:()=>void,props:Record<string,unknown>={})=>h('button',{type:'button',onClick,...props},(props.children as React.ReactNode)??text);
  const badge=(rating?:string)=>rating?h('span',{className:`rp-rating ${/^(strongly )?disagree$/i.test(rating)?'rp-disagree':/^(strongly )?agree$/i.test(rating)?'rp-agree':'rp-neutral'}`},rating):null;
  const blocks=(section:any)=>section?h('div',{className:'rp-answer'},badge(section.rating),...section.blocks.map((b:any,i:number)=>h('div',{key:i},b.label?h('span',{className:'rp-block-label'},b.label):null,h('p',null,b.text)))):h('span',{className:'rp-missing'},'Not answered');
  const editor=(row:typeof rows[number])=>active===row.response.id?h('div',{className:'rp-edit'},button('Close editor',()=>{if(allowLeave())setActive(null);}),h(Editor,{response:row.response,questions:row.questions,roundNumber:row.round.round_number,token:p.token,onUpdated:(response:any)=>{p.onResponseUpdated(row.round.id,response);setActive(null);}})):null;
  const visible=filtered;
  return h('section',{className:'response-workspace response-panel','aria-label':'Expert responses',ref:container},
    h('h2',{className:'sr-only'},'Panel responses'),
    h('div',{className:'rp-controls'},h('span',{className:query||p.initialRoundId===undefined?'rp-count':'rp-count sr-only','aria-live':'polite'},`${visible.length} response${visible.length===1?'':'s'}${query?' found':''}`),(searching||query)?h('label',{className:'rp-search'},h('span',{className:'sr-only'},'Search responses'),h('input',{type:'search',value:query,placeholder:'Search the panel…',onChange:(e:React.ChangeEvent<HTMLInputElement>)=>{if(allowLeave())setQuery(e.target.value);}})):button('Search',()=>setSearching(true),{'aria-label':'Search responses',className:'rp-search-trigger'}),p.initialRoundId===undefined?h('label',null,h('span',{className:'sr-only'},'Round'),h('select',{'aria-label':'Round',value:roundId,onChange:(e:React.ChangeEvent<HTMLSelectElement>)=>{if(allowLeave()){setRoundId(e.target.value==='all'?'all':Number(e.target.value));setActive(null);}}},h('option',{value:'all'},'All rounds'),...p.structuredRounds.map(r=>h('option',{key:r.id,value:r.id},`Round ${r.round_number}`)))):null,canManage?button(managing?'Done':'•••',()=>{if(allowLeave()){setManaging(!managing);setSelected(new Set());setActive(null);}},{disabled:busy,'aria-pressed':managing,'aria-label':managing?'Done managing responses':'Manage responses',title:'Manage responses'}):null),
    managing?h('div',{className:'rw-management'},button('Select visible',()=>setSelected(new Set(visible.map(r=>r.response.id))),{disabled:busy}),button('Clear selection',()=>setSelected(new Set()),{disabled:busy||!selected.size}),h('span',null,`${selectedRows.length} selected`),button(busy?'Deleting…':'Delete selected',deleteSelected,{disabled:busy||!selectedRows.length,className:'rw-delete'}),h('div',null,...visible.map(row=>h('label',{key:row.response.id},h('input',{type:'checkbox','aria-label':`Select ${row.name}, round ${row.round.round_number}`,checked:selected.has(row.response.id),disabled:busy,onChange:()=>toggle(row.response.id)}),row.name,` · R${row.round.round_number}`)))):null,
    error?h('p',{role:'alert',className:'rw-error'},error):null,
    h('div',{className:'rp-answer-list'},...visible.map(row=>{
      // Identity and question wording must match exactly; never infer a rating from opening prose.
      const earlier=row.response.email?rows.filter(previous=>previous.response.email===row.response.email&&previous.round.round_number<row.round.round_number).sort((a,b)=>b.round.round_number-a.round.round_number):[];
      const history=earlier.filter(previous=>previous.sections.some(section=>row.sections.some(current=>current.title===section.title))||previous.round.round_number===1);
      const isExpanded=expanded.has(row.response.id);
      const personOpen=people.has(row.response.id);
      const heading=h(R.Fragment,null,h('strong',null,row.name),roundId==='all'?h('span',{className:'rp-round-label'},`Round ${row.round.round_number}`):null,h('span',{className:'rp-person-chevron','aria-hidden':true},personOpen?'−':'+'));
      return h('article',{key:row.response.id,className:'rp-person-answer rp-unified-answer'},
        button('',()=>{if(active===row.response.id&&!allowLeave())return;setActive(null);setPeople(previous=>{const next=new Set(previous);personOpen?next.delete(row.response.id):next.add(row.response.id);return next;});},{className:'rp-answer-heading','aria-label':`Responses from ${row.name}`,'aria-expanded':personOpen,'aria-controls':`person-answers-${row.response.id}`,children:heading}),
        personOpen?h('div',{id:`person-answers-${row.response.id}`,className:'rp-person-content'},
        h('div',{className:'rp-person-answers'},...row.sections.map((section,index)=>{
          const previous=earlier.flatMap(past=>past.sections.filter(pastSection=>pastSection.title===section.title)).find(pastSection=>pastSection.rating);
          const changed=!!previous?.rating&&!!section.rating&&previous.rating!==section.rating;
          return h('section',{key:index,className:'rp-question-answer'},
            h('div',{className:'rp-question-heading'},h('h3',null,section.title),changed?h('span',{className:'rp-rating-change','aria-label':`${previous!.rating} to ${section.rating}`},badge(previous!.rating),h('span',{'aria-hidden':true},' → '),badge(section.rating)):badge(section.rating)),
            h('div',{className:'rp-answer'},...section.blocks.map((block,i)=>h('div',{key:i},block.label&&block.label!=='Reasoning'?h('span',{className:'rp-block-label'},block.label):null,h('p',null,block.text)))));
        })),
        history.length?button(isExpanded?'Hide earlier answers':'Earlier answers',()=>setExpanded(previous=>{const next=new Set(previous);isExpanded?next.delete(row.response.id):next.add(row.response.id);return next;}),{className:'rp-history-toggle','aria-label':`Earlier answers from ${row.name}`,'aria-expanded':isExpanded}):null,
        isExpanded?h('div',{className:'rp-inline-history',id:`answer-history-${row.response.id}`},...history.slice().reverse().map(previous=>{
          const exact=previous.sections.filter(section=>row.sections.some(current=>current.title===section.title));
          const context=!exact.length;
          return h('section',{key:previous.response.id},h('h4',null,`Round ${previous.round.round_number}${context?' · Opening context':''}`),...(context?previous.sections:exact).map((past,index)=>h('div',{key:index},h('p',{className:'rp-history-question'},past.title),blocks(past))));
        })):null,
        managing?button('Edit response',()=>open(row.response.id)):null,editor(row)):null);
    })),
    !visible.length?h('p',{className:'rw-empty'},rows.length?'No responses match these filters.':'Invite your panel to begin. Their responses will appear here as they submit.'):null
  );
 };
}
