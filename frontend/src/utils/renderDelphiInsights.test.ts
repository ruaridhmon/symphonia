import {afterEach, expect, it, vi} from 'vitest';
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
 expect(root.querySelector('.di-reasons')).toBeNull();
 expect(root.querySelector('.unified-excerpts summary')!.textContent).toBe('Supporting excerpts17');
 const control=root.querySelector<HTMLButtonElement>('.unified-excerpt-button')!;
 expect(control.getAttribute('aria-expanded')).toBe('true');
 expect(document.getElementById(control.getAttribute('aria-controls')!)).toBe(root.querySelector('.unified-excerpts details'));
 control.click();
 expect(control.getAttribute('aria-expanded')).toBe('false');
 expect(root.querySelector<HTMLDetailsElement>('.unified-excerpts details')!.open).toBe(false);
 control.click();
 expect(control.getAttribute('aria-expanded')).toBe('true');
 expect(root.querySelector('.unified-excerpts blockquote')!.textContent).toBe('Exact original words.');
});
it('shows every claim without filters, repeated round counts or final-round guidance',()=>{
 const root=document.createElement('section');document.body.append(root);root.dataset.filter='Divided';
 renderDelphiInsights(root,{...round,is_active:true},[round],responses(['Agree']));
 expect(root.querySelectorAll('.di-claim')).toHaveLength(1);
 expect(root.querySelector('.di-filters')).toBeNull();expect(root.querySelector('.di-subtitle')).toBeNull();expect(root.querySelector('.di-planner')).toBeNull();expect(root.textContent).not.toContain('How to read these results');
});
it('summarises changes only for comparable rated claims',()=>{
 const root=document.createElement('section');document.body.append(root);
 const previous={...round,id:2,round_number:2};
 const previousResponses={...previous,responses:[{id:9,round_id:2,email:'expert@example.com',timestamp:'',version:1,answers:{q1:{position:'Disagree'}}}]};
 renderDelphiInsights(root,round,[previous,round],[previousResponses,...responses(['Agree'])]);
 expect(root.querySelector('.di-change-overview')?.textContent).toBe('1 claim gained support.');
 renderDelphiInsights(root,round,[round],responses(['Agree']));
 expect(root.querySelector('.di-change-overview')).toBeNull();
});

it('reveals confidence distribution by stance and exposes partial response counts',()=>{
 const root=document.createElement('section');document.body.append(root);
 const current={...round,questions:[...questions,{questionId:'confidence',sectionTitle:'Exact claim',label:'Confidence in your rating',inputType:'single_select',options:['Very confident']}]};
 const data=responses(['Agree','Agree','Disagree']);data[0].responses[0].answers.q2={position:'Very confident'};
 renderDelphiInsights(root,current,[current],data);
 const details=root.querySelector('details.di-confidence') as HTMLDetailsElement;
 expect(details.querySelector('summary')!.textContent).toBe('high confidence (1/2)');
 expect(details.textContent).toContain('1 of 2 answered');expect(details.querySelector('[aria-label="Very confident: 1"]')).not.toBeNull();
 const dialog=details.querySelector('dialog')!;dialog.showModal=vi.fn(()=>dialog.setAttribute('open',''));dialog.close=vi.fn(()=>dialog.removeAttribute('open'));
 details.querySelector('summary')!.click();expect(dialog.showModal).toHaveBeenCalled();expect(details.open).toBe(true);
 (dialog.querySelector('button') as HTMLButtonElement).click();expect(dialog.close).toHaveBeenCalled();expect(details.open).toBe(false);
 expect(root.querySelector('.di-score')!.textContent).toBe('67%agree');
});

it('keeps inferred origin outside legacy hidden metadata',()=>{
 const root=document.createElement('section');const inferred={...round,questions:[{...questions[0],claimOrigin:'inferred'}]};
 renderDelphiInsights(root,inferred,[inferred],responses(['Agree']));
 const badge=root.querySelector('.di-inferred-origin');expect(badge?.textContent).toContain('Inferred assumption · unconfirmed');expect(badge?.classList.contains('di-eyebrow')).toBe(false);
});

it('counts supplied supporting information and opens it in a dismissible modal',()=>{
 const root=document.createElement('section');document.body.append(root);
 const current={...round,questions:[...questions,{questionId:'reason',sectionTitle:'Exact claim',label:'Explain your position',inputType:'textarea'}]};
 const data=responses(['Agree','Disagree','Agree']);data[0].responses[0].answers.q2={position:'Evidence from my research.'};data[0].responses[1].answers.q2={position:'  '};
 renderDelphiInsights(root,current,[current],data);
 const trigger=root.querySelector<HTMLButtonElement>('.di-supporting-trigger')!;expect(trigger.textContent).toBe('Supporting information · 1');expect(root.querySelector('details.di-reasons')).toBeNull();
 const dialog=root.querySelector<HTMLDialogElement>('.di-supporting-dialog')!;dialog.showModal=vi.fn(()=>dialog.open=true);dialog.close=vi.fn(()=>dialog.open=false);
 trigger.click();expect(dialog.open).toBe(true);expect(dialog.textContent).toContain('Evidence from my research.');expect(dialog.querySelectorAll('blockquote')).toHaveLength(1);
 (dialog.querySelector('button') as HTMLButtonElement).click();expect(dialog.open).toBe(false);expect(document.activeElement).toBe(trigger);
 renderDelphiInsights(root,current,[current],responses(['Agree']));expect(root.querySelector('.di-supporting-trigger')?.textContent).toBe('Supporting information · 0');
});

it('keeps position lengths equal while individual confidence changes thickness',()=>{
 const root=document.createElement('section');const current={...round,questions:[...questions,{questionId:'confidence',sectionTitle:'Exact claim',label:'Confidence in your rating',inputType:'single_select',options:['Very confident']}]};
 const data=responses(['Agree','Agree','Disagree']);data[0].responses[0].answers.q2={position:'Slightly confident'};data[0].responses[1].answers.q2={position:'Extremely confident'};
 renderDelphiInsights(root,current,[current],data);const parts=[...root.querySelectorAll<HTMLElement>('.di-bar>span')];
 expect(parts.map(p=>parseFloat(p.style.width))).toEqual([100/3,100/3,100/3]);expect(parts.map(p=>p.style.height)).toEqual(['4px','10px','2px']);expect(parts[2].dataset.confidence).toBe('missing');expect(root.querySelector('.di-score')?.textContent).toBe('67%agree');
});
