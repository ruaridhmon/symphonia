import type * as React from 'react';
import type {Round} from '../types/summary';
export type RoundSelectorProps={rounds:Round[];selectedRoundId:number|null;onSelectRound:(round:Round)=>void;onMakeRoundLive?:(round:Round)=>void;makingRoundLiveId?:number|null};
/** Selecting a round changes the view only; making it live remains a separate action. */
export function createRoundSelector(R:typeof React){
 const h=R.createElement;
 return function RoundSelector({rounds,selectedRoundId,onSelectRound,onMakeRoundLive,makingRoundLiveId}:RoundSelectorProps){
  const ordered=[...rounds].sort((a,b)=>a.round_number-b.round_number);if(!ordered.length)return null;
  const viewed=ordered.find(r=>r.id===selectedRoundId)||ordered[0];
  return h('div',{className:'round-selector'},
   ordered.length<=3?h('div',{className:'round-selector-options',role:'group','aria-label':'View round'},ordered.map(round=>h('button',{key:round.id,type:'button','aria-pressed':viewed.id===round.id,'aria-label':`Round ${round.round_number}${round.is_active?' Current':''}`,onClick:()=>{if(viewed.id!==round.id)onSelectRound(round);}},h('span',null,`Round ${round.round_number}`),round.is_active?h('small',null,'Current'):h('small',{'aria-hidden':true},'\u00a0')))):
   h('label',null,h('span',{className:'round-selector-label'},'View round'),h('select',{value:viewed.id,onChange:(event:React.ChangeEvent<HTMLSelectElement>)=>{const next=ordered.find(r=>r.id===Number(event.target.value));if(next)onSelectRound(next);}},ordered.map(round=>h('option',{key:round.id,value:round.id},`Round ${round.round_number}${round.is_active?' · Current':''}`)))),
   !viewed.is_active&&onMakeRoundLive?h('details',{className:'round-selector-actions',key:viewed.id},h('summary',null,'Round options'),h('div',null,h('p',null,`Viewing Round ${viewed.round_number} does not change the current survey round.`),h('button',{type:'button',disabled:makingRoundLiveId===viewed.id,onClick:()=>onMakeRoundLive(viewed)},makingRoundLiveId===viewed.id?'Updating…':`Make Round ${viewed.round_number} current`))):null);
 };
}
