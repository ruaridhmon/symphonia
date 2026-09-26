"""Generate and validate private fictional worlds and realised participants."""
import random
from .client import digest,CallFailure
from .schemas import OPENING,JUDGMENTS,VALIDATION
from .scoring import panel_status,uncertainty
SETTINGS=['school attendance support','school inclusion','school health hubs','preventive healthcare','youth diversion','support after release from custody']
FEATURES=['supported','opposed','confident_disagreement','insufficient_evidence','consequential_minority','unsupported_minority','context','shared_source','popular_falsehood','normative']
WORLD_PROMPT='''Create a completely fictional policy evidence map for a synthetic experiment. No external facts. Return JSON with policy_question, place, claims (exactly requested count), sources, numerical_checks, decision. Each claim is one atomic proposition with explicit population, qualifying condition and timeframe. Claim fields: id (C1...), text, type (factual or normative), truth (0,1,null; normative/unresolved MUST be null), conditions (text), evidential_status (supported/opposed/unresolved/normative), features (from requested feature set), source_ids. Every requested feature must occur. Include a clearly true and a clearly false claim, confident high-confidence disagreement, unresolved evidence, a consequential supported minority qualification, unsupported dissent that is not established fact, different-population apparent contradictions, shared sources, a popular false empirical claim and a normative disagreement. Critical minority qualification must change the best policy option. Use a distinct evidence graph from other seeds, not just new names or paraphrases. Source fields: id S1..., text containing all eligible evidence, quality (reliable/weak), claim_ids, likelihood_ratio (positive numeric or null; a constructed independent evidence update for the source's first factual claim). Include at least 8 sources. Graph variation must affect which sources support, contradict or qualify which propositions. Numerical_checks: [{a:number,b:number,difference:a-b,description}]; every numeric empirical assertion must be supported by a source; avoid unsupported arithmetic. decision: {objective,critical_claim_ids,losses:{universal_rollout:number,targeted_rollout:number,defer:number},weak_warning_claim_ids}. Losses are synthetic benchmark units, never empirical estimates. Hidden truth, feature tags, decision losses and critical labels will never be shown to participants or summarising methods.'''

def validate_world(w,count):
    cs=w['claims'];ss=w['sources'];ids={c['id'] for c in cs};sids={s['id'] for s in ss}
    assert len(cs)==count and len(ids)==count and len(sids)==len(ss)>=8
    assert set(FEATURES)<=set(f for c in cs for f in c['features']), "Missing required scenario features"
    assert all(c['type'] in ('factual','normative') and c['truth'] in (0,1,None) for c in cs)
    assert all(c['truth'] is None for c in cs if c['type']=='normative' or c['evidential_status']=='unresolved')
    assert all(set(c['source_ids'])<=sids and c['text'] and c['conditions'] for c in cs)
    assert all(set(s['claim_ids'])<=ids and s['quality'] in ('reliable','weak') for s in ss)
    assert all(s.get('likelihood_ratio') is None or s['likelihood_ratio']>0 for s in ss)
    assert all(abs(n['a']-n['b']-n['difference'])<1e-7 for n in w['numerical_checks'])
    assert set(w['decision']['critical_claim_ids'])<=ids and w['decision']['critical_claim_ids']
    assert set(w['decision']['losses'])=={'universal_rollout','targeted_rollout','defer'}
    assert all(isinstance(v,(int,float)) and v>=0 for v in w['decision']['losses'].values())
    assert any(c['truth']==0 for c in cs) and any(c['truth']==1 for c in cs)

def world(client,phase,index,count=15):
    setting=SETTINGS[index%6];map_id=f'{phase}-{index:03d}'
    path='reference/'+map_id+'.json';saved=client.store.get(path)
    if saved:return saved
    failures=[]
    for repair in range(2):
        w=client.call(f'{map_id}/world/{repair}','anthropic/claude-sonnet-4.6',WORLD_PROMPT,
                      {'setting':setting,'seed':260926+index+(0 if phase=='pilot' else 10000),'claim_count':count,'features':FEATURES,
                       'graph_constraints':{'sources':8+(index%7),'cross_claim_links':2+(index%6),'independent_groups':2+(index%4),
                                            'qualifier_position':(index*7)%count,'confounding_structure':['selection','population interaction','time lag','measurement reliability','resource competition','source dependence'][index%6]},
                       'prior_validation_failures':failures},max_tokens=11000)
        try:validate_world(w,count)
        except (AssertionError,KeyError,TypeError,ValueError) as exc:
            failures.append({'attempt':repair,'error':type(exc).__name__});continue
        w.update(map_id=map_id,phase=phase,policy_setting=setting,generation_failures=failures)
        w['graph_signature']=digest([(s['id'],s['claim_ids'],s['quality']) for s in w['sources']])
        return client.store.put(path,w)
    raise CallFailure('World rejected after one repair: '+map_id)

PARTICIPANT_PROMPT='''You are one fictional participant in a policy exercise, in a fresh isolated context. Use only your private evidence and assigned stances. Never refer to peers or claim hidden truth. Return JSON {opening,expressed_claim_ids,round2,round3}. Opening: 150-250 words expressing the selected opening claims, assigned positions and relevant qualifications in the requested style/order; cite source IDs, invent no sources or facts. Do not express claims outside your assignments. round2 and round3: EACH must contain one row for EVERY proposition in assigned, NOT only opening_claim_ids. They must EACH include all 15 assigned IDs (or all requested IDs for a stress test), including propositions not mentioned in the opening. For absent private evidence use insufficient_evidence. Each row: {claim_id,stance,confidence,reason,source_ids,probability}. Stance is support/oppose/insufficient_evidence, confidence 0..100; probability MUST be a NUMBER 0..1 for EVERY factual claim, including insufficient-evidence stances; state your own probability under limited evidence. Probability MUST be JSON null for EVERY normative claim. See normative_claim_ids and factual_claim_ids. Confidence is confidence in the stated stance, not a substitute for probability of truth. Reasons should be short but specific (at most 16 words). Honour round-specific assigned stances; any change must be explained using the private additional evidence. Assigned stances are participant BELIEFS and may deliberately be mistaken or conflict with the evidence. Faithfully express the assigned belief rather than correcting it. You may acknowledge conflicting observations and still retain the assigned belief; never invent evidence to justify it. You are generating fixed reference judgments before any tested processing method sees them. Do not claim peer feedback caused the changes. Return actual natural-language content and the requested structured rows.'''

def add_belief_sources(w):
    """Construct explicitly weak, possibly erroneous reports as private evidence.

    False beliefs need an available misleading source, not a demand that a model
    deny an accurate measurement it was shown. Hidden truth stays in the world.
    """
    for j,c in enumerate(w['claims']):
        if c['type']!='factual':continue
        for direction in ('support','oppose'):
            sid=f'S{900+2*j+(direction=="oppose")}'
            if any(s['id']==sid for s in w['sources']):continue
            statement=c['text'] if direction=='support' else 'The following proposition is disputed as false: '+c['text']
            w['sources'].append({'id':sid,'text':'An unverified local report states: '+statement+' This account has not been independently checked.',
                                 'quality':'weak','claim_ids':[c['id']],'likelihood_ratio':1.1 if direction=='support' else 1/1.1,
                                 'construction':'prespecified misleading-private-report control; not independent verification'})
    w['private_packet_design']='Conflicting assigned beliefs receive explicit weak reports; original contradictory source material is withheld from those private packets.'


def packet(w,n,i):
    rng=random.Random(digest([w['map_id'],n,i]));claims=w['claims'];assigned=[]
    # Claim-specific shuffled identities avoid confounding minority views with style or order.
    for j,c in enumerate(claims):
        order=list(range(n));random.Random(digest([w['map_id'],n,c['id']])).shuffle(order);rank=order.index(i);f=c['features']
        if 'consequential_minority' in f:stance='support' if rank<max(1,n//8) else 'insufficient_evidence'
        elif 'unsupported_minority' in f:stance='support' if rank<max(1,n//8) else 'oppose'
        elif 'confident_disagreement' in f or 'normative' in f:stance='support' if rank<n//2 else 'oppose'
        elif 'insufficient_evidence' in f:stance='insufficient_evidence'
        elif 'popular_falsehood' in f:stance='support' if rank<int(n*.875) else 'oppose'
        elif 'opposed' in f:stance='oppose'
        else:stance='oppose' if c['evidential_status']=='opposed' else 'insufficient_evidence' if c['evidential_status']=='unresolved' else 'support'
        given=c['source_ids'] if not ('consequential_minority' in f and stance!='support') else []
        # Prespecified evidence-justified change: previously unresolved claim, if reliable additional evidence exists.
        additional=[]
        stance3=stance
        if j==1 and i%4==0 and c['type']=='factual' and c['evidential_status'] in ('supported','opposed') and 'popular_falsehood' not in f:
            stance='insufficient_evidence';stance3='support' if c['evidential_status']=='supported' else 'oppose'
            additional=given;given=[]
        assigned.append({'id':c['id'],'text':c['text'],'type':c['type'],'conditions':c['conditions'],'round2_stance':stance,'round3_stance':stance3,'source_ids':given,'additional_source_ids':additional})
    withheld={sid for c in claims if 'consequential_minority' in c['features']
              and next(a for a in assigned if a['id']==c['id'])['round2_stance']!='support' for sid in c['source_ids']}
    for a in assigned:
        a['source_ids']=[s for s in a['source_ids'] if s not in withheld]
        a['additional_source_ids']=[s for s in a['additional_source_ids'] if s not in withheld]
        if a['type']=='factual' and not a['source_ids']:
            a['round2_stance']='insufficient_evidence'
            if not a['additional_source_ids']:a['round3_stance']='insufficient_evidence'
    # Do not require a model to falsify a measurement it has directly received.
    contradictory=set()
    for j,(a,c) in enumerate(zip(assigned,claims)):
        if c['type']=='factual' and c['truth'] in (0,1) and a['round2_stance'] in ('support','oppose'):
            truth_stance='support' if c['truth']==1 else 'oppose'
            if a['round2_stance']!=truth_stance:
                contradictory.update(c['source_ids'])
                a['source_ids']=[f'S{900+2*j+(a["round2_stance"]=="oppose")}']
                a['belief_instruction']='This is your personal belief based on the supplied unverified report. Acknowledge the weak evidential status; do not invent corroboration.'
        if 'confident_disagreement' in c['features']:
            a['confidence_instruction']='Your assigned personal conviction is high (80-100). This is confidence in your belief, not a claim that the evidence is reliable.'
    for a in assigned:
        a['source_ids']=[s for s in a['source_ids'] if s not in contradictory]
        a['additional_source_ids']=[s for s in a['additional_source_ids'] if s not in contradictory]
        if a['type']=='factual' and not a['source_ids']:
            a['round2_stance']='insufficient_evidence'
            if not a['additional_source_ids']:a['round3_stance']='insufficient_evidence'
    sid={s for c in assigned for s in c['source_ids']};more={s for c in assigned for s in c['additional_source_ids']}
    # Six opening mentions with rotating coverage; supporters always mention the consequential observation.
    opening={claims[(i*3+j)%len(claims)]['id'] for j in range(6)}
    opening.update(c['id'] for c in assigned if c['round2_stance']=='support' and 'consequential_minority' in next(z for z in claims if z['id']==c['id'])['features'])
    ids=list(opening);rng.shuffle(ids)
    return {'participant_id':f'P{i+1:03d}','policy_question':w['policy_question'],'assigned':assigned,
            'private_evidence':[{k:s[k] for k in ('id','text','quality')} for s in w['sources'] if s['id'] in sid],
            'round3_additional_evidence':[{k:s[k] for k in ('id','text','quality')} for s in w['sources'] if s['id'] in more],
            'factual_claim_ids':[c['id'] for c in assigned if c['type']=='factual'],'normative_claim_ids':[c['id'] for c in assigned if c['type']=='normative'],'round_claim_ids':[c['id'] for c in assigned],'opening_claim_ids':ids,'style':['plain direct prose','careful analytical prose','practical narrative','concise policy memo'][rng.randrange(4)]}

def validate_participant(p,private):
    assert 150<=len(p['opening'].split())<=250, f'Opening is {len(p["opening"].split())} words; must be 150-250, aim 180.'
    cs={c['id']:c for c in private['assigned']};sids={s['id'] for s in private['private_evidence']};more={s['id'] for s in private['round3_additional_evidence']}
    assert set(p['expressed_claim_ids'])<=set(cs)
    for r in (2,3):
        rows=p[f'round{r}'];assert len(rows)==len(cs) and {x['claim_id'] for x in rows}==set(cs)
        for row in rows:
            assert row['stance'] in ('support','oppose','insufficient_evidence')
            assert row['stance']==cs[row['claim_id']][f'round{r}_stance']
            assert 0<=row['confidence']<=100 and row['reason']
            assert set(row['source_ids'])<=(sids | (more if r==3 else set()))
            c=cs[row['claim_id']]
            assert row['probability'] is None if c['type']=='normative' else isinstance(row['probability'],(int,float)) and 0<=row['probability']<=1

VALIDATOR_PROMPT='''Output ONLY the requested JSON object. NO preamble, markdown or reasoning outside JSON. Keep each error list to at most three concise evidence-based errors. Validate each fictional participant against their own private assignments/evidence only. Never use outside knowledge. Opening must express selected assignments without inventing facts or sources. Insufficient evidence can and should be expressed; it is not an invalid stance. Participants need not cite every assigned source. A supported proposition may itself be a criticism of an intervention; judge stance relative to its wording, not generic pro-policy sentiment; round judgments must preserve assigned stances and reasons must be supported by available private evidence, with round-three additions unavailable in round two. Return JSON {participants:[{participant_id,valid:true/false/null,expressed_claim_ids:[IDs actually expressed in opening],invented_evidence:[exact spans],assignment_errors:[specific issue],ambiguous_fields:[specific issue]}]}. A disagreement with a private assignment or explicit invented evidence is false. Deliberately mistaken assigned beliefs are valid when expressed as beliefs; do not reject them for disagreeing with sources, provided the participant does not falsify an observation or invent evidence. Use null for genuinely ambiguous semantic matters; do not force agreement. Evaluate each participant separately.'''

def panel(client,w,n,model='openai/gpt-4.1'):
    add_belief_sources(w)
    client.store.put('reference/'+w['map_id']+'.json',w)
    name=f'participants/{w["map_id"]}-{n}-{model.replace("/","_")}-v8.json'
    cached=client.store.get(name)
    if cached:
        return client.store.put(name,reconcile_validation(cached))
    def generate(i,repair=0,feedback=None):
        private=packet(w,n,i);pid=f'{w["map_id"]}/{n}/{model}/participant-v8/P{i+1}'
        for attempt in range(repair,2):
            try:
                opening_packet={**private,'assigned':[a for a in private['assigned'] if a['id'] in private['opening_claim_ids']]}
                opening_packet['correction_feedback']=feedback
                opening=client.call(pid+f'/opening/{attempt}',model,'Return ONLY JSON {opening,expressed_claim_ids}. You are one fictional participant. Aim for 180 whitespace-separated words, with a hard maximum of 230 and minimum of 150. Use compact shared context rather than repeating scope in every sentence. Write on exactly the supplied opening_claim_ids, expressing the assigned round2 stance for each and its conditions. Use only the private evidence. Insufficient evidence is a stance to express, not agreement or opposition. Supporting a claim means affirming its proposition, even if the proposition itself opposes an intervention. Do not assert unobserved facts. Do not describe other participants. You may cite any relevant supplied sources without needing to cite every source. Use the requested style. Assigned stances may deliberately be mistaken beliefs; express them as personal beliefs without changing them or inventing evidence. If evidence conflicts, acknowledge it while retaining the assigned belief.',opening_packet,max_tokens=1400,schema=OPENING)
                judgments=client.call(pid+f'/judgments/{attempt}',model,'Return ONLY JSON {round2,round3}. '+PARTICIPANT_PROMPT+' Do not return an opening in this call. Each round MUST contain one row for each of round_claim_ids; copy the exact assigned round-specific stance. State probability for factual claims even when evidence is insufficient. The explicit round2_stance and round3_stance fields are authoritative BELIEF assignments: copy them even if sources contradict the claim; acknowledge conflicting observations in the reason without silently changing the assigned belief.',{**private,'correction_feedback':feedback},max_tokens=6500,schema=JUDGMENTS)
                p={**opening,**{k:judgments[k] for k in ('round2','round3')}}
                validate_participant(p,private)
                return {'participant_id':private['participant_id'],'private':private,'realised':p,'generation_attempt':attempt}
            except (AssertionError,KeyError,TypeError,ValueError,CallFailure) as exc:
                feedback=['Correct this validation error in the single allowed regeneration: '+str(exc)]
                if attempt==1:raise CallFailure('Participant failed validation after regeneration: '+pid)
    people=client.parallel(generate,range(n))
    validators=['anthropic/claude-sonnet-4.6','google/gemini-2.5-flash']
    def validate(people,iteration):
        tasks=[(m,start,people[start:start+4]) for m in validators for start in range(0,len(people),4)]
        def one(t):
            m,start,b=t
            return m,client.call(f'{w["map_id"]}/{n}/{model}/validate-v8/{iteration}/{m}/{start}',m,VALIDATOR_PROMPT,{'participants':b},max_tokens=8000,schema=VALIDATION)
        return client.parallel(one,tasks)
    labels=validate(people,0)
    def rejected(labels):
        votes={}
        for m,out in labels:
            for p in out['participants']:votes.setdefault(p['participant_id'],[]).append(p['valid'])
        return {pid for pid,vs in votes.items() if len(vs)==2 and all(v is False for v in vs)}
    bad=rejected(labels)
    repaired=[]
    for i,p in enumerate(people):
        if p['participant_id'] in bad and p['generation_attempt']==0:
            feedback=[x for m,o in labels for x in o['participants'] if x['participant_id']==p['participant_id']]
            people[i]=generate(i,1,feedback);repaired.append(people[i])
    final_labels=validate(repaired,1) if repaired else []
    final_bad=(bad-{p['participant_id'] for p in repaired})|rejected(final_labels)
    result={'map_id':w['map_id'],'n':n,'model':model,'people':people,'validation':labels,'repair_validation':final_labels,'rejected_participants':sorted(final_bad),'validated':not final_bad}
    return client.store.put(name,reconcile_validation(result))

def reference(w,people,round_number=3,subset=None):
    table=[]
    for c in w['claims']:
        if subset is not None and c['id'] not in subset:continue
        rows=[x for p in people for x in p['realised'][f'round{round_number}'] if x['claim_id']==c['id']]
        counts=[sum(r['stance']==s for r in rows) for s in ('support','oppose','insufficient_evidence')]
        probs=[r['probability'] for r in rows if r.get('probability') is not None]
        eligible_sources={s for r in rows for s in r['source_ids']}
        reliable={s['id'] for s in w['sources'] if s['quality']=='reliable'}
        eligible_status='normative' if c['type']=='normative' else c['evidential_status'] if eligible_sources & reliable & set(c['source_ids']) else 'unresolved'
        table.append({'id':c['id'],'text':c['text'],'conditions':c['text'],'evidential_status':eligible_status,
                      'counts':counts,'panel_size':len(people),'panel_status':panel_status(counts,len(people)),
                      'source_ids':sorted({s for r in rows for s in r['source_ids']}),'uncertainty':uncertainty(probs,c['truth'] if c['type']=='factual' else None),
                      'critical':c['id'] in w['decision']['critical_claim_ids'],'type':c['type'],'truth':c['truth']})
    return table


def accepted_world(client,phase,slot,count=15):
    exclusions=[]
    for replacement in range(5):
        index=slot+120*replacement
        try:
            w=world(client,phase,index,count)
            client.store.put(f'exclusions/{phase}-{slot:03d}.json',{'slot':slot,'selected':w['map_id'],'rejected':exclusions,'rule':'increment candidate seed by 120, retaining policy setting, at most five candidates'})
            return w
        except CallFailure as exc:exclusions.append({'candidate':index,'reason':str(exc)})
    raise CallFailure('No structurally valid world for slot '+str(slot))


def reconcile_validation(panel):
    votes={}
    for model,out in panel['validation']:
        for p in out['participants']:votes.setdefault(p['participant_id'],{})[model]=p['valid']
    for model,out in panel['repair_validation']:
        for p in out['participants']:votes.setdefault(p['participant_id'],{})[model]=p['valid']
    missing=[p['participant_id'] for p in panel['people'] if len(votes.get(p['participant_id'],{}))!=2]
    rejected=[pid for pid,vs in votes.items() if len(vs)==2 and all(v is False for v in vs.values())]
    panel['rejected_participants']=sorted(set(rejected+missing))
    panel['disputed_participants']=sorted(pid for pid,vs in votes.items() if any(v is None for v in vs.values()) or len(set(vs.values()))>1)
    panel['validation_rule']='Both negative semantic evaluations trigger the single regeneration; disagreements or ambiguous fields are retained as disputed. Both evaluations remain available. Numeric and source-ID validation is mandatory.'
    panel['validated']=not panel['rejected_participants']
    return panel
