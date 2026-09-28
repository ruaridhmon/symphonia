import React, {useState} from 'react';
import {createRoot} from 'react-dom/client';
import SurveyQuestionInput from '../components/SurveyQuestionInput';
import {buildDelphiRoundTwoQuestions} from '../utils/delphiRoundTwo';
import {buildFixedDelphiRound} from '../utils/delphiPlanning';
import {emptyStructuredResponse} from '../types/structured-input';
import {normalizeQuestion} from '../utils/questions';
import type {Round} from '../types/summary';
const rawQuestions=buildDelphiRoundTwoQuestions('<p>Claim 1: <strong>People should be able to request human review of an AI decision affecting their access to a public service.</strong></p>');
const questions=rawQuestions.map(normalizeQuestion);
const baseline:Round={id:2,round_number:2,is_active:true,synthesis:'',questions:rawQuestions};
const third=buildFixedDelphiRound(baseline,[baseline],[]).map(normalizeQuestion);
function Preview(){
 const [round,setRound]=useState(2);
 const [answers,setAnswers]=useState<Record<string,ReturnType<typeof emptyStructuredResponse>>>({});
 return <main><a href="/">← Symphonia</a><p className="eyebrow">Participant preview · nothing is submitted</p><h1>Review a claim</h1><div className="rounds">{[2,3].map(n=><button key={n} aria-pressed={round===n} onClick={()=>setRound(n)}>Round {n}</button>)}</div><h2>{questions[0].sectionTitle}</h2>{(round===2?questions:third).map(q=>{const key=`${round}-${q.questionId}`;return <section key={key}><h3>{q.label}{q.optional?' (optional)':''}</h3><SurveyQuestionInput question={q} value={answers[key]||emptyStructuredResponse()} onChange={v=>setAnswers(a=>({...a,[key]:v}))}/></section>})}</main>;
}
createRoot(document.getElementById('root')!).render(<Preview/>);
