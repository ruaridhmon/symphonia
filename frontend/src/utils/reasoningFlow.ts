import {focusClaim} from './focusClaim';
import type { ReasoningGraph, ReasoningNode } from '../types/synthesis';
const el=(tag:string,text='',cls='')=>{const e=document.createElement(tag);e.textContent=text;e.className=cls;return e;};
const observers=new WeakMap<HTMLElement,ResizeObserver>();
export function clearReasoningFlow(root:HTMLElement){observers.get(root)?.disconnect();observers.delete(root);}
/** Read-only source maps. Inferred claims remain visibly unconfirmed even when rated. */
export function renderReasoningFlow(root:HTMLElement, graph:ReasoningGraph, selectedNode?:string){
 clearReasoningFlow(root);
 const shared: ReasoningGraph["flows"] = graph.claims?.length ? [{id:"shared-claims",title:"Shared claim map",response_number:0,nodes:graph.claims.map(c=>({id:c.id,text:c.text,kind:c.origin==="inferred"?"assumption":"premise",question:c.question,sources:c.sources})),edges:graph.claim_edges || []}] : [];
 const flows=[...shared,...graph.flows];const remembered=root.dataset.reasoningFlow;
 const section=el('section','','rf-workspace');section.setAttribute('aria-label','First-round reasoning');
 if(graph.rejected_flow_count)section.append(el('p',`${graph.rejected_flow_count} source maps could not be validated.`, 'rf-coverage'));
 if(!flows.length){section.append(el('p','No source-linked reasoning maps were saved for this draft. Open Claims & full summary to review the claim list.'));root.append(section);return;}
 const nav=el('nav','','rf-tabs');nav.setAttribute('aria-label','Expert reasoning flows');section.append(nav);
 const canvas=el('div','','rf-canvas');const detail=document.createElement('dialog');detail.className='rf-detail di-supporting-dialog';detail.setAttribute('aria-label','Supporting information');detail.setAttribute('aria-live','polite');section.append(canvas,detail);
 const show=(index:number)=>{
  picker.value=String(index);const flow=flows[index];root.dataset.reasoningFlow=flow.id;canvas.replaceChildren();detail.replaceChildren();
  nav.querySelectorAll('button').forEach((b,i)=>b.setAttribute('aria-pressed',String(i===index)));
  const title=el('div','','rf-flow-title');if(flow.response_number){title.append(el('h3',flow.title));canvas.append(title);}
  const diagram=el('div','','rf-diagram');canvas.append(diagram);
  const labels=new Map(flow.nodes.map((n,i)=>[n.id,flow.response_number?`${flow.response_number}.${i+1}`:String(i+1).padStart(2,'0')]));
  const select=(n:ReasoningNode,open=true,invoker?:HTMLButtonElement)=>{
   root.dataset.reasoningNode=n.id;diagram.querySelectorAll<HTMLButtonElement>('[data-rf-node]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.rfNode===n.id)));detail.replaceChildren();detail.classList.toggle('rf-inferred-detail',n.kind==='assumption');detail.hidden=!open;
   const top=el('div','','rf-detail-heading');const title=el('div');title.append(el('h4','Supporting information','di-supporting-title'));top.append(title);const close=document.createElement('button');close.type='button';close.textContent='×';close.setAttribute('aria-label','Close supporting information');close.onclick=()=>{detail.close();detail.hidden=true;(invoker||diagram.querySelector<HTMLButtonElement>(`[data-rf-node="${n.id}"]`))?.focus();};top.append(close);detail.append(top);
   if(n.kind==='assumption')detail.append(el('p','Inferred · unconfirmed','di-supporting-origin'),el('p',n.question||'Ask the expert to clarify this connection.','di-supporting-text'));
   else if(n.sources){for(const source of n.sources){const block=el('section','','di-supporting-entry');block.append(el('div',`Response ${source.response_number}`,'di-supporting-person'),el('blockquote',source.source_text||source.quote,'di-supporting-text'));detail.append(block);}}
   else{detail.append(el('blockquote',n.source_text||n.quote||'','di-supporting-text'));if(n.condition)detail.append(el('p','Qualification: '+n.condition,'rf-qualification'));}
   detail.oncancel=e=>{e.preventDefault();close.click();};detail.onclick=e=>{if(e.target===detail){const r=detail.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)close.click();}};
   if(open&&!detail.open)detail.showModal();
  };
  // Stable logical order: every dependency appears before the claim it informs.
  const ordered:ReasoningNode[]=[];const pending=[...flow.nodes];
  while(pending.length){const ready=pending.findIndex(n=>flow.edges.filter(e=>e.to===n.id).every(e=>ordered.some(p=>p.id===e.from)||!flow.nodes.some(p=>p.id===e.from)));if(ready<0){ordered.push(...pending);break;}ordered.push(pending.splice(ready,1)[0]);}
  ordered.forEach((n,i)=>labels.set(n.id,flow.response_number?`${flow.response_number}.${i+1}`:String(i+1).padStart(2,'0')));
  diagram.className='rf-claim-list';diagram.setAttribute('role','list');
  for(const n of ordered){
   const row=el('div','','rf-claim-row');row.setAttribute('role','listitem');
   const b=document.createElement('button');b.type='button';b.className='rf-node rf-list-node';b.dataset.rfNode=n.id;b.setAttribute('aria-pressed','false');
   b.append(el('span',labels.get(n.id)!,'rf-number'),el('strong',n.text));
   if(n.kind==='assumption'){row.classList.add('rf-inferred-row');b.append(el('span','Inferred assumption · unconfirmed','rf-list-origin'));}
   b.title=n.kind==='assumption'?'Inspect inferred assumption':'Read supporting information';
   b.setAttribute('aria-haspopup','dialog');b.onclick=()=>select(n);row.append(b);
   const incoming=flow.edges.filter(e=>e.to===n.id);
   if(incoming.length){const links=el('div','','rf-dependencies');
    for(const edge of incoming){const source=flow.nodes.find(t=>t.id===edge.from);if(!source)continue;
     const link=document.createElement('button');link.type='button';
     const relation={supports:'Supported by',qualifies:'Qualified by',challenges:'Challenged by',motivates:'Motivated by'}[edge.relation];
     link.textContent=`${relation} ${labels.get(source.id)}`;link.setAttribute('aria-label',`${n.text}: ${relation.toLowerCase()} claim ${labels.get(source.id)}. ${source.text}`);
     link.onclick=()=>focusClaim([...diagram.querySelectorAll<HTMLElement>('[data-rf-node]')].find(b=>b.dataset.rfNode===source.id)||null);links.append(link);
    }row.append(links);
   }
   diagram.append(row);
  }
  select(flow.nodes.find(n=>n.id===(selectedNode||root.dataset.reasoningNode))||flow.nodes[0],!!selectedNode);
 };
 const picker=document.createElement('select');picker.className='rf-source-picker';picker.setAttribute('aria-label','Claim sources');
 flows.forEach((flow,i)=>{const option=document.createElement('option');option.value=String(i);option.textContent=flow.response_number?`Response ${flow.response_number} · ${flow.title}`:'Shared claims';picker.append(option);});
 picker.onchange=()=>{selectedNode=undefined;delete root.dataset.reasoningNode;show(Number(picker.value));};nav.append(picker);
 root.append(section);show(selectedNode?0:Math.max(0,flows.findIndex(f=>f.id===remembered)));
}
