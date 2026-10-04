import {renderReasoningFlow} from '../utils/reasoningFlow';
import '../reasoning-flow.css';
declare const examples:any[];
// Authored fixtures exercise the production renderer. No requests or saved consultations.
const select=document.querySelector('select')!;const root=document.querySelector<HTMLElement>('#preview')!;
examples.forEach((x,i)=>{const o=document.createElement('option');o.value=String(i);o.textContent=x.topic;select.append(o)});
function render(){const x=examples[Number(select.value)];root.replaceChildren();renderReasoningFlow(root,{version:1,status:'authored_example',response_count:1,mapped_response_count:1,rejected_flow_count:0,flows:x.lanes.map(([title,steps]:any,i:number)=>({id:'flow-'+i,title,response_number:1,nodes:steps.map((n:any,j:number)=>({id:String(j),kind:n.kind==='inferred'?'assumption':n.kind,text:n.text,condition:n.condition,question:n.question,quote:n.source===null?undefined:x.sentences[n.source],source_text:x.sentences.join(' ')})),edges:steps.slice(1).map((_:any,j:number)=>({from:String(j),to:String(j+1),relation:'supports'}))}))});}
select.onchange=render;render();
