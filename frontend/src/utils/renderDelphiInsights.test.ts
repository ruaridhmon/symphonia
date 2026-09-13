import {afterEach, expect, it} from 'vitest';
import {renderDelphiInsights} from './renderDelphiInsights';
import {unifyClaims} from './unifiedClaims';
import type {Round, RoundWithResponses} from '../types/summary';

afterEach(()=>{document.body.innerHTML='';});
const questions=[{questionId:'claim_1',sectionTitle:'Exact claim',label:'Your response',inputType:'single_select',options:['Agree','Disagree','Unsure']}];
const round:Round={id:3,round_number:3,is_active:false,synthesis:'',questions,response_count:4};
function responses(positions:string[]):RoundWithResponses[]{return [{...round,responses:positions.map((position,id)=>({id,round_id:3,email:null,timestamp:'',version:1,answers:{q1:{position}}}))}];}

it('keeps unsure votes in the bar denominator and reports missing answers separately',()=>{
 const root=document.createElement('section');document.body.append(root);
 renderDelphiInsights(root,round,[round],responses(['Agree','Disagree','Unsure','']));
 expect(root.querySelector('.di-score')!.textContent).toBe('33%agree');
 const widths=Array.from(root.querySelectorAll<HTMLElement>('.di-bar>span')).map(s=>parseFloat(s.style.width));
 expect(widths).toHaveLength(3);expect(widths.reduce((a,b)=>a+b,0)).toBeCloseTo(100);
 expect(root.querySelector('.di-legend')!.textContent).toContain('1 not answered');
 renderDelphiInsights(root,round,[round],responses(['']));
 expect(root.querySelector('.di-score')!.textContent).toBe('—No ratings');
 expect(root.querySelector('.di-bar')!.children).toHaveLength(0);
});

it('preserves open excerpts across result refreshes without counting them as ratings',()=>{
 document.body.innerHTML='<main><section id="delphi-recorded-progress"></section><section class="card"><div class="claim-evidence-preview"><article class="claim-evidence-claim"><div class="claim-evidence-claim-heading"><strong>Exact claim</strong></div><details class="claim-evidence-group"><summary><span>Supporting original excerpts</span><span class="claim-evidence-count">17</span></summary><blockquote>Exact original words.</blockquote></details></article></div></section></main>';
 const main=document.querySelector('main')!;const root=document.querySelector<HTMLElement>('#delphi-recorded-progress')!;
 const render=()=>{renderDelphiInsights(root,round,[round],responses(['Agree','Disagree']));unifyClaims(main);};
 render();root.querySelector<HTMLDetailsElement>('.unified-excerpts details')!.open=true;render();
 expect(root.querySelector<HTMLDetailsElement>('.unified-excerpts details')!.open).toBe(true);
 expect(root.querySelector('.di-score')!.textContent).toBe('50%agree');
 expect(root.querySelector('.di-legend')!.textContent).toBe('1 agree1 disagree');
 expect(root.querySelector('.unified-excerpts blockquote')!.textContent).toBe('Exact original words.');
 expect(root.querySelectorAll('h3')).toHaveLength(1);
 expect(root.querySelector('.unified-excerpts summary')!.textContent).toBe('Supporting excerpts17');
});
