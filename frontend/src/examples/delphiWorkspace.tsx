import * as React from 'react';
import {createRoot} from 'react-dom/client';
import data from '../demos/research-ai-results.json';
import {createConsultationWorkspace} from '../utils/consultationWorkspace';
import {createResponseWorkspace} from '../utils/responseWorkspace';
import {renderResponseReading} from '../utils/responseReading';
import {renderDelphiInsights} from '../utils/renderDelphiInsights';
import type {Round,RoundWithResponses} from '../types/summary';
const Workspace=createConsultationWorkspace(React);
const Reader=({response,questions,roundNumber}:any)=>renderResponseReading(React.createElement,questions,response.answers,roundNumber);
const Responses=createResponseWorkspace(React,Reader);
const rounds=data.rounds as unknown as Round[];
const responses=data.responses.map(group=>({...group,responses:group.responses.map((response,index)=>({...response,round_id:group.id,email:data.fixture.experts[index].role}))})) as RoundWithResponses[];
function Findings({round}:{round:Round}) {
 const root=React.useRef<HTMLDivElement>(null);
 React.useEffect(()=>{if(root.current)renderDelphiInsights(root.current,round,rounds,responses);},[round]);
 return round.round_number===1?<section className="cw-demo-opening"><p className="cw-demo-overline">The opening question</p><h3>{data.fixture.question}</h3><p>Eight people respond independently. Their original perspectives are in Responses.</p><h4>Four claims to take into the rating round</h4><ol>{data.fixture.claims.map(claim=><li key={claim}>{claim}</li>)}</ol><p className="cw-demo-note">These are candidate claims, not measured agreement. Ratings begin in round 2.</p></section>:<div ref={root} id="delphi-recorded-progress"/>;
}
function Demo() {
 const [round,setRound]=React.useState(rounds[0]);
 const goRound=(next:Round)=>{setRound(next);window.scrollTo({top:0,behavior:'instant'});};
 const [view,setView]=React.useState<'synthesis'|'responses'|'analysis'>('synthesis');
 return <><header className="example-header"><a href="/">Symphonia</a><a href="/">Back to consultations ↗</a></header><main className="product-summary cw-demo-main"><div>
 <p className="cw-demo-intro">A complete Delphi, from first thoughts to final positions. <span>8 fictional participants · 3 rounds · 24 submissions.</span></p>
 <Workspace isDemo form={{id:0,title:data.fixture.title,join_code:'DEMO',allow_join:false,questions:rounds[0].questions}} rounds={rounds} responses={responses} selectedRoundId={round.id} view={view} onView={setView} onRound={goRound}/>
 {view==='synthesis'?<Findings round={round}/>:view==='responses'?<Responses rounds={rounds} structuredRounds={responses} formQuestions={round.questions} initialRoundId={round.id} onResponseUpdated={()=>{}}/>:<section className="cw-demo-opening"><p className="cw-demo-overline">What changed</p><h3>Agreement is only part of the result.</h3>{data.fixture.narratives.map((text,i)=><p key={i}>{text}</p>)}<details><summary>Simulation method</summary><p>{data.fixture.method}</p><p>Eight returning participants; an 80% threshold; uncertainty included in the denominator. Stop after three rounds and retain unresolved disagreement.</p></details></section>}
 <footer className="cw-demo-footer"><span>Scripted simulation. No real expert findings.</span>{round.round_number<3?<button onClick={()=>goRound(rounds[round.round_number])}>Explore round {round.round_number+1} →</button>:<button onClick={()=>{goRound(rounds[0]);setView('synthesis');}}>Return to the beginning ↺</button>}</footer>
 </div></main></>;
}
createRoot(document.getElementById('root')!).render(<Demo/>);
