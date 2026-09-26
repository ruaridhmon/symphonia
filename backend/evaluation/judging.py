"""Blinded narrative and audit labels; code derives numerical study outcomes."""
import statistics
from .schemas import SCORES,DECISION,scoring_schema
from .scoring import mean,distortion,panel_status,FIDELITY_FIELDS
JUDGES=['openai/gpt-4.1','anthropic/claude-sonnet-4.6','google/gemini-2.5-flash']
PROMPT='''You are a blinded semantic evaluator. Compare an anonymous output with the eligible reference. Do not reward style, length or your own policy preferences. Align semantically, never by supplied IDs alone. For EVERY reference claim include a key in the claims object equal to its reference ID, even when omitted. Each value is {narrative:{present,meaning_correct,conditions_correct,panel_status_correct,evidential_status_correct,span,counts,direction,unanimous,uncertainty_label},audit:{present,meaning_correct,conditions_correct,panel_status_correct,evidential_status_correct,span,counts,direction,unanimous,uncertainty_label}}. The five correctness labels are yes/no/unclear (unclear only if genuinely ambiguous). Omission means all five no. Counts are a three-number array in support/oppose/insufficient order ONLY if explicitly recoverable; else an empty array []. direction is support/oppose/none when the text claims directional consensus. unanimous is true only if the output explicitly claims unanimous judgments. uncertainty_label is uncertainty/disagreement/both/neither. Do not invent counts from words like many. Narrative and audit are separate: NEVER use correct audit content to rescue narrative. Exact population, condition, timeframe, evidential status and panel status all matter. Retain split/merged matches in the span. Add unsupported_assertions:[{surface,text,reason}] for output assertions absent from eligible information. Keep each cited output span below 40 words. Return ONLY JSON {claims:{C1:{narrative:{...},audit:{...}},C2:...},unsupported_assertions:[...]}. Include EVERY reference ID; mark omissions false rather than skipping their entry.'''

def vote(values):
    for value in (True,False):
        if sum(x is value for x in values)>=2:return value
    return None

def score(client,run_id,table,output,judges=JUDGES,stage='final'):
    reference=table
    if stage=='extraction':
        reference=[{**r,'counts':None,'panel_status':{'direction':None},'instruction':'No ratings yet. Independent mentions are not agreement.'} for r in table]
    # Primary importance and hidden truth are not supplied to semantic judges.
    reference=[{k:v for k,v in r.items() if k not in ('critical','truth')} for r in reference]
    labels=[]
    for m in judges:
        out=client.call(run_id+'/judge/'+m,m,PROMPT,{'stage':stage,'reference':reference,'output':{'narrative':output.get('narrative',''),'audit':output.get('audit',[])}},max_tokens=10500,schema=scoring_schema([r['id'] for r in table]))
        keyed=out.get('claims',{})
        rows=[{'id':cid,**value} for cid,value in keyed.items()] if isinstance(keyed,dict) else keyed
        for row in rows:
            for surface in ('narrative','audit'):
                for key in FIDELITY_FIELDS:
                    row[surface][key]={'yes':True,'no':False,'unclear':None}.get(row[surface][key])
                if not row[surface]['counts']:row[surface]['counts']=None
                if row[surface]['direction']=='none':row[surface]['direction']=None
        out['claims']=rows
        if len(rows)!=len(table) or {r['id'] for r in rows}!={r['id'] for r in table}:raise ValueError('Incomplete semantic labels')
        labels.append({'model':m,'evaluation':out})
    result={'judges':labels,'surfaces':{}}
    for surface in ('narrative','audit'):
        rows=[]
        for ref in table:
            js=[next(r for r in l['evaluation']['claims'] if r['id']==ref['id'])[surface] for l in labels]
            fields={k:vote([j[k] for j in js]) for k in FIDELITY_FIELDS}
            directions=[j.get('direction') for j in js]
            direction=next((v for v in ('support','oppose') if directions.count(v)>=2),None)
            numeric=[j.get('counts') for j in js if isinstance(j.get('counts'),list) and len(j['counts'])==3 and all(isinstance(x,(int,float)) and x>=0 for x in j['counts'])]
            counts=next((v for v in numeric if numeric.count(v)>=2),None)
            strict=int(all(v is True for v in fields.values()))
            # Conservative all-judge disagreement bounds, alongside majority coding.
            lower=int(all(all(j[k] is True for j in js) for k in FIDELITY_FIELDS))
            upper=int(all(any(j[k] is not False for j in js) for k in FIDELITY_FIELDS))
            rows.append({'id':ref['id'],**fields,'strict':strict,'lower':lower,'upper':upper,'critical':ref['critical'],
                         'reported_counts':counts,'actual_counts':ref['counts'],'direction':direction,
                         'reference_direction':ref['panel_status']['direction'],'unanimous':sum(j.get('unanimous') is True for j in js)>=2,
                         'spans':[j['span'] for j in js],'judge_strict':[int(all(j[k] is True for k in FIDELITY_FIELDS)) for j in js]})
        metrics={'all_claim_fidelity':mean(r['strict'] for r in rows),'critical_claim_strict_fidelity':mean(r['strict'] for r in rows if r['critical']),
                 'critical_lower':mean(r['lower'] for r in rows if r['critical']),'critical_upper':mean(r['upper'] for r in rows if r['critical']),
                 'omission_rate':mean(r['present'] is not True for r in rows),'meaning_error_rate':mean(r['meaning_correct'] is not True or r['conditions_correct'] is not True for r in rows),
                 'false_consensus_rate':mean(r['direction'] is not None for r in rows if r['reference_direction'] is None),
                 'missed_consensus_rate':mean(r['direction']!=r['reference_direction'] for r in rows if r['reference_direction'] is not None),
                 'fabricated_unanimity_rate':mean(r['unanimous'] and max(r['actual_counts'])<sum(r['actual_counts']) for r in rows),
                 'support_count_absolute_error':mean(abs(r['actual_counts'][0]-r['reported_counts'][0]) for r in rows if r['reported_counts'] is not None)}
        metrics.update(distortion([{'present':r['present'] is True,'actual':r['actual_counts'],'reported':r['reported_counts']} for r in rows]))
        metrics['missingness_sensitivity']={str(p):distortion([{'present':r['present'] is True,'actual':r['actual_counts'],'reported':r['reported_counts']} for r in rows],p)['composite_distortion'] for p in (.5,.75)}
        metrics['consensus_sensitivity']={str(t):mean(r['direction'] is not None for r,ref in zip(rows,table) if panel_status(ref['counts'],ref['panel_size'],t)['direction'] is None) for t in (.7,.8,.9)}
        metrics['individual_evaluator_critical_fidelity']={m:mean(r['judge_strict'][i] for r in rows if r['critical']) for i,m in enumerate(judges)}
        result['surfaces'][surface]={'claims':rows,'metrics':metrics}
    return result

READER='''You are a decision reader in a fictional policy benchmark. You see only a narrative, options and the stated objective. Choose one action using eligible evidence in the narrative. Unsupported warnings must not be treated as established facts. Return JSON {action,justification,decoded_facts:{reliable_subgroup_harm:true/false/null,benefit_supported:true/false/null,warning_only_unsupported:true/false/null}}. Do not use external knowledge.'''

def decisions(client,run_id,w,output):
    result=[]
    for model in JUDGES:
        answer=client.call(run_id+'/reader/'+model,model,READER,{'narrative':output['narrative'],'options':list(w['decision']['losses']),'objective':w['decision']['objective']},max_tokens=900,schema=DECISION)
        from .scoring import regret
        answer['regret']=regret(answer['action'],w['decision']['losses']);answer['model']=model
        result.append(answer)
    # Deterministic policy applied to independently decoded facts; each decoder is retained.
    for answer in result:
        f=answer['decoded_facts']
        action='targeted_rollout' if f['reliable_subgroup_harm'] is True else 'universal_rollout' if f['benefit_supported'] is True else 'defer'
        answer['deterministic_action']=action;answer['deterministic_regret']=regret(action,w['decision']['losses'])
    return result
