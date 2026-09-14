import {DraftFixture,GeneratorFixture} from './synthesisControlsFixture';
import * as React from 'react';
import {createRoot} from 'react-dom/client';
import {createResponseWorkspace} from '../utils/responseWorkspace';
import {renderResponseReading} from '../utils/responseReading';
import {enhanceSynthesisControls} from '../utils/synthesisControls';
// Visual regression fixture. Public synthetic responses only; never calls the API.
import data from '../demos/research-ai-results.json';
import { renderDelphiInsights } from '../utils/renderDelphiInsights';
import { unifyClaims } from '../utils/unifiedClaims';
import type { Round, RoundWithResponses } from '../types/summary';
const main=document.querySelector<HTMLElement>('main')!;
const el=(tag:string,text='',cls='')=>{const n=document.createElement(tag);n.textContent=text;n.className=cls;return n;};
const toolbar=el('aside','','space-y-3 xl:sticky xl:top-24 self-start');toolbar.setAttribute('aria-label','Synthesis controls');
toolbar.innerHTML='<details class="summary-disclosure"><summary><span>Generate synthesis</span></summary><div class="card"><label>Synthesis method <select><option>Simple</option><option>Committee</option></select></label><label>Instructions<textarea rows="5" placeholder="Optional instructions"></textarea></label><p>Preview controls only. No synthesis will be generated.</p></div></details><details class="summary-disclosure"><summary><span>Version history</span></summary><div class="card"><h3>Versions</h3><button type="button">Version 3 · Published</button><button type="button">Version 2</button><p>These sample controls demonstrate the same panel behaviour.</p></div></details>';
main.append(toolbar);enhanceSynthesisControls(main);
const controlsPreview=el('section');controlsPreview.hidden=true;main.append(controlsPreview);
const controlsToolbar=el('aside');controlsToolbar.setAttribute('aria-label','Synthesis controls');controlsPreview.append(controlsToolbar);
createRoot(controlsToolbar).render(React.createElement(GeneratorFixture));
const draftPreview=el('div');controlsPreview.append(draftPreview);createRoot(draftPreview).render(React.createElement(DraftFixture));
new MutationObserver(()=>enhanceSynthesisControls(controlsPreview)).observe(controlsToolbar,{childList:true,subtree:true});
const layout=el('div');layout.className='summary-layout-regression';main.append(layout);layout.append(toolbar);const content=el('div');layout.append(content);
const results=el('section');results.id='delphi-recorded-progress';content.append(results);
const source=el('section','','card');const preview=el('div','','claim-evidence-preview');source.append(preview);content.append(source);
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
unifyClaims(main);enhanceSynthesisControls(main);
// Reapply the same presentation adapter after filtering, as the application does.
new MutationObserver(()=>{unifyClaims(main);enhanceSynthesisControls(main);}).observe(results,{childList:true,subtree:true});

const responsePreview=el('div');responsePreview.hidden=true;main.append(responsePreview);
const PreviewEditor=({questions,response}:any)=>renderResponseReading(React.createElement,questions,response.answers);
const Workspace=createResponseWorkspace(React,PreviewEditor);
createRoot(responsePreview).render(React.createElement(Workspace,{structuredRounds:data.responses as unknown as RoundWithResponses[],rounds:data.rounds as unknown as Round[],formQuestions:[],initialRoundId:data.rounds[2].id,onResponseUpdated:()=>{}}));
const switcher=document.querySelector<HTMLSelectElement>('[aria-label="Preview surface"]');
if(switcher){switcher.append(new Option('Synthesis controls','synthesis'));switcher.onchange=()=>{const view=switcher.value;responsePreview.hidden=view!=='responses';controlsPreview.hidden=view!=='synthesis';results.hidden=view!=='claims';toolbar.hidden=view!=='claims';source.hidden=view!=='claims';};}
