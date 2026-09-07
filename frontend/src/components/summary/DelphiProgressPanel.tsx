import { nextRound } from '../../api/rounds';
import { useParams } from 'react-router-dom';
import { useEffect, useRef } from 'react';
import type { Round, RoundWithResponses } from '../../types/summary';
import { renderDelphiInsights } from '../../utils/renderDelphiInsights';
export default function DelphiProgressPanel({round,rounds,responses}:{round:Round|null;rounds:Round[];responses:RoundWithResponses[]}) {
  const {id}=useParams();
  const root=useRef<HTMLElement>(null);
  useEffect(()=>{if(root.current&&round)renderDelphiInsights(root.current,round,rounds,responses,undefined,round.is_active ? async questions=>{await nextRound(Number(id),{questions,expected_round_number:round.round_number});location.assign(location.pathname);} : undefined);},[round,rounds,responses]);
  if(!round)return null;
  return <section ref={root} className="card delphi-insights" aria-label="Delphi round progress" />;
}
