"""Frozen product path, explicit common export adapter, and comparison methods."""
import html,json,re
from pathlib import Path
from typing import Any
from .reference import reference
from .client import digest
from .schemas import SUMMARY,ALIGNMENT
SNAPSHOT=json.loads((Path(__file__).parent/'platform_snapshot.json').read_text())
_namespace={'html':html,'json':json,'re':re,'Any':Any}
exec('\n\n'.join(SNAPSHOT['functions'].values()),_namespace)
COMMON='''Summarise only the eligible transcript within the specified word limit. Return JSON {narrative, audit:[{text,counts:[support,oppose,insufficient_evidence] or null,conditions,evidential_status,source_ids,mean_probability,mean_individual_entropy,between_participant_dispersion}]}. Include at most the specified audit_rows rows, each at most 100 words. Unknown numeric values must be null, never guessed. Count distinct participants, not mentions; missing is not insufficient evidence. Audit rows must be atomic. Preserve supported minority qualifications without endorsing unsupported claims. Distinguish confidence from truth and uncertainty from disagreement. No external evidence or hidden reference information. Narrative and audit will be evaluated independently. Narrative is the only input to decision readers.'''
STRUCTURED='Explicitly cover agreement, dissent, uncertainty, conditions, confidence and provenance. Preserve all those distinctions even if inconvenient.'

def clean_reference(table):
    result=[]
    for row in table:
        result.append({k:({a:b for a,b in v.items() if a!='brier'} if k=='uncertainty' else v)
                       for k,v in row.items() if k not in ('critical','truth')})
    return result

def openings(panel):return [{'participant_id':p['participant_id'],'text':p['realised']['opening']} for p in panel['people']]

def transcript(w,panel,round_number=3):
    return {'policy_question':w['policy_question'],'opening':openings(panel),'claims':[{'id':c['id'],'text':c['text'],'type':c['type']} for c in w['claims']],
            'rounds':{str(r):[{'participant_id':p['participant_id'],'answers':p['realised'][f'round{r}']} for p in panel['people']] for r in range(2,round_number+1)}}

def native(client,run_id,model,question,material,questions_override=None,responses_override=None):
    responses=[{'email':r.get('participant_id',f'P{i+1}'),'answers':{'q1':{'position':r.get('text',json.dumps(r,ensure_ascii=False))}}} for i,r in enumerate(material)]
    questions=questions_override or [question]
    responses=responses_override if responses_override is not None else responses
    text=_namespace['_format_custom_synthesis_material'](questions,responses)
    # This is the exact product's baseline prompt, parameters and formatter, frozen to the deployed dev commit.
    prompt='Synthesis instruction:\n'+SNAPSHOT['baseline_prompt']+'\n\nUse only the consultation material below. Preserve disagreement and uncertainty. Do not invent evidence or consensus.\n\n'+text
    raw=client.call(run_id+'/native',model,'You are an expert facilitator writing custom syntheses of structured consultation responses.',prompt,max_tokens=2500,temperature=0.2,json_mode=False)
    formatted=_namespace['_format_custom_claim_list'](raw,questions=questions,response_dicts=responses)
    return {'raw':raw,'html':formatted,'source_commit':SNAPSHOT['commit']}

def extract_native_claims(formatted):
    # Mirrors the rendered p/strong claim path used by extractDelphiClaims; no gold IDs supplied.
    claims=[]
    for paragraph in re.findall(r'<p\b[^>]*>(.*?)</p>',formatted,re.S|re.I):
        line=html.unescape(re.sub('<[^>]+>','',paragraph)).strip()
        m=re.match(r'^\S*\s*Claim\s+(\d+)\s*:',line,re.I)
        if not m:continue
        strong=re.search(r'<strong\b[^>]*>(.*?)</strong>',paragraph,re.S|re.I)
        text=html.unescape(re.sub('<[^>]+>','',strong.group(1))).strip() if strong else re.sub(r'^\S*\s*Claim\s+\d+\s*:\s*','',line,flags=re.I).strip()
        if text and not any(c['text']==text and c['id']=='D'+m[1] for c in claims):claims.append({'id':'D'+m[1],'text':text})
    return claims

def extract(client,run_id,model,method,w,panel):
    if method=='symphonia':
        raw=native(client,run_id,model,w['policy_question'],openings(panel))
        return {'claims':extract_native_claims(raw['html']),'native':raw}
    if method=='reference_fed':
        # Diagnostic exact realised opening mentions, not unexpressed assignments.
        expressed=set()
        for m,out in panel['validation']+panel['repair_validation']:
            for p in out['participants']:expressed.update(p['expressed_claim_ids'])
        return {'claims':[{'id':'D'+str(i+1),'text':c['text']} for i,c in enumerate(w['claims']) if c['id'] in expressed]}
    instruction='Extract the atomic propositions actually expressed in these independent contributions. Do not infer consensus from mention frequency. No gold list exists in your inputs. Preserve population, conditions and timeframe. Return JSON {claims:[{id:D1...,text}]}.'
    if method in ('structured','staged'):instruction+=' '+STRUCTURED
    return client.call(run_id+'/extraction',model,instruction,{'question':w['policy_question'],'contributions':openings(panel)},max_tokens=4500)

ALIGN='''Align anonymous displayed propositions to reference propositions by meaning, including population, condition and timeframe. Return JSON {alignments:[{display_id,reference_ids,relation,reason}]}. One row for every displayed ID. relation is exact/split/merge/changed/new. Use exact only when one whole proposition is semantically equivalent; missing or added conditions are changed. Never match on ID or superficial wording. Split/merged propositions must retain all reference links. These results control vote replay: mismatches must not receive reference votes.'''

def align(client,run_id,claims,w,judges):
    source=[{'id':c['id'],'text':c['text'],'conditions':c['conditions']} for c in w['claims']]
    all_labels=[client.call(run_id+'/align/'+m,m,ALIGN,{'reference':source,'displayed':claims},max_tokens=4500,schema=ALIGNMENT) for m in judges]
    mapping={}
    for c in claims:
        labels=[next((x for x in out['alignments'] if x['display_id']==c['id']),{}) for out in all_labels]
        matches=[x.get('reference_ids',[None])[0] for x in labels if x.get('relation')=='exact' and len(x.get('reference_ids',[]))==1]
        for rid in set(matches):
            if matches.count(rid)>=2 and rid in {x['id'] for x in source}:mapping[c['id']]=rid
    return {'mapping':mapping,'evaluations':all_labels}

def replay(panel,claims,mapping,r):
    rows=[]
    for p in panel['people']:
        byid={x['claim_id']:x for x in p['realised'][f'round{r}']}
        answers=[]
        for c in claims:
            reference_id=mapping.get(c['id'])
            if reference_id in byid:answers.append({**byid[reference_id],'claim_id':c['id']})
            else:answers.append({'claim_id':c['id'],'stance':None,'reason':'cannot evaluate as stated','confidence':None,'source_ids':[],'probability':None})
        rows.append({'participant_id':p['participant_id'],'answers':answers})
    return rows

def fixed_feedback(claims,rows,omit_confidence=False,omit_provenance=False):
    result=[]
    for c in claims:
        answers=[a for p in rows for a in p['answers'] if a['claim_id']==c['id']]
        counts=[sum(a['stance']==s for a in answers) for s in ('support','oppose','insufficient_evidence')]
        comments=[{k:v for k,v in a.items() if k!='claim_id' and not(omit_confidence and k=='confidence') and not(omit_provenance and k=='source_ids')} for a in answers]
        result.append({'id':c['id'],'text':c['text'],'counts':counts,'answered':sum(counts),'missing':len(answers)-sum(counts),
                       'instruction':'Review the other participants’ reasoning, then rate this same claim again. You do not need to change your mind.','reasons':comments})
    return result

def summarise(client,run_id,model,method,material,words=500,rows=15,exact_table=None,budget=None):
    source=material;intermediates=[]
    if method=='staged':
        extracted=client.call(run_id+'/stage-extract',model,'Extract atomic claims preserving conditions from eligible material. Return JSON {claims:[{text,conditions,source_ids}]}',source,max_tokens=3500)
        aggregate=client.call(run_id+'/stage-aggregate',model,'Aggregate unique participant positions for each extracted proposition using only the transcript. Return JSON {claims:[{text,counts,conditions,evidential_status,source_ids}]}. Missing values null. Do not guess.',{'claims':extracted,'transcript':material},max_tokens=4500)
        intermediates=[extracted,aggregate];source=aggregate
    elif method=='symphonia':
        questions,responses=product_inputs(material)
        product=native(client,run_id,model,material.get('policy_question','Summarise the policy evidence') if isinstance(material,dict) else 'Summarise the policy evidence',[],questions,responses)
        intermediates=[product];source={'native_product_synthesis':product['html']}
    elif method=='reference_fed':source={'eligible_exact_table':clean_reference(exact_table or []),'eligible_material':material}
    instruction=COMMON+(' '+STRUCTURED if method=='structured' else '')
    if method=='symphonia':instruction+=' This is a common export adapter for the native product synthesis. Preserve its information and errors; do not reconstruct lost information or add external material.'
    result=client.call(run_id+'/summary',model,instruction,{'word_limit':words,'audit_rows':rows,'eligible':source},max_tokens=6000,schema=SUMMARY)
    result['intermediates']=intermediates;result['narrative_word_count']=len(result['narrative'].split())
    result['word_limit_exceeded']=result['narrative_word_count']>words
    result['audit_row_limit_exceeded']=len(result['audit'])>rows
    result['audit_character_count']=len(json.dumps(result['audit'],ensure_ascii=False))
    return result


def product_inputs(material):
    """Use real question/participant fields so the native formatter can reconcile votes.

    The transcript-isolation instrument puts earlier rounds in an opening-context
    field and final evaluations in native rating/reason fields. It does not
    collapse respondents into one synthetic respondent.
    """
    if not isinstance(material,dict) or not material.get('claims'):
        return ['Eligible material'],[{'email':'Transcript','answers':{'q1':{'position':json.dumps(material,ensure_ascii=False)}}}]
    claims=material['claims'];questions=['Earlier-round context']
    for i,c in enumerate(claims):
        questions.extend([{'label':'Your response','sectionTitle':f'Claim {i+1}: {c["text"]}','inputType':'single_select','options':['Agree','Disagree','Unable to judge — need more information']},
                          {'label':'Explain your position','sectionTitle':f'Claim {i+1}: {c["text"]}','inputType':'textarea'}])
    rounds=material.get('rounds',{})
    current=material.get('round3') or rounds.get('3') or material.get('round2') or rounds.get('2') or []
    previous=material.get('round2') or rounds.get('2') or []
    opening=material.get('opening',[])
    rows=[]
    for participant in current:
        pid=participant['participant_id'];values={a['claim_id']:a for a in participant['answers']}
        context={'opening':[o['text'] for o in opening if o['participant_id']==pid],
                 'round2':[o['answers'] for o in previous if o['participant_id']==pid]}
        answers={'q1':{'position':json.dumps(context,ensure_ascii=False)}}
        for i,c in enumerate(claims):
            a=values.get(c['id'],{})
            answers[f'q{2*i+2}']={'position':{'support':'Agree','oppose':'Disagree','insufficient_evidence':'Unable to judge — need more information'}.get(a.get('stance'),'cannot evaluate as stated')}
            answers[f'q{2*i+3}']={'position':json.dumps({k:v for k,v in a.items() if k not in ('claim_id','stance')},ensure_ascii=False)}
        rows.append({'email':pid,'answers':answers})
    return questions,rows
