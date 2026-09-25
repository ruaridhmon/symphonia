import type * as React from 'react';
import type { Form, Round, RoundWithResponses } from '../types/summary';

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
export function createConsultationWorkspace(R: typeof React) {
  const h = R.createElement;
  return function ConsultationWorkspace(p: WorkspaceProps) {
    const [panel, setPanel] = R.useState<'invite' | 'questions' | null>(null);
    const [copyState, setCopyState] = R.useState('');
    const dialog = R.useRef<HTMLDialogElement>(null);
    const titleId = R.useId();
    const ordered = [...p.rounds].sort((a, b) => a.round_number - b.round_number);
    const round = ordered.find(r => r.id === p.selectedRoundId) || ordered.find(r => r.is_active) || ordered[0];
    const responseGroup = p.responses?.find(r => r.id === round?.id);
    const count = responseGroup ? responseGroup.responses.length : round?.response_count;
    const joinUrl = new URL(`/share/${encodeURIComponent(p.form.join_code)}`, window.location.origin).href;
    const outline=questionOutline(round?.questions || p.form.questions);
    const simulated=/^SIMULATED PANEL\s*[—–-]\s*/i.test(p.form.title);
    const displayTitle=p.form.title.replace(/^SIMULATED PANEL\s*[—–-]\s*/i,'');
    const hint = round?.round_number === 1 ? 'Collect independent views, then draw out the claims.' : round?.round_number === 2 ? 'Review the claims and where the panel agrees or differs.' : 'Review final ratings alongside the reasons behind them.';
    R.useEffect(() => {
      if (panel && dialog.current && !dialog.current.open) dialog.current.showModal();
      if (!panel && dialog.current?.open) dialog.current.close();
    }, [panel]);
    R.useEffect(() => { setPanel(null); setCopyState(''); }, [p.form.id]);
    const canLeave = () => !document.querySelector('.response-workspace textarea') || window.confirm('Discard unsaved response edits?');
    const button = (text: string, onClick: () => void, props: Record<string, unknown> = {}) => h('button', { type: 'button', onClick, ...props }, (props.children as React.ReactNode) ?? text);
    const copy = async () => {
      try { await navigator.clipboard.writeText(joinUrl); setCopyState('Link copied'); }
      catch { setCopyState('Copy unavailable. Select the link below and copy it.'); }
    };
    return h('section', { className: 'consultation-workspace', 'data-final-round':ordered.length === 3 ? 'true' : undefined, 'aria-label': 'Consultation workspace' },
      h('div', { className: 'cw-title-row' },
        h('div', { className: 'cw-identity' }, (simulated||p.isDemo)?h('p', { className: 'cw-provenance' }, 'Demo · fictional experts'):null, h('h2', null, displayTitle)),
        p.isDemo ? h('span', {className:'cw-demo-badge'}, 'Synthetic example') : h('div', { className: 'cw-title-actions' },
          button('Invite people', () => { setCopyState(''); setPanel('invite'); }, { className: 'cw-primary' }),
          h('details', { className: 'cw-options' }, h('summary', { 'aria-label': 'Consultation options' }, '•••'),
            h('div', null, h('a', { href: `/admin/form/${p.form.id}` }, 'Edit consultation'),
              p.onDownload ? button('Download', p.onDownload) : null,
              round && !round.is_active && p.onMakeLive ? button(p.makingLiveId === round.id ? 'Updating…' : `Make Round ${round.round_number} current`, () => p.onMakeLive?.(round), { disabled: p.makingLiveId === round.id }) : null)))),
      h('nav', { className: 'cw-views', 'aria-label': 'Consultation views' },
        ([['synthesis', 'Summary'], ['responses', 'Responses']] as [View, string][]).map(([view, label]) =>
          button(label, () => { if (canLeave()) p.onView(view); }, { key: view, 'aria-pressed': p.view === view })),
      h('div', { className: 'cw-context cw-simple-context' },
        h('label',{className:'cw-round-picker'},h('span',{className:'cw-round-display','aria-hidden':true},`Round ${round?.round_number||'—'} ⌄`),h('select',{'aria-label':'Round',value:round?.id||'',onChange:(event:React.ChangeEvent<HTMLSelectElement>)=>{const selected=ordered.find(r=>r.id===Number(event.target.value));if(selected&&canLeave())p.onRound(selected);}},...ordered.map(r=>h('option',{key:r.id,value:r.id},`Round ${r.round_number}${r.is_active?' · Current':''}`)))),
        count!==undefined?h('span',null,`${count} response${count===1?'':'s'}`):null,
        button('View questions', () => setPanel('questions'), { className: 'cw-text-button', disabled: !round }))),
      h('dialog', { ref: dialog, className: 'cw-dialog', 'aria-labelledby': titleId, onCancel: () => setPanel(null), onClose: () => setPanel(null), onClick: (event: React.MouseEvent<HTMLDialogElement>) => { if (event.target === event.currentTarget) setPanel(null); } },
        h('div', { className: 'cw-dialog-body' },
          h('header', null, h('h2', { id: titleId }, panel === 'invite' ? 'Bring your panel together' : `Round ${round?.round_number} questions`), button('×', () => setPanel(null), { 'aria-label': 'Close dialog', className: 'cw-close' })),
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
