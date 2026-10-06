import {pinnedConsultations,toggleConsultationPin,renameConsultation} from './consultationActions';
import type * as React from 'react';
import {renderReasoningFlow,clearReasoningFlow} from './reasoningFlow';
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
  return {groups,sharedScale:scales.length===1?JSON.parse(scales[0]) as string[]:null};
}

/** Shared by source and the deployed compatibility build. Uses the existing state and callbacks. */
export function createConsultationWorkspace(R: typeof React, ManualResponse?: React.ComponentType<ManualResponseProps>, FinalSynthesis?:React.ComponentType<FinalSynthesisProps>) {
  const h = R.createElement;
  return function ConsultationWorkspace(p: WorkspaceProps) {
    const [panel, setPanel] = R.useState<'invite' | 'questions' | null>(null);
    const [finalView,setFinalView] = R.useState(false);
    const [mapView,setMapView] = R.useState(false);
    const mapRoot=R.useRef<HTMLDivElement>(null);
    const [mapNode,setMapNode]=R.useState<string|undefined>();
    const opening=p.rounds.find(r=>r.round_number===1);
    const graph=opening?.synthesis_json?.narrative===opening?.synthesis?opening?.synthesis_json?.reasoning_graph:null;
    R.useEffect(()=>{const root=mapRoot.current;if(root&&graph&&mapView){root.replaceChildren();renderReasoningFlow(root,graph,mapNode);}return()=>{if(root)clearReasoningFlow(root);};},[graph,mapView,mapNode]);
    R.useEffect(()=>{const open=(event:Event)=>{const id=(event as CustomEvent).detail?.nodeId;if(graph?.claims?.some(c=>c.id===id)){setMapNode(id);setMapView(true);setFinalView(false);p.onView('synthesis');}};document.addEventListener('symphonia:claim-map',open);return()=>document.removeEventListener('symphonia:claim-map',open);},[graph,p.form.id,p.onView]);
    const [completed,setCompleted] = R.useState(false);
    const [copyState, setCopyState] = R.useState('');
    const [adding, setAdding] = R.useState<Round | null>(null);
    const [saved, setSaved] = R.useState('');
    const addTrigger = R.useRef<HTMLButtonElement>(null);
    const dialog = R.useRef<HTMLDialogElement>(null);
    const titleId = R.useId();
    const invoker = R.useRef<HTMLElement|null>(null);
    const options = R.useRef<HTMLDetailsElement>(null);
    const openPanel = (next:'invite'|'questions') => {invoker.current=options.current?.contains(document.activeElement)?options.current.querySelector('summary') || null:document.activeElement as HTMLElement;if(options.current)options.current.open=false;setCopyState('');setPanel(next);};
    const ordered = [...p.rounds].sort((a, b) => a.round_number - b.round_number);
    const round = ordered.find(r => r.id === p.selectedRoundId) || ordered.find(r => r.is_active) || ordered[0];
    const responseGroup = p.responses?.find(r => r.id === round?.id);
    const count = responseGroup ? responseGroup.responses.length : round?.response_count;
    const joinUrl = new URL(`/share/${encodeURIComponent(p.form.join_code)}`, window.location.origin).href;
    const outline=questionOutline(round?.questions || p.form.questions);
    const [currentTitle,setCurrentTitle]=R.useState(p.form.title);
    const [pinned,setPinned]=R.useState(()=>pinnedConsultations().includes(p.form.id));
    R.useEffect(()=>{setCurrentTitle(p.form.title);setPinned(pinnedConsultations().includes(p.form.id));},[p.form.id,p.form.title]);
    R.useEffect(()=>{const changed=(e:Event)=>{const d=(e as CustomEvent).detail;if(d?.id===p.form.id)setCurrentTitle(d.title);setPinned(pinnedConsultations().includes(p.form.id));};document.addEventListener('symphonia:consultations-changed',changed);return()=>document.removeEventListener('symphonia:consultations-changed',changed);},[p.form.id]);
    const simulated=/^SIMULATED PANEL\s*[—–-]\s*/i.test(currentTitle);
    const displayTitle=currentTitle.replace(/^SIMULATED PANEL\s*[—–-]\s*/i,'');
    const hint = round?.round_number === 1 ? 'Collect independent views, then draw out the claims.' : round?.round_number === 2 ? 'Review the claims and where the panel agrees or differs.' : 'Review final ratings alongside the reasons behind them.';
    R.useEffect(() => {
      if (panel && dialog.current && !dialog.current.open) dialog.current.showModal();
      if (!panel && dialog.current?.open) dialog.current.close();
    }, [panel]);
    R.useEffect(()=>{const dismiss=(e:PointerEvent)=>{if(options.current?.open&&!options.current.contains(e.target as Node))options.current.open=false;};document.addEventListener('pointerdown',dismiss);return()=>document.removeEventListener('pointerdown',dismiss);},[]);
    R.useEffect(() => { setPanel(null); setCopyState(''); setAdding(null); setSaved('');setFinalView(false);setMapView(false);setMapNode(undefined);setCompleted(false); }, [p.form.id]);
    const canLeave = () => !document.querySelector('.response-workspace textarea') || window.confirm('Discard unsaved response edits?');
    const button = (text: string, onClick: () => void, props: Record<string, unknown> = {}) => h('button', { type: 'button', onClick, ...props }, (props.children as React.ReactNode) ?? text);
    const copy = async () => {
      try { await navigator.clipboard.writeText(joinUrl); setCopyState('Link copied'); }
      catch { setCopyState('Copy unavailable. Select the link below and copy it.'); }
    };
    return h('section', { className: 'consultation-workspace', 'data-final-view':finalView||mapView?'true':undefined, 'data-final-round':ordered.some(r=>r.round_number===3) ? 'true' : undefined, 'aria-label': 'Consultation workspace' },
      h('div', { className: 'cw-title-row' },
        h('div', { className: 'cw-identity' }, h('h2', {title:displayTitle}, displayTitle), (simulated&&!p.isDemo)?h('span', { className: 'cw-provenance',title:'Simulated consultation with fictional experts','aria-label':'Demo with fictional experts' }, 'Demo'):null),
        p.isDemo ? h('span', {className:'cw-demo-badge'}, 'Synthetic example') : h('div', { className: 'cw-title-actions' },
          !finalView && ManualResponse && p.onResponseAdded ? button('Add response',()=>{if(round?.is_active&&!completed&&canLeave()){setSaved('');setAdding(round);}}, {ref:addTrigger,className:'cw-add-response','aria-label':'Add response',disabled:!round?.is_active||completed,title:round?.is_active?'Record a response received outside Symphonia':'Select the current round to add a response',children:[h('svg',{key:'icon',width:16,height:16,viewBox:'0 0 24 24',fill:'none',stroke:'currentColor',strokeWidth:1.7,'aria-hidden':true},h('path',{d:'M12 5v14M5 12h14'})),h('span',{key:'label'},'Add response')]}) : null,
          h('details', { ref:options,className: 'cw-options',onKeyDown:(e:React.KeyboardEvent<HTMLDetailsElement>)=>{if(e.key==='Escape'){e.currentTarget.open=false;e.currentTarget.querySelector('summary')?.focus();}} }, h('summary', { 'aria-label': 'Consultation options' }, '•••'),
            h('div', null, button('Rename',()=>{if(options.current)options.current.open=false;renameConsultation(p.form.id,currentTitle,options.current?.querySelector('summary'));}),button(pinned?'Unpin':'Pin',()=>{toggleConsultationPin(p.form.id);if(options.current)options.current.open=false;}),button('Invite people',()=>openPanel('invite')),h('a', { href: `/admin/form/${p.form.id}` }, 'Edit consultation'),button('View questions',()=>openPanel('questions'),{'aria-label':'View questions',disabled:!round}),
              p.onDownload ? button('Download', p.onDownload) : null,
              round && !round.is_active && p.onMakeLive ? button(p.makingLiveId === round.id ? 'Updating…' : `Make Round ${round.round_number} current`, () => p.onMakeLive?.(round), { disabled: p.makingLiveId === round.id }) : null)))),
      h('nav', { className: 'cw-views', 'aria-label': 'Consultation views' },
      h('details',{className:'cw-view-menu',onKeyDown:(e:React.KeyboardEvent<HTMLDetailsElement>)=>{if(e.key==='Escape'){e.currentTarget.open=false;e.currentTarget.querySelector('summary')?.focus();}},onBlur:(e:React.FocusEvent<HTMLDetailsElement>)=>{if(!e.currentTarget.contains(e.relatedTarget as Node))e.currentTarget.open=false;}},
        h('summary',{'aria-label':'Change consultation view'},finalView?'Final synthesis':mapView?'Claim map':p.view==='responses'?'Responses':'Summary',h('span',{'aria-hidden':true},'⌄')),
        h('div',{className:'cw-view-popover',onClick:(e:React.MouseEvent<HTMLDivElement>)=>{if((e.target as HTMLElement).closest('button')){const menu=e.currentTarget.closest('details');if(menu){menu.open=false;requestAnimationFrame(()=>menu.querySelector('summary')?.focus());}}}},
        ([['synthesis', 'Summary'], ['responses', 'Responses']] as [View, string][]).map(([view, label]) =>
          button(label, () => { if (canLeave()) {setFinalView(false);setMapView(false);p.onView(view);} }, { key: view, 'aria-pressed': !finalView && !mapView && p.view === view })),
      button('Claim map',()=>{if(canLeave()){p.onView('synthesis');setFinalView(false);setMapNode(undefined);setMapView(true);}}, {'aria-pressed':mapView,className:'cw-map-tab'}),
      p.view==='synthesis'&&!finalView&&!mapView?h('div',{className:'cw-summary-slot'}):null)),
      h('div', { className: 'cw-context cw-simple-context' },
        h('div',{className:'cw-round-tabs','aria-label':'Rounds'},...ordered.map(r=>button(`Round ${r.round_number}`,()=>{if(canLeave()){setFinalView(false);setMapView(false);p.onRound(r);}},{key:r.id,'aria-pressed':!finalView&&!mapView&&round?.id===r.id,title:r.is_active?'Current round':`View Round ${r.round_number}`}))),
        ordered.some(r=>r.round_number===3)&&FinalSynthesis?button('Final synthesis',()=>{if(canLeave()){p.onView('synthesis');setMapView(false);setFinalView(true);}}, {'aria-pressed':finalView,className:'cw-final-tab',title:'Round 4 · final synthesis'}):null)),
      mapView ? h('section',{className:'cw-claim-map','aria-label':'Shared claim map'},graph?h('div',{ref:mapRoot}):h(R.Fragment,null,h('h2',null,'No shared claim map yet'),h('p',null,'Extract the Round 1 contributions to create source-linked explicit claims, inferred assumptions and their connections.'))) : null,
      finalView && FinalSynthesis ? h(FinalSynthesis,{formId:p.form.id,onComplete:()=>setCompleted(true)}) : null,
      saved ? h('p',{className:'cw-response-saved',role:'status'},saved) : null,
      adding && ManualResponse ? h(ManualResponse,{form:p.form,round:adding,onClose:()=>{setAdding(null);requestAnimationFrame(()=>addTrigger.current?.focus());},onSaved:async()=>{await p.onResponseAdded?.();setSaved('Response saved');}}) : null,
      h('dialog', { ref: dialog, className: 'cw-dialog', 'aria-labelledby': titleId, onCancel: () => setPanel(null), onClose: () => {setPanel(null);requestAnimationFrame(()=>invoker.current?.focus());}, onClick: (event: React.MouseEvent<HTMLDialogElement>) => { if (event.target === event.currentTarget) setPanel(null); } },
        h('div', { className: 'cw-dialog-body' },
          h('header', null, h('h2', { id: titleId }, panel === 'invite' ? 'Invite people' : `Round ${round?.round_number} questions`), button('×', () => setPanel(null), { 'aria-label': 'Close dialog', className: 'cw-close' })),
          panel === 'invite' ? h(R.Fragment, null,
            h('p', { className: 'cw-dialog-intro' }, 'Share one link. Each person joins the consultation and responds in their own space.'),
            !p.form.allow_join ? h('p', { role: 'status', className: 'cw-notice' }, 'Joining is currently closed. Review access settings before inviting new participants.') : null,
            h('label', { className: 'cw-link-label' }, 'Invitation link', h('input', { value: joinUrl, readOnly: true, onFocus: (e: React.FocusEvent<HTMLInputElement>) => e.target.select() })),
            h('div', { className: 'cw-invite-actions' }, button(copyState === 'Link copied' ? 'Copied ✓' : 'Copy invite link', () => { void copy(); }, { className: 'cw-primary' }), h('a', { href: joinUrl, target: '_blank', rel: 'noreferrer' }, 'Preview join page ↗')),
            h('p', { className: 'cw-copy-status', role: 'status' }, copyState),
            h('div', { className: 'cw-invite-note' }, h('strong', null, 'One panel, every round'), h('p', null, 'Participants use this link again when the next round opens. Existing sign-in and consent requirements still apply.')),
            h('a', { className: 'cw-settings-link', href: `/admin/form/${p.form.id}` }, 'Manage access and consultation settings →')) :
            h(R.Fragment, null,
              h('p', { className: 'cw-dialog-intro' }, hint),
              outline.sharedScale?h('details',{className:'cw-shared-scale'},h('summary',null,'Rating scale used for every rated claim'),h('p',null,outline.sharedScale.join(' · '))):null,
              h('ol',{className:'cw-questions cw-question-outline'},...outline.groups.map((group,i)=>h('li',{key:i},
                h('h3',null,group.title),
                h('div',{className:'cw-field-outline'},...group.fields.map((field,j)=>h('p',{key:j},
                  field.options.length&&/^your (response|position)$/i.test(field.label)?'Rating':/^explain your position$/i.test(field.label)?'Written explanation':field.label||'Written response',
                  h('span',null,field.optional?' · Optional':' · Required'),
                  !outline.sharedScale&&field.options.length?h('small',null,field.options.join(' · ')):null
                )))
              )))
            ))));
  };
}
