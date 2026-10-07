import {finalNarrative,finalPositionCounts,type NarrativeClaim} from './finalNarrative';

export const normalizeConsensusThreshold=(value:number)=>Number.isFinite(value)?Math.min(100,Math.max(60,Math.round(value))):60;
export const finalPercent=(count:number,total:number)=>total?`${Math.round(count*1000/total)/10}%`:'—';
/** This is a display rule over recorded positions, never a change to the study protocol or votes. */
export function groupFinalClaims<T extends NarrativeClaim>(claims:T[],threshold=60){
 const limit=normalizeConsensusThreshold(threshold);
 const consensus:T[]=[],disagreement:T[]=[];
 for(const claim of claims){
  const {agree,disagree,total}=finalPositionCounts(claim);
  (total>0&&Math.max(agree,disagree)*100>=limit*total?consensus:disagreement).push(claim);
 }
 return [{id:'consensus',label:'Consensus',claims:consensus},{id:'disagreement',label:'Disagreement',claims:disagreement}] as const;
}
export function groupedFinalMarkdown(title:string,claims:NarrativeClaim[],threshold:number,view:'text'|'table',questions:string[]=[],sections?:{id:string;paragraphs:{text:string;claim_ids:string[]}[]}[]){
 const limit=normalizeConsensusThreshold(threshold);
 const lines=[`# ${title}`,...questions.map(q=>`\n${q}`),`\nConsensus threshold: ${limit}% agreeing or disagreeing, out of all recorded final positions. Unable to judge and missing ratings count in the denominator. This is a display grouping, not a study finding. Inferred claims remain unconfirmed.\n`];
 const escapeCell=(value:string)=>value.replace(/\|/g,'\\|').replace(/\r?\n/g,' ');
 for(const group of groupFinalClaims(claims,limit)){
  lines.push(`## ${group.label}\n`);
  if(!group.claims.length){lines.push(group.id==='consensus'?'No claims meet this threshold.':'All reviewed claims meet this threshold.');continue;}
  if(view==='text')lines.push(...(sections?sections.find(s=>s.id===group.id)?.paragraphs.map(p=>p.text)||[]:finalNarrative(group.claims,limit)));
  else{
   lines.push('| Claim | Agree | Disagree | Unable to judge | Not recorded | Other positions |','| --- | --- | --- | --- | --- | --- |');
   for(const claim of group.claims){const counts=finalPositionCounts(claim);lines.push(`| ${escapeCell(claim.text)}${claim.origin==='inferred'?' (Inferred · unconfirmed)':''} | ${finalPercent(counts.agree,counts.total)} | ${finalPercent(counts.disagree,counts.total)} | ${finalPercent(counts.unsure,counts.total)} | ${finalPercent(counts.missing,counts.total)} | ${finalPercent(counts.other,counts.total)} |`);}
  }
  lines.push('');
 }
 return lines.join('\n\n');
}
