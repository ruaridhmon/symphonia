import type { ReasoningGraph, ReasoningNode } from '../types/synthesis';
const el=(tag:string,text='',cls='')=>{const e=document.createElement(tag);e.textContent=text;e.className=cls;return e;};
let wireId=0;
const observers=new WeakMap<HTMLElement,ResizeObserver>();
export function clearReasoningFlow(root:HTMLElement){observers.get(root)?.disconnect();observers.delete(root);}
/** Read-only source maps. Inferred claims remain visibly unconfirmed even when rated. */
export function renderReasoningFlow(root:HTMLElement, graph:ReasoningGraph){
 clearReasoningFlow(root);
 const shared: ReasoningGraph["flows"] = graph.claims?.length ? [{id:"shared-claims",title:"Shared claim map",response_number:0,nodes:graph.claims.map(c=>({id:c.id,text:c.text,kind:c.origin==="inferred"?"assumption":"premise",question:c.question,sources:c.sources})),edges:graph.claim_edges || []}] : [];
 const flows=[...shared,...graph.flows];const remembered=root.dataset.reasoningFlow;
 const section=el('section','','rf-workspace');section.setAttribute('aria-label','First-round reasoning');
 const head=el('header','','rf-header');head.append(el('h2','Claims & reasoning'),el('p','Review the shared claims and their logical connections, then inspect each original contribution. Dashed cards mark inferred steps.'));
 section.append(head);
 const counts=el('div',`${graph.mapped_response_count} of ${graph.response_count} responses represented · ${graph.flows.length} source argument${graph.flows.length===1?'':'s'}${graph.claims?.length?' · '+graph.claims.length+' shared claims':''}`,'rf-coverage');section.append(counts);
 if(graph.rejected_flow_count)counts.append(el('span',` · ${graph.rejected_flow_count} map${graph.rejected_flow_count===1?' was':'s were'} withheld because source or structure checks failed.`));
 section.append(el('p',(graph.status==='provided_interpretation'?'Provided interpretation':graph.status==='authored_example'?'Illustrative interpretation':'AI interpretation')+' · source quotes are matched to saved responses; meaning and connections still need review. Assumptions are unconfirmed.','rf-provenance'));
 if(!flows.length){section.append(el('p','No source-linked reasoning maps were saved for this draft. Open Claims & full summary to review the claim list.'));root.append(section);return;}
 const nav=el('nav','','rf-tabs');nav.setAttribute('aria-label','Expert reasoning flows');section.append(nav);
 const legend=el('div','','rf-legend');for(const [cls,label] of [['premise','Stated premise'],['recommendation','Stated recommendation'],['assumption','Inferred assumption']])legend.append(el('span',label,'rf-key rf-'+cls));section.append(legend);
 const canvas=el('div','','rf-canvas');const detail=el('section','','rf-detail');detail.setAttribute('aria-live','polite');section.append(canvas,detail);
 const caption=el('p','Arrows describe a proposed logical connection, not a sequence in time or proof of causation. Separate expert contributions remain separate. These are selected arguments, not a guarantee that every statement is represented.','rf-caption');section.append(caption);
 const show=(index:number)=>{
  const flow=flows[index];root.dataset.reasoningFlow=flow.id;canvas.replaceChildren();detail.replaceChildren();
  nav.querySelectorAll('button').forEach((b,i)=>b.setAttribute('aria-pressed',String(i===index)));
  const title=el('div','','rf-flow-title');title.append(el('h3',flow.title),el('span',flow.response_number?`Response ${flow.response_number}`:"Explicit and inferred claims"));canvas.append(title);
  const diagram=el('div','','rf-diagram');canvas.append(diagram);
  const labels=new Map(flow.nodes.map((n,i)=>[n.id,String.fromCharCode(65+i)]));
  const select=(n:ReasoningNode)=>{
   root.dataset.reasoningNode=n.id;diagram.querySelectorAll<HTMLButtonElement>('[data-rf-node]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.rfNode===n.id)));detail.replaceChildren();detail.classList.toggle('rf-inferred-detail',n.kind==='assumption');
   detail.append(el('div',n.kind==='assumption'?'INFERRED · UNCONFIRMED':flow.response_number?`SOURCE · RESPONSE ${flow.response_number}`:'EXPLICIT · SOURCE-LINKED CLAIM','rf-eyebrow'),el('h4',n.kind==='assumption'?'A step to check with the expert':'The expert’s words'));
   if(n.kind==='assumption')detail.append(el('p',n.text),el('blockquote',n.question||'Ask the expert to clarify this connection.'),el('p','This bridge is an interpretation, not a direct expert statement. It can be reviewed independently; ratings never change its inferred origin.','rf-small'));
   else if(n.sources){for(const source of n.sources){const block=el('section');block.append(el('h4',`Response ${source.response_number} · ${source.stance} (interpreted)`),el('blockquote',source.quote));const context=document.createElement('details');context.append(el('summary','Original reasoning, evidence and confidence'),el('p',source.source_text));if(source.source_answers){const raw=el('pre',JSON.stringify(source.source_answers,null,2),'rf-original-answer');context.append(raw);}block.append(context);detail.append(block);}}
   else{detail.append(el('blockquote',n.quote||''));if(n.condition)detail.append(el('p','Qualification: '+n.condition,'rf-qualification'));if(n.source_text&&n.source_text!==n.quote){const context=document.createElement('details');context.append(el('summary','Read the source in context'),el('p',n.source_text));detail.append(context);}}
   const links=flow.edges.filter(e=>e.from===n.id||e.to===n.id);
   if(links.length){const list=el('div','','rf-connections');list.append(el('span','Connections · interpretation','rf-small'));for(const edge of links){const other=flow.nodes.find(t=>t.id===(edge.from===n.id?edge.to:edge.from));if(!other)continue;const b=document.createElement('button');b.type='button';b.textContent=`${labels.get(edge.from)} ${edge.relation} ${labels.get(edge.to)} · ${other.text}`;b.onclick=()=>select(other);list.append(b);}detail.append(list);}
  };
  // The API returns a DAG. Level columns retain branching without crossing card content.
  const levels=new Map<string,number>();for(const n of flow.nodes){const incoming=flow.edges.filter(e=>e.to===n.id);levels.set(n.id,incoming.length?Math.max(...incoming.map(e=>(levels.get(e.from)??0)+1)):0);}
  const max=Math.max(...levels.values());diagram.style.setProperty('--rf-columns',String(max+1));
  for(let level=0;level<=max;level++){
   const column=el('div','','rf-column');diagram.append(column);
   for(const n of flow.nodes.filter(n=>levels.get(n.id)===level)){
    const card=el('div','','rf-step');const b=document.createElement('button');b.type='button';b.className='rf-node rf-'+n.kind;b.dataset.rfNode=n.id;b.setAttribute('aria-pressed','false');
    b.append(el('span',`${labels.get(n.id)} / ${n.kind==='assumption'?'INFERRED ASSUMPTION':n.kind==='premise'?'STATED PREMISE':'STATED RECOMMENDATION'}`,'rf-eyebrow'),el('strong',n.text));
    if(n.condition)b.append(el('span',n.condition,'rf-condition'));
    b.append(el('span',n.kind==='assumption'?'Not stated · needs checking':'Inspect source ↗','rf-node-foot'));b.onclick=()=>select(n);card.append(b);
    const outgoing=flow.edges.filter(e=>e.from===n.id);if(outgoing.length){const links=el('div','','rf-arrows');for(const edge of outgoing){const link=document.createElement('button');link.type='button';link.textContent=`${edge.relation} → ${labels.get(edge.to)}`;link.setAttribute('aria-label',`${labels.get(n.id)} ${edge.relation} ${labels.get(edge.to)}. Inspect connected step`);link.onclick=()=>{const target=flow.nodes.find(t=>t.id===edge.to);if(target)select(target)};links.append(link);}card.append(links);}column.append(card);
   }
  }
  const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.classList.add('rf-wires');svg.setAttribute('aria-hidden','true');diagram.prepend(svg);
  const markerId='rf-arrow-'+(++wireId);
  const draw=()=>{
    const box=diagram.getBoundingClientRect();if(!box.width)return;
    svg.setAttribute('width',String(diagram.scrollWidth));svg.setAttribute('height',String(diagram.scrollHeight));svg.replaceChildren();
    const defs=document.createElementNS(svg.namespaceURI,'defs'),marker=document.createElementNS(svg.namespaceURI,'marker'),tip=document.createElementNS(svg.namespaceURI,'path');
    marker.setAttribute('id',markerId);marker.setAttribute('viewBox','0 0 6 6');marker.setAttribute('refX','6');marker.setAttribute('refY','3');marker.setAttribute('markerWidth','5');marker.setAttribute('markerHeight','5');marker.setAttribute('orient','auto');tip.setAttribute('d','M 0 0 L 6 3 L 0 6');tip.setAttribute('fill','#baa9cb');marker.append(tip);defs.append(marker);svg.append(defs);
    const vertical=getComputedStyle(diagram).gridTemplateColumns.split(' ').length===1;
    for(const edge of flow.edges){
      const cards=Array.from(diagram.querySelectorAll<HTMLElement>('[data-rf-node]'));
      const from=cards.find(c=>c.dataset.rfNode===edge.from),to=cards.find(c=>c.dataset.rfNode===edge.to);if(!from||!to)continue;
      const a=from.getBoundingClientRect(),b=to.getBoundingClientRect();
      const x1=(vertical?a.left+a.width/2:a.right)-box.left,y1=(vertical?a.bottom:a.top+a.height/2)-box.top;
      const x2=(vertical?b.left+b.width/2:b.left)-box.left,y2=(vertical?b.top:b.top+b.height/2)-box.top;
      const path=document.createElementNS(svg.namespaceURI,'path');
      path.setAttribute('d',vertical?`M ${x1} ${y1} C ${x1} ${(y1+y2)/2}, ${x2} ${(y1+y2)/2}, ${x2} ${y2}`:`M ${x1} ${y1} C ${(x1+x2)/2} ${y1}, ${(x1+x2)/2} ${y2}, ${x2} ${y2}`);
      path.setAttribute('marker-end',`url(#${markerId})`);path.setAttribute('fill','none');path.setAttribute('stroke',edge.relation==='challenges'?'#bd7883':'#baa9cb');path.setAttribute('stroke-width','1.4');
      if(flow.nodes.some(n=>(n.id===edge.from||n.id===edge.to)&&n.kind==='assumption'))path.setAttribute('stroke-dasharray','4 4');
      svg.append(path);
    }
  };
  observers.get(root)?.disconnect();
  if(typeof ResizeObserver!=='undefined'){const observer=new ResizeObserver(draw);observer.observe(diagram);observers.set(root,observer);}
  requestAnimationFrame(draw);
  select(flow.nodes.find(n=>n.id===root.dataset.reasoningNode)||flow.nodes[0]);
 };
 flows.forEach((flow,i)=>{const b=document.createElement('button');b.type='button';b.append(el('span',flow.response_number?`Response ${flow.response_number}`:'All contributions'),el('strong',flow.title));b.onclick=()=>{delete root.dataset.reasoningNode;show(i)};nav.append(b);});
 root.append(section);show(Math.max(0,flows.findIndex(f=>f.id===remembered)));
}
