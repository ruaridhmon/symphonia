"""Feedback-isolation Experiment B: controlled Bayesian and free LLM panels."""
import re
from .schemas import obj,array,ANSWER
from .client import digest
from .methods import summarise,fixed_feedback,clean_reference
from .reference import reference
from .judging import score,decisions
from .scoring import uncertainty,mean
PROMPT='''You are one fictional policy participant reconsidering your own earlier judgments. Use only your private evidence and any feedback supplied; identify the reason for each change. No peer feedback means reconsider your own material only. Keep normative preferences fixed. Return JSON {answers:[{claim_id,stance,confidence,reason,source_ids,probability}]}, one answer per displayed claim. stance support/oppose/insufficient_evidence; confidence 0..100; probability 0..1 for factual claims, null for normative. Use no new or invented source. When computed_probabilities is supplied, it is a controlled experiment: copy those factual probabilities exactly and express their implications (support if >=0.6, oppose if <=0.4, otherwise insufficient_evidence). Never change those computed values. Do not infer truth from confidence.'''

def probabilities(w,source_ids,claims):
    ps={}
    for c in claims:
        odds=1.0
        for s in w['sources']:
            if s['id'] in set(source_ids) and s['claim_ids'][0]==c['id'] and s.get('likelihood_ratio') is not None:
                odds*=s['likelihood_ratio']
        ps[c['id']]=round(odds/(1+odds),8)
    return ps

def experiment(client,w,panel,model,mode,participant_model,words=500):
    prefix=f'{w["map_id"]}/B/v2/{mode}/{participant_model}'
    saved=client.store.get('interactive/'+digest(prefix)+'.json')
    if saved and saved.get('status')=='finished':return saved
    factual=[c for c in w['claims'] if c['type']=='factual' and c['truth'] in (0,1)][:5]
    selected=factual if mode=='controlled' else w['claims']
    ids={c['id'] for c in selected};display=[{'id':c['id'],'text':c['text'],'type':c['type']} for c in selected]
    initial=[]
    for p in panel['people']:
        rows=[dict(a) for a in p['realised']['round2'] if a['claim_id'] in ids]
        if mode=='controlled':
            ps=probabilities(w,[s['id'] for s in p['private']['private_evidence']],selected)
            for row in rows:
                row['probability']=ps[row['claim_id']];row['stance']='support' if row['probability']>=.6 else 'oppose' if row['probability']<=.4 else 'insufficient_evidence'
                row['reason']='Controlled prior odds 1; unique-source update. '+ ' '.join(f'{source["id"]}: likelihood ratio {source["likelihood_ratio"]}.' for source in p['private']['private_evidence'] if source['claim_ids'][0]==row['claim_id'] and source.get('likelihood_ratio') is not None)
        initial.append({'participant_id':p['participant_id'],'answers':rows})
    initial_people=[{**p,'realised':{**p['realised'],'round2':r['answers']}} for p,r in zip(panel['people'],initial)]
    table=reference(w,initial_people,2,ids)
    record=saved or {'map_id':w['map_id'],'phase':w['phase'],'policy_setting':w['policy_setting'],'mode':mode,'participant_model':participant_model,'n':len(panel['people']),'status':'running','scheduled_arms':['symphonia','exact','structured','none'],'arms':[]}
    arms=record['arms']
    client.store.put('interactive/'+digest(prefix)+'.json',record)
    for arm in ('symphonia','exact','structured','none'):
        if any(a['arm']==arm for a in arms):continue
        try:
            key=prefix+'/'+arm
            if arm=='exact':feedback={'exact_display':clean_reference(table),'responses':initial}
            elif arm=='symphonia':feedback={'recorded_feedback':fixed_feedback(display,initial)}
            elif arm=='structured':feedback=summarise(client,key+'/feedback',model,'structured',{'policy_question':w['policy_question'],'claims':display,'round2':initial},words,len(selected))
            else:feedback=None
            # Exposed source IDs, counted once; narrative-only arm does not leak its audit.
            shown=feedback['narrative'] if arm=='structured' else feedback
            exposed=set(re.findall(r'\bS\d+\b',str(shown))) if shown else set()
            controlled_exposed=set()
            if mode=='controlled' and shown:
                # An ID alone does not reveal its hidden likelihood ratio. Require an
                # explicitly transmitted source/ratio pair matching the constructed item.
                for sid,value in re.findall(r'(S\d+): likelihood ratio ([0-9.eE+\-]+)',str(shown)):
                    source=next((s for s in w['sources'] if s['id']==sid),None)
                    if source and source.get('likelihood_ratio') is not None and abs(float(value.rstrip('.'))-source['likelihood_ratio'])<1e-8:controlled_exposed.add(sid)
            def respond(pair):
                p,r=pair;private_ids={s['id'] for s in p['private']['private_evidence']}
                computed=probabilities(w,private_ids|controlled_exposed,selected) if mode=='controlled' else None
                payload={'participant_id':p['participant_id'],'claims':display,'private_evidence':p['private']['private_evidence'],'earlier_answers':r['answers'],'feedback':shown,'computed_probabilities':computed}
                out=client.call(key+'/'+p['participant_id'],participant_model,PROMPT,payload,max_tokens=4500,schema=obj({"answers":array(ANSWER)}))
                answers=out['answers'];assert len(answers)==len(selected) and {a['claim_id'] for a in answers}==ids
                old={a['claim_id']:a for a in r['answers']}
                for a in answers:
                    assert a['stance'] in ('support','oppose','insufficient_evidence') and 0<=a['confidence']<=100
                    assert set(a['source_ids'])<=(private_ids|exposed)
                    c=next(c for c in selected if c['id']==a['claim_id'])
                    if c['type']=='normative':assert a['probability'] is None and a['stance']==old[a['claim_id']]['stance']
                    else:assert 0<=a['probability']<=1
                    if computed:assert abs(a['probability']-computed[a['claim_id']])<1e-7
                return {**p,'realised':{**p['realised'],'round3':answers}}
            people=client.parallel(respond,list(zip(panel['people'],initial)))
            final_table=reference(w,people,3,ids)
            material={'policy_question':w['policy_question'],'claims':display,'round2':initial,'round3':[{'participant_id':p['participant_id'],'answers':p['realised']['round3']} for p in people]}
            output=summarise(client,key+'/final',model,'symphonia' if arm=='symphonia' else 'reference_fed' if arm=='exact' else 'structured',material,words,len(selected),final_table)
            labels=score(client,key,final_table,output)
            readers=decisions(client,key,w,output)
            initial_brier=mean(r['uncertainty']['brier'] for r in table if r['uncertainty']['brier'] is not None)
            final_brier=mean(r['uncertainty']['brier'] for r in final_table if r['uncertainty']['brier'] is not None)
            arms.append({'arm':arm,'status':'complete','feedback':shown,'initial':initial,'people':people,'reference':final_table,'output':output,'scores':labels,'decisions':readers,'initial_brier':initial_brier,'final_brier':final_brier})
        except Exception as exc:
            if 'Operational spend cap' in str(exc):raise
            arms.append({'arm':arm,'status':'failed','error_type':type(exc).__name__,'error':str(exc)[:500]})
        client.store.put('interactive/'+digest(prefix)+'.json',record)
    record['status']='finished'
    return client.store.put('interactive/'+digest(prefix)+'.json',record)
