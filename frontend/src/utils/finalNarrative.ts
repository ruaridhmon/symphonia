export type NarrativeClaim = {text:string;origin:string;positions:{label:string;count:number}[]};
const sentences=(items:NarrativeClaim[])=>items.map(c=>c.text+(/[.!?]$/.test(c.text)?'':'.')).join(' ');
function stance(c:NarrativeClaim){
 let agree=0,disagree=0,unsure=0,missing=0;
 for(const p of c.positions){const label=p.label.trim().toLowerCase();if(/^(strongly )?agree$/.test(label))agree+=p.count;else if(/^(strongly )?disagree$/.test(label))disagree+=p.count;else if(/unable|unsure|don't know|cannot judge/.test(label))unsure+=p.count;else missing+=p.count;}
 const total=agree+disagree+unsure+missing;
 const kind=total===0?'unrated':agree===total?'agreed':disagree===total?'opposed':agree>total/2?'supported':disagree>total/2?'rejected':agree&&disagree?'divided':'uncertain';
 return {kind,agree,disagree,unsure,missing};
}
/** Organize recorded positions into prose. Claim wording stays verbatim; no policy conclusion is invented. */
export function finalNarrative(claims:NarrativeClaim[]):string[]{
 const paragraphs:string[]=[];
 const explicit=claims.filter(c=>c.origin!=='inferred');
 const shared=explicit.filter(c=>['agreed','supported'].includes(stance(c).kind));
 if(shared.length){
  const unanimous=shared.every(c=>stance(c).kind==='agreed');
  let text=`${unanimous?'All recorded final positions supported this account.':'The panel broadly supported this account.'} ${sentences(shared)}`;
  if(shared.some(c=>stance(c).disagree))text+=' This support was not unanimous; dissent remains in the panel’s final responses.';
  if(shared.some(c=>stance(c).unsure))text+=' Some experts remained unable to judge these claims.';
  if(shared.some(c=>stance(c).missing))text+=' Some final positions were not recorded.';
  paragraphs.push(text);
 }
 const opposed=explicit.filter(c=>['opposed','rejected'].includes(stance(c).kind));
 if(opposed.length){let text=`${opposed.every(c=>stance(c).kind==='opposed')?'All recorded final positions opposed these claims.':'The balance of recorded opinion opposed these claims.'} ${sentences(opposed)}`;if(opposed.some(c=>stance(c).agree))text+=' Some experts continued to support these claims.';if(opposed.some(c=>stance(c).unsure))text+=' Others remained unable to judge.';paragraphs.push(text);}
 const divided=explicit.filter(c=>stance(c).kind==='divided');
 if(divided.length)paragraphs.push(`The panel remained divided on ${divided.length===1?'this claim':'these claims'}. ${sentences(divided)} Both support and opposition remain in the final record${divided.some(c=>stance(c).unsure)?', alongside experts who were unable to judge':''}.`);
 const uncertain=explicit.filter(c=>['uncertain','unrated'].includes(stance(c).kind));
 if(uncertain.length)paragraphs.push(`No clear shared position was established on ${uncertain.length===1?'this claim':'these claims'}. ${sentences(uncertain)} The recorded responses remain uncertain, incomplete or mixed.`);
 const inferred=claims.filter(c=>c.origin==='inferred');
 if(inferred.length){
  let text=`${inferred.length===1?'One step in the reasoning remains an unconfirmed assumption.':'Some steps in the reasoning remain unconfirmed assumptions.'} ${sentences(inferred)} ${inferred.length===1?'This was':'These were'} inferred rather than directly stated by an expert.`;
  const contested=inferred.filter(c=>stance(c).agree&&stance(c).disagree);
  if(contested.length)text+=' Experts disagreed over at least one of these inferred steps.';
  const undecided=inferred.filter(c=>stance(c).unsure||stance(c).missing||stance(c).kind==='unrated');
  if(undecided.length)text+=' Uncertainty about these steps remains in the final record.';
  paragraphs.push(text);
 }
 return paragraphs;
}
