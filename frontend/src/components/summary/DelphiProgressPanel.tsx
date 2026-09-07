import { useEffect, useRef } from 'react';
import type { Round, RoundWithResponses } from '../../types/summary';
import { renderDelphiInsights } from '../../utils/renderDelphiInsights';
export default function DelphiProgressPanel({round,rounds,responses}:{round:Round|null;rounds:Round[];responses:RoundWithResponses[]}) {
  const root=useRef<HTMLElement>(null);
  useEffect(()=>{if(root.current&&round)renderDelphiInsights(root.current,round,rounds,responses);},[round,rounds,responses]);
  if(!round)return null;
  return <section ref={root} className="card delphi-insights" aria-label="Delphi round progress" />;
}
