"""Matched final-round decision diagnostic, separate from complete-transcript A.

All three conditions use the same two propositions, objective, participants and
non-warning evidence. Code changes only availability/strength of one warning.
These are explicitly constructed perturbations of generated text, not fresh LLM
participants or estimates of a complete live consultation.
"""
import copy

def matched(w,p,condition,prevalence=None):
    world=copy.deepcopy(w);panel=copy.deepcopy(p)
    critical=next(c for c in world['claims'] if c['id'] in w['decision']['critical_claim_ids'])
    benefit=next(c for c in world['claims'] if c['type']=='factual' and c['evidential_status']=='supported' and c['id']!=critical['id'] and c['id'] not in w['decision']['weak_warning_claim_ids'])
    world['claims']=[benefit,critical];ids={c['id'] for c in world['claims']}
    world['decision']={'objective':'In this constructed benchmark, deliver the stated established benefit universally unless reliable evidence establishes the stated subgroup qualification; then target rollout to avoid it. Unverified warnings alone do not establish harm. Defer if the benefit is not established.','critical_claim_ids':[critical['id']], 'weak_warning_claim_ids':[critical['id']] if condition=='weak' else [],'losses':{'universal_rollout':100 if condition=='supported' else 0,'targeted_rollout':10,'defer':30}}
    count=prevalence if prevalence is not None else max(1,p['n']//8)
    if condition=='absent':count=0
    donor=next(x for x in p['people'] if any(a['claim_id']==critical['id'] and a['stance']=='support' and a['source_ids'] for a in x['realised']['round3']))
    source_row=copy.deepcopy(next(a for a in donor['realised']['round3'] if a['claim_id']==critical['id']))
    if condition=='weak':
        world['sources'].append({'id':'S8000','text':'Unverified report: '+critical['text'],'quality':'weak','claim_ids':[critical['id']],'likelihood_ratio':None})
        source_row.update(reason='Unverified report S8000 alleges: '+critical['text'],source_ids=['S8000'],confidence=30,probability=.55)
        critical['evidential_status']='unresolved';critical['truth']=None
    for i,person in enumerate(panel['people']):
        person['realised']['opening']=''
        for rnd in (2,3):
            rows=[a for a in person['realised'][f'round{rnd}'] if a['claim_id'] in ids]
            for j,row in enumerate(rows):
                if row['claim_id']==critical['id']:
                    rows[j]=copy.deepcopy(source_row) if i<count else {'claim_id':critical['id'],'stance':'insufficient_evidence','confidence':20,'reason':'No observation supplied for this qualification.','source_ids':[],'probability':.5}
            person['realised'][f'round{rnd}']=rows
    panel.update(transcript_scope='round3_only',perturbation_scope='matched two-claim final-round decision diagnostic',minority_count=count,minority_fraction=count/p['n'],warning_condition=condition)
    return world,panel
