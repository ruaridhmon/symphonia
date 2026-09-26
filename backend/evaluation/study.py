"""Study orchestration. Every scheduled cell is persisted before execution."""
import argparse,copy,json,math,random,re,statistics,time,traceback
from pathlib import Path
from .client import Client,Store,CallFailure,digest
from .calibration import run as calibrate
from .reference import accepted_world,panel,reference,SETTINGS
from .methods import extract,align,replay,fixed_feedback,summarise,transcript,openings,SNAPSHOT
from .judging import score,decisions,JUDGES
from .interaction import experiment as interactive
from .scoring import mean
CORE='anthropic/claude-opus-4.6'
METHODS=['direct','structured','staged','symphonia','reference_fed']

def status(client,stage,**extra):
    value={'stage':stage,'updated_at':time.time(),'recorded_process_cost_usd':round(client.spent,4),**extra}
    client.store.put('status.json',value);print(json.dumps(value),flush=True)

def cell(client,w,p,method,repeat,words=500,model=CORE,track='identical_transcript',variant='baseline'):
    prefix=f'{w["map_id"]}/A/v4/{track}/{p["n"]}/{words}/{method}/{model}/{repeat}/{variant}'
    name='results/'+digest(prefix)+'.json';previous=client.store.get(name)
    if previous and previous['status'] in ('complete','failed'):return previous
    meta={'run_id':prefix,'map_id':w['map_id'],'policy_setting':w['policy_setting'],'phase':w['phase'],'panel_size':p['n'],'words':words,'method':method,'model':model,'repeat':repeat,'track':track,'variant':variant,'status':'scheduled'}
    client.store.put(name,meta)
    try:
        full_table=reference(w,p['people'],3)
        stage_outputs={};stage_scores={}
        if track=='full_workflow':
            extracted=extract(client,prefix,model,method,w,p)
            matching=align(client,prefix,extracted['claims'],w,JUDGES)
            claims=extracted['claims'];mapping=matching['mapping']
            r2=replay(p,claims,mapping,2);r3=replay(p,claims,mapping,3)
            # Each displayed proposition gets only semantically equivalent fixed ballots.
            feedback={'claims':claims,'recorded_feedback':fixed_feedback(claims,r2)} if method=='symphonia' else summarise(client,prefix+'/feedback',model,method,{'policy_question':w['policy_question'],'claims':claims,'round2':r2},words,len(w['claims']),reference(w,p['people'],2,set(mapping.values())))
            material={'policy_question':w['policy_question'],'opening':openings(p),'claims':claims,'round2':r2,'feedback':feedback,'round3':r3}
            actual_table=reference(w,p['people'],3,set(mapping.values()))
            stage_outputs={'extraction':extracted,'alignment':matching,'feedback':feedback,'round2_received':r2,'round3_received':r3}
            stage_scores['extraction']=score(client,prefix+'/extraction',reference(w,p['people'],2),{'narrative':'\n'.join(c['text'] for c in claims),'audit':claims},stage='extraction')
            feedback_output=feedback if 'narrative' in feedback else {'narrative':json.dumps(feedback,ensure_ascii=False),'audit':feedback['recorded_feedback']}
            stage_scores['feedback']=score(client,prefix+'/feedback',reference(w,p['people'],2),feedback_output,stage='feedback')
        else:material=transcript(w,p);actual_table=full_table
        if variant=='matched_processing_budget':
            with client.processing_budget(262144) as budget:
                output=summarise(client,prefix,model,method,material,words,len(w['claims']),actual_table)
            output['processing_budget']=budget
        else:output=summarise(client,prefix,model,method,material,words,len(w['claims']),actual_table)
        final_scores=score(client,prefix,full_table,output)
        received_scores=score(client,prefix+'/actual_received',actual_table,output) if track=='full_workflow' and actual_table else None
        readers=decisions(client,prefix,w,output) if p['n']==32 and words==500 and repeat==0 and track=='identical_transcript' else []
        meta.update(status='complete',reference=full_table,actual_received_reference=actual_table,output=output,scores=final_scores,actual_received_scores=received_scores,stage_outputs=stage_outputs,stage_scores=stage_scores,decisions=readers)
    except Exception as exc:
        meta.update(status='failed',error_type=type(exc).__name__,error=str(exc)[:500])
    return client.store.put(name,meta)

def prepare_validated(client,phase,slot,sizes):
    path=f'accepted/{phase}-{slot:03d}.json';cache=client.store.get(path)
    if cache:
        w=client.store.get('reference/'+cache['map_id']+'.json')
        return w,{n:panel(client,w,n) for n in sizes}
    failed=[]
    for replacement in range(5):
        w=accepted_world(client,phase,slot+600*replacement)
        try:
            ps={n:panel(client,w,n) for n in sizes}
            if not all(p['validated'] for p in ps.values()):raise CallFailure('Realised participant content failed semantic validation')
        except Exception as exc:
            failed.append({'map_id':w['map_id'],'error':str(exc)[:500]});continue
        client.store.put(path,{'map_id':w['map_id'],'rejected':failed,'replacement_rule':'candidate slot plus 600 after any panel fails one allowed regeneration','panels':sizes})
        return w,ps
    raise CallFailure('Could not validate independent case for slot '+str(slot))

def perturb(client,w,p,variant,rep):
    changed=copy.deepcopy(p);people=changed['people'];rng=random.Random(digest([w['map_id'],variant,rep]))
    if variant in ('without_confidence','without_provenance','without_reconsideration'):
        for x in people:
            if variant=='without_reconsideration':x['realised']['round3']=copy.deepcopy(x['realised']['round2'])
            for r in (2,3):
                for a in x['realised'][f'round{r}']:
                    if variant=='without_confidence':a.pop('confidence',None)
                    if variant=='without_provenance':
                        a['source_ids']=[];a['reason']=re.sub(r'\bS\d+\b','[source omitted]',a['reason'])
            if variant=='without_provenance':x['realised']['opening']=re.sub(r'\bS\d+\b','[source omitted]',x['realised']['opening'])
    elif variant=='reorder':rng.shuffle(people)
    elif variant=='prestige':
        for i,x in enumerate(people):x['participant_id']=f'{x["participant_id"]} (irrelevant title: '+('Distinguished professor' if i%2 else 'Junior trainee')+')'
    elif variant=='repeat':
        for x in people:x['realised']['opening']+=' '+x['realised']['opening']
    elif variant in ('paraphrase','verbosity'):
        def rewrite(x):
            out=client.call(f'{w["map_id"]}/perturb/{variant}/{rep}/{x["participant_id"]}','openai/gpt-4.1-mini','Rewrite the supplied text preserving every claim, condition, source and stance. '+('Make it twice as verbose with no new facts.' if variant=='verbosity' else 'Change wording and sentence order.')+' Return JSON {text}.',{'text':x['realised']['opening']},max_tokens=1600)
            x['realised']['opening']=out['text'];return x
        changed['people']=client.parallel(rewrite,people)
    elif variant in ('minority_one','minority_eighth','minority_quarter','remove_consequential'):
        target=1 if variant=='minority_one' else max(1,len(people)//8) if variant=='minority_eighth' else len(people)//4 if variant=='minority_quarter' else 0
        critical=set(w['decision']['critical_claim_ids'])
        donor=next((x for x in people if any(a['claim_id'] in critical and a['stance']=='support' for a in x['realised']['round3'])),None)
        if donor:
            for i,x in enumerate(people):
                for r in (2,3):
                    for a in x['realised'][f'round{r}']:
                        if a['claim_id'] in critical:
                            source=next(z for z in donor['realised'][f'round{r}'] if z['claim_id']==a['claim_id'])
                            a.update(copy.deepcopy(source) if i<target else {'stance':'insufficient_evidence','confidence':20,'reason':'No eligible observation supplied for this proposition.','source_ids':[],'probability':.5})
                # Opening contributes to eligible evidence, so remove it rather than leak the omitted observation.
                x['realised']['opening']='' if i>=target else donor['realised']['opening']
        changed['perturbation_scope']='entire contribution changed for minority availability; report as compound perturbation, not pure prevalence'
    elif variant=='shared_source_supporters':
        donor=copy.deepcopy(people[0]);donor['participant_id']='ADDED-P1';people.append(donor);changed['n']=len(people)
    elif variant=='reliable_contradiction':
        # A prespecified extra source is generated and kept separate from the frozen original map.
        evidence=client.call(f'{w["map_id"]}/perturb/contradiction','anthropic/claude-sonnet-4.6','Create one new reliable fictional evidence item contradicting the supplied empirical proposition with the same population/timeframe. Return JSON {text}. No external facts.',{'claim':next(c['text'] for c in w['claims'] if c['type']=='factual')},max_tokens=500)
        for x in people:x['realised']['opening']+=' New reliable source S9999: '+evidence['text']
        changed['new_evidence']=evidence;changed['reference_change_required']=True
    else:raise ValueError('Unknown perturbation')
    return changed

def power_freeze(client,pilot_results):
    pairs={}
    for r in pilot_results:
        if r['status']=='complete' and r['track']=='identical_transcript' and r['panel_size']==32:
            pairs.setdefault(r['map_id'],{}).setdefault(r['method'],[]).append(r)
    requirements={};deltas={}
    for metric,effect in [('critical_claim_strict_fidelity',.10),('false_consensus_rate',.05)]:
        ds=[]
        for arms in pairs.values():
            if 'symphonia' in arms and 'structured' in arms:
                a=[r['scores']['surfaces']['narrative']['metrics'][metric] for r in arms['symphonia']]
                b=[r['scores']['surfaces']['narrative']['metrics'][metric] for r in arms['structured']]
                if all(x is not None for x in a+b):ds.append(mean(a)-mean(b))
        if len(ds)<6:raise RuntimeError('Insufficient paired pilot scenarios to plan main study')
        sd=statistics.stdev(ds);requirements[metric]=math.ceil(((2.24+.84)*sd/effect)**2);deltas[metric]=ds
    n=max(30,6*math.ceil(max(requirements.values())/6));planned=min(120,n)
    frozen={'status':'frozen_after_pilot','created_at':time.time(),'maps':planned,'maps_required_by_approximate_power':n,'power_limited':n>120,
            'minimum_worthwhile_effects':{'critical_claim_strict_fidelity':.10,'false_consensus_rate':.05},'target_power':.8,'approximation':'paired normal, conservative alpha .025 each; pilot SD uncertain',
            'requirements':requirements,'pilot_deltas':deltas,'core_model':CORE,'replication_model':'openai/gpt-4.1','judges':JUDGES,
            'repeats':3,'primary_panel':32,'primary_words':500,'primary_comparator':'structured','bootstrap_resamples':2000,
            'design':'all maps primary pair; balanced first 30 maps remaining comparators, compression, panel size, robustness, interaction and replication',
            'main_test_generation_starts_after_this_timestamp':True,'scenario_exclusion_rule':'one participant regeneration then replace complete map using fixed seed offset',
            'source_snapshot':SNAPSHOT['commit'],'operational_spend_cap_usd':client.limit}
    return client.store.put('frozen_main_specification.json',frozen)

def run(client,phase):
    status(client,'evaluator_calibration')
    calibration=calibrate(client,JUDGES)
    if not calibration['accepted']:
        status(client,'evaluator_validation_failed',details=[{k:v for k,v in m.items() if k!='labels'} for m in calibration['models']]);return
    status(client,'pilot_generation')
    cases=[]
    for slot in range(12):
        w,ps=prepare_validated(client,'pilot',slot,(8,32));cases.append((w,ps));status(client,'pilot_generation',validated_cases=len(cases),required=12)
    # Generated panels and all R2/R3 reference ballots exist before any method is tested.
    client.store.put('pilot_schedule.json',{'pipeline_version':4,'total_runs':480,'cells':[{'map_id':w['map_id'],'panel_size':n,'method':m,'repeat':r,'track':track,'words':500,'model':CORE} for w,ps in cases for n in (8,32) for m in METHODS for r in range(2) for track in ('identical_transcript','full_workflow')]})
    results=[]
    for w,ps in cases:
        tasks=[(n,m,r,track) for n in (8,32) for m in METHODS for r in range(2) for track in ('identical_transcript','full_workflow')]
        def one(t):n,m,r,track=t;return cell(client,w,ps[n],m,r,track=track)
        results.extend(client.parallel(one,tasks));status(client,'pilot_experiment_A',maps_finished=len({r['map_id'] for r in results}),scheduled_runs=480,finished_runs=len(results),failed_runs=sum(r['status']=='failed' for r in results))
    # All pilot robustness maps, three independent order/paraphrase repetitions.
    for w,ps in cases:
        for variant in ('reorder','paraphrase','verbosity','prestige','repeat','shared_source_supporters','minority_one','minority_eighth','minority_quarter','remove_consequential','reliable_contradiction','without_confidence','without_provenance','without_reconsideration'):
            for rep in range(3 if variant in ('reorder','paraphrase') else 1):
                changed=perturb(client,w,ps[32],variant,rep)
                client.store.put('perturbations/'+digest([w['map_id'],variant,rep])+'.json',changed)
                for method in ('structured','symphonia'):results.append(cell(client,w,changed,method,rep,variant=variant))
        status(client,'pilot_robustness',map_id=w['map_id'])
    for w,ps in cases[:6]:
        for mode in ('controlled','free'):
            for family in ('openai/gpt-4.1-mini','google/gemini-2.5-flash'):
                try:interactive(client,w,ps[8],CORE,mode,family)
                except Exception as exc:client.store.put('interactive_failures/'+digest([w['map_id'],mode,family])+'.json',{'map_id':w['map_id'],'mode':mode,'participant_model':family,'error':str(exc)[:500]})
        status(client,'pilot_experiment_B',map_id=w['map_id'])
    if phase=='pilot':status(client,'pilot_complete',runs=len(results));return
    frozen=client.store.get('frozen_main_specification.json') or power_freeze(client,results)
    status(client,'main_generation',planned_maps=frozen['maps'])
    for slot in range(frozen['maps']):
        sizes=(8,32,64) if slot<30 else (32,)
        w,ps=prepare_validated(client,'main',slot,sizes)
        methods=METHODS if slot<30 else ['structured','symphonia']
        tasks=[(32,500,m,r,track,CORE,'baseline') for m in methods for r in range(3) for track in ('identical_transcript','full_workflow')]
        if slot<30:
            tasks.extend((n,words,m,r,'identical_transcript',CORE,'baseline') for n,words in ((8,500),(64,500),(32,250),(32,1000)) for m in ('structured','symphonia') for r in range(3))
            tasks.extend((32,500,m,r,'identical_transcript',CORE,'matched_processing_budget') for m in METHODS for r in range(3))
            tasks.extend((32,500,m,r,'identical_transcript','openai/gpt-4.1','replication') for m in ('structured','symphonia') for r in range(3))
        def one(t):n,words,m,r,track,model,variant=t;return cell(client,w,ps[n],m,r,words,model,track,variant)
        client.parallel(one,tasks);status(client,'main_experiment_A',maps_finished=slot+1,planned_maps=frozen['maps'])
        if slot<30:
            for variant in ('reorder','paraphrase','verbosity','prestige','repeat','shared_source_supporters','minority_one','minority_eighth','minority_quarter','remove_consequential','reliable_contradiction','without_confidence','without_provenance','without_reconsideration'):
                for rep in range(3 if variant in ('reorder','paraphrase') else 1):
                    changed=perturb(client,w,ps[32],variant,rep)
                    for m in ('structured','symphonia'):cell(client,w,changed,m,rep,variant=variant)
            for mode in ('controlled','free'):
                for family in ('openai/gpt-4.1-mini','google/gemini-2.5-flash'):
                    try:interactive(client,w,ps[32],CORE,mode,family)
                    except Exception as exc:client.store.put('interactive_failures/'+digest([w['map_id'],mode,family])+'.json',{'map_id':w['map_id'],'mode':mode,'participant_model':family,'error':str(exc)[:500]})
        status(client,'main_map_complete',maps_finished=slot+1,planned_maps=frozen['maps'])
    for slot in range(6):
        w=accepted_world(client,'stress',slot,count=30)
        ps=panel(client,w,32)
        if not ps['validated']:continue
        for m in ('structured','symphonia'):
            for rep in range(3):cell(client,w,ps,m,rep,variant='larger_claim_stress')
    status(client,'experiments_finished_analysis_pending')

def main():
    p=argparse.ArgumentParser();p.add_argument('--root',default='/data/synthetic-20260926');p.add_argument('--bucket');p.add_argument('--phase',default='all',choices=['pilot','all']);p.add_argument('--spend-cap',type=float,default=800);a=p.parse_args()
    c=Client(Store(a.root,a.bucket),a.spend_cap,workers=6)
    try:run(c,a.phase)
    except Exception as exc:
        status(c,'stopped',error_type=type(exc).__name__,error=str(exc)[:600]);raise
if __name__=='__main__':main()
