"""Known-error benchmark kept separate from study scenarios."""
from .client import digest
JUDGE_PROMPT='''You are a blinded semantic evaluator. Compare each candidate with its reference. Judge factual fidelity, not writing style. A candidate must retain consequential qualifications and minority warnings. For each item return {id, errors:[{claim_id,type,reference_span,candidate_span}]}. Allowed types and definitions: polarity = direction of an EMPIRICAL EFFECT reversed; condition = population/time/eligibility qualifier removed; support = participant VOTE COUNTS or panel-consensus direction altered (even when most support becomes most oppose, this is support, not polarity); source = invented or changed evidence SOURCE IDs; minority = consequential minority warning omitted. An entirely missing C3 warning is minority. Classify invented extra sources as source, not condition. Report the affected C1/C2/C3 ID. Missing text uses an empty candidate_span. Return an empty errors list for meaning-preserving edits. Different words alone are NOT errors. Verify a difference in the proposition, source identity, numerical support or substantive warning before flagging it. Return JSON {items:[...]}. Do not infer errors from output length or item order.'''

def cases():
    result=[]
    for i in range(100):
        n=8+(i%9)*4;k=n//4;place=f'Town {i+1501}';effect=9+(i*7)%23;duration=4+i%5
        reference=(f'C1: In {place}, the intervention increased attendance by {effect} percentage points among enrolled pupils over {duration} terms, only when transport was provided. This finding comes from source S{i+1}. '
                   f'C2: {k} of {n} participants support universal rollout, {n-k} oppose it. '
                   'C3: One participant cites a reliable subgroup audit showing harm to pupils with mobility impairments; exclude that subgroup from universal rollout.')
        typ=['polarity','condition','support','source','minority'][i%5]
        corrupt=reference
        cid={'polarity':'C1','condition':'C1','support':'C2','source':'C1','minority':'C3'}[typ]
        if typ=='polarity':corrupt=corrupt.replace('increased attendance','decreased attendance')
        if typ=='condition':corrupt=corrupt.replace(', only when transport was provided','')
        if typ=='support':corrupt=corrupt.replace(f'{k} of {n} participants support universal rollout, {n-k} oppose it',f'All {n} participants support universal rollout; none oppose it')
        if typ=='source':corrupt=corrupt.replace(f'source S{i+1}',f'sources S{i+1} and S{i+1001}')
        if typ=='minority':corrupt=corrupt[:corrupt.index('C3:')].strip()
        preserving=reference.replace('increased attendance by', 'raised attendance by').replace('only when transport was provided','only where transport was provided').replace('comes from source','is documented in source').replace('One participant cites','A single participant cites')
        result.extend([{'id':f'K{i*2+1:03d}','reference':reference,'candidate':corrupt,'expected_type':typ,'expected_claim':cid,'corrupted':True},
                       {'id':f'K{i*2+2:03d}','reference':reference,'candidate':preserving,'expected_type':typ,'expected_claim':cid,'corrupted':False}])
    import random
    random.Random(190426).shuffle(result)
    return result

def run(client,models):
    material=cases();client.store.put('calibration/cases-v4.json',material)
    tasks=[(model,i,material[i:i+10]) for model in models for i in range(0,len(material),10)]
    def score(task):
        model,i,batch=task
        out=client.call(f'calibration/v4/{model}/{i}',model,JUDGE_PROMPT,{'items':[{k:c[k] for k in ('id','reference','candidate')} for c in batch]},max_tokens=5500)
        items=out.get('items',[])
        if len(items)!=len(batch) or {x['id'] for x in items}!={x['id'] for x in batch}:raise ValueError('Incomplete calibration labels')
        return model,items
    outputs=client.parallel(score,tasks)
    scores=[]
    for model in models:
        predictions={x['id']:x for m,batch in outputs if m==model for x in batch}
        errors=[]
        for c in material:
            es=predictions[c['id']]['errors']
            detected=any(e.get('type')==c['expected_type'] and e.get('claim_id')==c['expected_claim'] for e in es)
            errors.append({'id':c['id'],'type':c['expected_type'],'corrupted':c['corrupted'],'detected':detected,'false_positive':bool(es) and not c['corrupted'],'evaluation':predictions[c['id']]})
        tp=sum(x['detected'] for x in errors if x['corrupted']);fp=sum(x['false_positive'] for x in errors)
        by_type={t:{'sensitivity':sum(x['detected'] for x in errors if x['corrupted'] and x['type']==t)/20,
                     'false_positive_rate':sum(x['false_positive'] for x in errors if x['type']==t)/20} for t in ('polarity','condition','support','source','minority')}
        scores.append({'model':model,'sensitivity':tp/100,'false_positive_rate':fp/100,'accepted':tp>=90 and fp<=5,'by_type':by_type,'labels':errors})
    client.store.put('calibration/results-v4.json',{'version':4,'models':scores,'accepted':all(x['accepted'] for x in scores)})
    return client.store.put('calibration/results.json',{'version':4,'acceptance':{'sensitivity':0.9,'false_positive_rate':0.05},'models':scores,'accepted':all(x['accepted'] for x in scores)})
