import type * as React from 'react';
import type { Form, Round, RoundWithResponses } from '../types/summary';
import type { FinalSynthesisProps } from '../components/summary/FinalSynthesisPanel';
import type { ManualResponseProps } from '../components/summary/ManualResponseSheet';

type View = 'synthesis' | 'responses' | 'analysis';
export interface WorkspaceProps {
  form: Form;
  isDemo?: boolean;
  rounds: Round[];
  responses?: RoundWithResponses[];
  selectedRoundId: number | null;
  view: View;
  onView: (view: View) => void;
  onRound: (round: Round) => void;
  onMakeLive?: (round: Round) => void;
  makingLiveId?: number | null;
  onDownload?: () => void;
  onPrepareNextRound?: () => void;
  onResponseAdded?: () => void | Promise<void>;
}

export function questionOutline(questions: Round['questions']) {
  const groups: {title:string; fields:{label:string;options:string[];optional:boolean}[]}[]=[];
  for(const [index,q] of questions.entries()) {
    const config=typeof q==='string'?{}:q;
    const label=typeof q==='string'?q:String(q.label||q.question||q.text||`Question ${index+1}`);
    const section=String(config.sectionTitle||'');
    let group=section&&groups.at(-1)?.title===section?groups.at(-1):undefined;
    if(!group){group={title:section||label,fields:[]};groups.push(group);}
    group.fields.push({label:section?label:'',options:Array.isArray(config.options)?config.options.map(String):[],optional:config.optional===true});
  }
  const scales=[...new Set(groups.flatMap(group=>group.fields.filter(field=>field.options.length).map(field=>JSON.stringify(field.options))))];
  const sharedFields=groups.length>1&&groups.every(group=>JSON.stringify(group.fields)===JSON.stringify(groups[0].fields))?groups[0].fields:null;
  return {groups,sharedFields,sharedScale:scales.length===1?JSON.parse(scales[0]) as string[]:null};
}

/** Shared by source and the deployed compatibility build. Uses the existing state and callbacks. */
export function createConsultationWorkspace(R: typeof React, ManualResponse?: React.ComponentType<ManualResponseProps>, FinalSynthesis?:React.ComponentType<FinalSynthesisProps>) {
  const h = R.createElement;
  return function ConsultationWorkspace(p: WorkspaceProps) {
    const [panel, setPanel] = R.useState<'invite' | 'questions' | 'next' | null>(null);
    const [finalView,setFinalView] = R.useState(false);
    const opening=p.rounds.find(r=>r.round_number===1);
    const openingQuestions=(opening?.questions?.length ? opening.questions : p.form.questions).map(q=>typeof q==='string'?q:String(q.label||q.question||q.text||'')).filter(q=>q.trim());
    const [completed,setCompleted] = R.useState(false);
    const [copyState, setCopyState] = R.useState('');
    const [adding, setAdding] = R.useState<Round | null>(null);
    const [saved, setSaved] = R.useState('');
    const addTrigger = R.useRef<HTMLButtonElement>(null);
    const dialog = R.useRef<HTMLDialogElement>(null);
    const titleId = R.useId();
    const invoker = R.useRef<HTMLElement|null>(null);
    const options = R.useRef<HTMLDetailsElement>(null);
    const openPanel = (next:'invite'|'questions'|'next') => {invoker.current=options.current?.contains(document.activeElement)?options.current.querySelector('summary') || null:document.activeElement as HTMLElement;if(options.current)options.current.open=false;setCopyState('');setPanel(next);};
    const ordered = [...p.rounds].sort((a, b) => a.round_number - b.round_number);
    const round = ordered.find(r => r.id === p.selectedRoundId) || ordered.find(r => r.is_active) || ordered[0];
    const joinUrl = new URL(`/share/${encodeURIComponent(p.form.join_code)}`, window.location.origin).href;
    const current=ordered.find(r=>r.is_active) || ordered.at(-1);
    const nextRound=ordered.find(r=>r.round_number===(current?.round_number||1)+1);
    const previewRound=panel==='next'?nextRound:round;
    const outline=questionOutline(previewRound?.questions || p.form.questions);
    const stage=current?.round_number||1;
    const savedCustom=nextRound&&!nextRound.questions.some(q=>typeof q==='object'&&typeof q.questionId==='string'&&q.questionId.endsWith('_response'));
    const nextHint=savedCustom?'The next round already has a saved questionnaire. Review its questions before opening it; existing questions are preserved.':stage===1?'Round 2 is prepared from the saved claims, with separate agreement, confidence and optional justification fields. Review the questions before opening it.':stage===2?'Round 3 reuses the Round 2 claims and scales, with recorded positions, confidence and reasons as feedback. Participants can keep or revise their views.':'After reviewing the final responses, open Final synthesis to draft the collective account. There is no fourth participant questionnaire.';
    const [currentTitle,setCurrentTitle]=R.useState(p.form.title);
    R.useEffect(()=>{setCurrentTitle(p.form.title);},[p.form.id,p.form.title]);
    R.useEffect(()=>{const changed=(e:Event)=>{const d=(e as CustomEvent).detail;if(d?.id===p.form.id)setCurrentTitle(d.title);};document.addEventListener('symphonia:consultations-changed',changed);return()=>document.removeEventListener('symphonia:consultations-changed',changed);},[p.form.id]);
    const simulated=/^SIMULATED PANEL\s*[—–-]\s*/i.test(currentTitle);
    const displayTitle=currentTitle.replace(/^SIMULATED PANEL\s*[—–-]\s*/i,'');
    const hint = round?.round_number === 1 ? 'Collect independent views, then draw out the claims.' : round?.round_number === 2 ? 'Review the claims and where the panel agrees or differs.' : 'Review final ratings alongside the reasons behind them.';
    R.useEffect(() => {
      if (panel && dialog.current && !dialog.current.open) dialog.current.showModal();
      if (!panel && dialog.current?.open) dialog.current.close();
    }, [panel]);
    R.useEffect(()=>{const dismiss=(e:PointerEvent)=>{if(options.current?.open&&!options.current.contains(e.target as Node))options.current.open=false;};document.addEventListener('pointerdown',dismiss);return()=>document.removeEventListener('pointerdown',dismiss);},[]);
    R.useEffect(() => { setPanel(null); setCopyState(''); setAdding(null); setSaved('');setFinalView(false);setCompleted(false); }, [p.form.id]);
    const canLeave = () => !document.querySelector('.response-workspace textarea') || window.confirm('Discard unsaved response edits?');
    const button = (text: string, onClick: () => void, props: Record<string, unknown> = {}) => h('button', { type: 'button', onClick, ...props }, (props.children as React.ReactNode) ?? text);
    const copy = async () => {
      try { await navigator.clipboard.writeText(joinUrl); setCopyState('Link copied'); }
      catch { setCopyState('Copy unavailable. Select the link below and copy it.'); }
    };
    return h('section', { className: 'consultation-workspace', 'data-final-view':finalView?'true':undefined, 'data-final-round':ordered.some(r=>r.round_number===3) ? 'true' : undefined, 'aria-label': 'Consultation workspace' },
      h('div', { className: 'cw-title-row' },
        h('div', { className: 'cw-identity' }, h('h2', {title:displayTitle}, displayTitle), (simulated&&!p.isDemo)?h('span', { className: 'cw-provenance',title:'Simulated consultation with fictional experts','aria-label':'Demo with fictional experts' }, 'Demo'):null),
        p.isDemo ? h('span', {className:'cw-demo-badge'}, 'Synthetic example') : h('div', { className: 'cw-title-actions' },
          !finalView && ManualResponse && p.onResponseAdded ? button('Add response',()=>{if(round?.is_active&&!completed&&canLeave()){setSaved('');setAdding(round);}}, {ref:addTrigger,className:'cw-add-response','aria-label':'Add response',disabled:!round?.is_active||completed,title:round?.is_active?'Record a response received outside Symphonia':'Select the current round to add a response',children:[h('svg',{key:'icon',width:16,height:16,viewBox:'0 0 24 24',fill:'none',stroke:'currentColor',strokeWidth:1.7,'aria-hidden':true},h('path',{d:'M12 5v14M5 12h14'})),h('span',{key:'label'},'Add response')]}) : null,
          !finalView && stage<3 ? button('Next round →',()=>{if(!canLeave())return;if(nextRound)openPanel('next');else if(p.onPrepareNextRound)p.onPrepareNextRound();else window.dispatchEvent(new CustomEvent('symphonia:prepare-next-round'));},{className:'cw-next-round','aria-label':`Review Round ${stage+1}`,title:`Preview Round ${stage+1} before opening it`,children:[h('span',{key:'wide',className:'cw-next-wide'},'Next round →'),h('span',{key:'compact',className:'cw-next-compact','aria-hidden':true},'Next →')]} ) : null,
          h('details', { ref:options,className: 'cw-options',onKeyDown:(e:React.KeyboardEvent<HTMLDetailsElement>)=>{if(e.key==='Escape'){e.currentTarget.open=false;e.currentTarget.querySelector('summary')?.focus();}} }, h('summary', { 'aria-label': 'Consultation options' }, '•••'),
            h('div', null, button('Invite people',()=>openPanel('invite')),h('a', { href: `/admin/form/${p.form.id}` }, 'Edit consultation'),button('View questions',()=>openPanel('questions'),{'aria-label':'View questions',disabled:!round}),h('details',{className:'cw-process'},h('summary',null,'How rounds work'),h('p',null,nextHint)),
              p.onDownload ? button('Download', p.onDownload) : null,
              round && !round.is_active && p.onMakeLive ? button(p.makingLiveId === round.id ? 'Updating…' : `Make Round ${round.round_number} current`, () => p.onMakeLive?.(round), { disabled: p.makingLiveId === round.id }) : null)))),
      h('nav', { className: 'cw-views', 'aria-label': 'Consultation views' },
      h('details',{className:'cw-view-menu',onKeyDown:(e:React.KeyboardEvent<HTMLDetailsElement>)=>{if(e.key==='Escape'){e.currentTarget.open=false;e.currentTarget.querySelector('summary')?.focus();}},onBlur:(e:React.FocusEvent<HTMLDetailsElement>)=>{if(!e.currentTarget.contains(e.relatedTarget as Node))e.currentTarget.open=false;}},
        h('summary',{'aria-label':'Change consultation view'},finalView?'Final synthesis':p.view==='responses'?'Responses':'Summary',h('span',{'aria-hidden':true},'⌄')),
        h('div',{className:'cw-view-popover',onClick:(e:React.MouseEvent<HTMLDivElement>)=>{if((e.target as HTMLElement).closest('button')){const menu=e.currentTarget.closest('details');if(menu){menu.open=false;requestAnimationFrame(()=>menu.querySelector('summary')?.focus());}}}},
        ([['synthesis', 'Summary'], ['responses', 'Responses']] as [View, string][]).map(([view, label]) =>
          button(label, () => { if (canLeave()) {setFinalView(false);p.onView(view);if(view==='synthesis')requestAnimationFrame(()=>document.querySelector<HTMLButtonElement>('.cw-summary-slot .summary-switch>button')?.click());} }, { key: view, 'aria-pressed': !finalView && p.view === view })),
      p.view==='synthesis'&&!finalView?h('div',{className:'cw-summary-slot'}):null)),
      h('div', { className: 'cw-context cw-simple-context' },
        h('div',{className:'cw-round-tabs','aria-label':'Rounds'},...ordered.map(r=>button(`Round ${r.round_number}`,()=>{if(canLeave()){setFinalView(false);p.onRound(r);}},{key:r.id,'aria-pressed':!finalView&&round?.id===r.id,title:r.is_active?'Current round':`View Round ${r.round_number}`}))),
        ordered.some(r=>r.round_number===3)&&FinalSynthesis?button('Final synthesis',()=>{if(canLeave()){p.onView('synthesis');setFinalView(true);}}, {'aria-pressed':finalView,className:'cw-final-tab',title:'Round 4 · final synthesis'}):null)),
      !finalView && p.view==='synthesis' && openingQuestions.length ? h('div',{className:'cw-question-context','aria-label':'Consultation question'},
        h('p',null,h('span',{className:'cw-question-label'},'Question'),openingQuestions[0]),
        openingQuestions.length>1 ? h('details',null,h('summary',null,`${openingQuestions.length-1} more question${openingQuestions.length===2?'':'s'}`),h('ol',{start:2},...openingQuestions.slice(1).map((question,index)=>h('li',{key:index},question)))) : null) : null,
      finalView && FinalSynthesis ? h(FinalSynthesis,{formId:p.form.id,questions:openingQuestions,onComplete:()=>setCompleted(true)}) : null,
      !finalView && round?.id!==current?.id ? h('p',{className:'cw-viewing-note','aria-label':'Delphi next step'},`Viewing Round ${round?.round_number} · Round ${stage} is current`) : null,
      saved ? h('p',{className:'cw-response-saved',role:'status'},saved) : null,
      adding && ManualResponse ? h(ManualResponse,{form:p.form,round:adding,onClose:()=>{setAdding(null);requestAnimationFrame(()=>addTrigger.current?.focus());},onSaved:async()=>{await p.onResponseAdded?.();setSaved('Response saved');}}) : null,
      h('dialog', { ref: dialog, className: `cw-dialog ${panel==='next'?'cw-round-review':''}`, 'aria-labelledby': titleId, onCancel: () => setPanel(null), onClose: () => {setPanel(null);requestAnimationFrame(()=>invoker.current?.focus());}, onClick: (event: React.MouseEvent<HTMLDialogElement>) => { if (event.target === event.currentTarget) setPanel(null); } },
        h('div', { className: 'cw-dialog-body' },
          h('header', null, h('h2', { id: titleId }, panel === 'invite' ? 'Invite people' : panel==='next'?`Review Round ${previewRound?.round_number}`:`Round ${previewRound?.round_number} questions`), button('×', () => setPanel(null), { 'aria-label': 'Close dialog', className: 'cw-close' })),
          panel === 'invite' ? h(R.Fragment, null,
            h('p', { className: 'cw-dialog-intro' }, 'Share one link. Each person joins the consultation and responds in their own space.'),
            !p.form.allow_join ? h('p', { role: 'status', className: 'cw-notice' }, 'Joining is currently closed. Review access settings before inviting new participants.') : null,
            h('label', { className: 'cw-link-label' }, 'Invitation link', h('input', { value: joinUrl, readOnly: true, onFocus: (e: React.FocusEvent<HTMLInputElement>) => e.target.select() })),
            h('div', { className: 'cw-invite-actions' }, button(copyState === 'Link copied' ? 'Copied ✓' : 'Copy invite link', () => { void copy(); }, { className: 'cw-primary' }), h('a', { href: joinUrl, target: '_blank', rel: 'noreferrer' }, 'Preview join page ↗')),
            h('p', { className: 'cw-copy-status', role: 'status' }, copyState),
            h('div', { className: 'cw-invite-note' }, h('strong', null, 'One panel, every round'), h('p', null, 'Participants use this link again when the next round opens. Existing sign-in and consent requirements still apply.')),
            h('a', { className: 'cw-settings-link', href: `/admin/form/${p.form.id}` }, 'Manage access and consultation settings →')) :
            h(R.Fragment, null,
              h('p', { className: 'cw-dialog-intro' }, panel==='next'?`${outline.groups.length} ${savedCustom?(outline.groups.length===1?'question group':'question groups'):(outline.groups.length===1?'claim':'claims')} · Review before opening for participants.`:hint),
              panel==='next'?h('details',{className:'cw-round-details'},h('summary',null,'Round details'),h('p',null,nextHint)):null,
              outline.sharedFields?h('section',{className:'cw-common-fields','aria-label':'Response fields for every claim'},h('h3',null,'For each claim'),...outline.sharedFields.map((field,i)=>h('p',{key:i},h('strong',null,field.label),h('span',null,field.optional?'Optional':'Required'),field.options.length?h('small',null,field.options.join(' · ')):null))):null,
              !outline.sharedFields&&outline.sharedScale?h('details',{className:'cw-shared-scale'},h('summary',null,'Rating scale used for every rated claim'),h('p',null,outline.sharedScale.join(' · '))):null,
              h('ol',{className:'cw-questions cw-question-outline'},...outline.groups.map((group,i)=>h('li',{key:i},
                h('h3',null,group.title),
                !outline.sharedFields?h('details',{className:'cw-claim-fields'},h('summary',null,'Response fields'),h('div',{className:'cw-field-outline'},...group.fields.map((field,j)=>h('p',{key:j},
                  field.options.length&&/^your (response|position)$/i.test(field.label)?'Rating':/^explain your position$/i.test(field.label)?'Written explanation':field.label||'Written response',
                  h('span',null,field.optional?' · Optional':' · Required'),
                  !outline.sharedScale&&field.options.length?h('small',null,field.options.join(' · ')):null
                )))):null
              ))),
              panel==='next'&&nextRound&&p.onMakeLive? h('footer',{className:'cw-round-footer'},h('p',null,'Makes this round current. Previous responses are kept.'),h('div',null,button('Cancel',()=>setPanel(null)),button(p.makingLiveId===nextRound.id?'Opening…':`Open Round ${nextRound.round_number}`,()=>{p.onMakeLive?.(nextRound);setPanel(null);},{className:'cw-primary',disabled:p.makingLiveId===nextRound.id}))):null
            ))));
  };
}
