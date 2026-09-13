// Visual regression fixture. Public synthetic responses only; never calls the API.
import data from '../demos/research-ai-results.json';
import { renderDelphiInsights } from '../utils/renderDelphiInsights';
import { unifyClaims } from '../utils/unifiedClaims';
import type { Round, RoundWithResponses } from '../types/summary';
const main=document.querySelector<HTMLElement>('main')!;
const el=(tag:string,text='',cls='')=>{const n=document.createElement(tag);n.textContent=text;n.className=cls;return n;};
const results=el('section');results.id='delphi-recorded-progress';main.append(results);
const source=el('section','','card');const preview=el('div','','claim-evidence-preview');source.append(preview);main.append(source);
data.fixture.claims.forEach((claim,index)=>{
 const article=el('article','','claim-evidence-claim');const title=el('div','','claim-evidence-claim-heading');title.append(el('strong',claim));article.append(title);
 for(const [label,vote] of [['Supporting','Agree'],['Opposing','Disagree'],['Uncertain','Unable']]){
  const experts=data.fixture.experts.filter(e=>e.round3.votes[index].startsWith(vote));if(!experts.length)continue;
  const group=el('details','','claim-evidence-group');const summary=el('summary');summary.append(el('span',`${label} original excerpts`),el('span',String(experts.length),'claim-evidence-count'));group.append(summary);
  const cards=el('div','','claim-evidence-cards');experts.forEach(e=>{const card=el('div','','claim-evidence-card');card.append(el('p',e.role,'claim-evidence-expert'),el('blockquote',e.round3.comments[index],'claim-evidence-quote'));cards.append(card);});group.append(cards);article.append(group);
 }
 preview.append(article);
});
renderDelphiInsights(results,data.rounds[2] as unknown as Round,data.rounds as unknown as Round[],data.responses as unknown as RoundWithResponses[]);
unifyClaims(main);
// Reapply the same presentation adapter after filtering, as the application does.
new MutationObserver(()=>unifyClaims(main)).observe(results,{childList:true,subtree:true});
