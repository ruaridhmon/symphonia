"""Add 20 authored, fictional Delphi examples to the named dev service. No model calls.
Run --validate first. Private checkpoints stay outside git. --replace-from is restricted
to exact, unchanged authored predecessor fixtures, which are archived before replacement.
"""
import argparse,html,json,sys,time,urllib.request,urllib.parse,urllib.error
from collections import Counter
from concurrent.futures import ThreadPoolExecutor
from threading import Lock
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'backend'))
from core.reasoning import parse_reasoning_output,render_claim_map
BASE='https://symphonia-dev-488613.web.app/api/'
CHECKPOINT=Path('/tmp/symphonia-interesting-source-varied-private.json')
SPECS=json.loads((Path(__file__).parent/'fixtures/interesting-consultations.json').read_text())
POSITIONS=['Agree','Disagree','Unable to judge']
CONFIDENCE=['Not at all confident','Slightly confident','Moderately confident','Very confident','Extremely confident']
PRIORITIES=['independent evaluation','fair access','operational feasibility','the right to refuse','long-term uncertainty','public accountability','the survival of alternatives']

def rating(d,i,j,r=2):
    seed=int(d['key'][-2:])
    if d['_origins'][j]=='inferred':p=POSITIONS[(i+j+seed)%3]
    elif j==d.get('_minority_index'):p='Agree' if i==d['experts']-1 or i%4==0 else 'Disagree'
    elif j==d.get('_alternative_index'):p='Agree' if i%3==0 else ('Unable to judge' if i%3==2 else 'Disagree')
    elif j==d['_main_index']:p=['Agree','Agree','Disagree','Unable to judge','Disagree','Agree'][(i+seed)%6]
    else:p='Unable to judge' if i%5==4 else ('Disagree' if i==d['experts']-1 or (j>1 and (i+j+seed)%5==0) else 'Agree')
    if r==3 and j in (d.get('_alternative_index'),d['_main_index']) and i%4==1:p={'Agree':'Unable to judge','Unable to judge':'Disagree','Disagree':'Agree'}[p]
    return p

def material(d):
    # The source content defines the candidate set. No claim-count target is used.
    base=d['explicit'];main=base[2];alternative=base[3] if len(base)>3 else None;minority=base[4] if len(base)>4 else None
    items=[(t,'explicit') for t in base[:2]+d['additional_claims']]
    if alternative:items.append((alternative,'explicit'))
    if len(d['inferred'])>1:items.append((d['inferred'][1],'inferred'))
    if minority:items.append((minority,'explicit'))
    if d['inferred']:items.append((d['inferred'][0],'inferred'))
    if len(d['inferred'])>2:items.append((d['inferred'][2],'inferred'))
    items.append((main,'explicit'))
    texts=[t for t,_ in items];origins=[o for _,o in items]
    d.update(_texts=texts,_origins=origins,_main_index=texts.index(main),_alternative_index=texts.index(alternative) if alternative else None,_minority_index=texts.index(minority) if minority else None)
    explicit_indices=[j for j,o in enumerate(origins) if o=='explicit']
    slots=2 if d['word_budget']==100 else 3
    assert d['experts']*slots>=len(explicit_indices)
    responses=[];mentions=[]
    for i in range(d['experts']):
        js=[explicit_indices[(i*slots+k)%len(explicit_indices)] for k in range(slots)]
        role=d['roles'][i%3];priority=PRIORITIES[(i+int(d['key'][-2:]))%len(PRIORITIES)]
        statements=[];sources=[]
        for j in js:
            stance=rating(d,i,j);prefix={'Agree':'I support this proposition: ','Disagree':'I oppose this proposition: ','Unable to judge':'I cannot yet judge this proposition: '}[stance]
            statements.append(prefix+texts[j]);sources.append((j,{'response_number':i+1,'quote':texts[j],'stance':{'Agree':'support','Disagree':'oppose','Unable to judge':'uncertain'}[stance]}))
        required=f'Fictional {role.lower()} perspective. '+' '.join(statements)
        assert len(required.split())<=d['word_budget'],(d['key'],i,len(required.split()))
        target=max(len(required.split()),int(d['word_budget']*(.80+.04*(i%5))))
        paragraphs=[
            f'My priority is {priority}. These are judgments about the proposed scenario, not findings from a real study.',
            f'The case I have in mind is that {d["scenario"]}. What would the decision look like to someone who cannot simply leave that arrangement? A persuasive account of the idea is different from an observation of how it works in that setting.',
            f'To assess these propositions, I would {d["test"]}. What outcome would count against the interpretation I currently favour? Which observation would distinguish it from a competing explanation? I do not regard an attractive description of the programme as an answer to those questions.',
            f'From a {role.lower()} perspective, I am asking how {priority} would be assessed. Who would experience the relevant burden, and who would get to describe it? The answer could change my rating without resolving every other aspect of this question.',
            'My confidence is limited because this is an illustrative scenario rather than a supplied empirical evidence base. I have no measured effect size or verified success rate to cite. What evidence from this setting would justify moving from a tentative judgment to a firmer one?',
            f'The competing proposition I take seriously is: {alternative}' if alternative else 'What would a responsible interpretation of the bounded proposal look like in practice?',
            'That comparison leaves questions about scope, timing and the people affected. Which part of the proposal would be examined first? What would be treated as an unresolved question rather than as a successful outcome? I would want to know the answer before interpreting a trial.',
            f'The other concern I would keep visible is: {minority}' if minority else 'Which uncertainty would matter most when deciding whether to continue?',
            'Its presence in my response is not a vote in favour. It is a question that I would want the other experts to consider alongside my own position. I have separated the proposition I am evaluating from the conditions under which I might become more or less confident about it.',
            'If further evidence arrived, what exactly would have changed: an expectation about an outcome, an interpretation of a mechanism, or the importance assigned to a consequence? I would describe that change rather than presenting a new rating as though no earlier judgment had existed.',
            'I would also ask what is still unknown at the end of the review. Would the same explanation apply elsewhere, and what would have to be observed to tell? These are questions for the proposed evaluation. They do not supply evidence that the scenario has already been tested.'
        ]
        text=required
        for paragraph in paragraphs:
            if len((text+' '+paragraph).split())<=target:text+='\n\n'+paragraph
        for j in explicit_indices:
            if texts[j] in text and j not in js:sources.append((j,{'response_number':i+1,'quote':texts[j],'stance':'mentioned'}))
        responses.append(text);mentions.append(sources)
    claims=[]
    for j,(text,origin) in enumerate(items):
        sources=[src for m in mentions for k,src in m if k==j]
        if origin=='explicit' and not sources:continue
        c={'id':f'claim_{j+1}','text':text,'origin':origin,'sources':sources}
        if origin=='inferred':
            downstream=minority if len(d['inferred'])>1 and text==d['inferred'][1] else main
            basis=sorted({src['response_number'] for m in mentions for k,src in m if texts[k]==downstream})
            assert basis
            c.update(based_on_responses=basis,question=f'Does the argument for this recommendation depend on the unstated assumption: {text} What would challenge it?')
        claims.append(c)
    assert len(claims)==len(items)
    ids={c['text']:c['id'] for c in claims};edges=[]
    def edge(left,right,relation):
        if left and right:edges.append({'from':ids[left],'to':ids[right],'relation':relation})
    edge(base[0],main,'supports');edge(base[1],main,'qualifies');edge(alternative,main,'challenges');edge(minority,main,'qualifies')
    for additional in d['additional_claims']:edge(additional,main,'qualifies')
    if d['inferred']:edge(d['inferred'][0],main,'supports')
    if len(d['inferred'])>1:edge(d['inferred'][1],minority,'supports')
    if len(d['inferred'])>2:edge(d['inferred'][2],main,'qualifies')
    flows=[]
    for i,m in enumerate(mentions):
        nodes=[{'id':ids[texts[j]],'text':texts[j],'kind':'premise' if j<2 else 'recommendation','quote':src['quote']} for j,src in m]
        for c in claims:
            if c['origin']=='inferred' and i+1 in c['based_on_responses']:nodes.append({'id':c['id'],'text':c['text'],'kind':'assumption','question':c['question']})
        present={n['id'] for n in nodes};flow_edges=[e for e in edges if e['from'] in present and e['to'] in present]
        flows.append({'title':d['roles'][i%3]+' perspective','response_number':i+1,'nodes':nodes,'edges':flow_edges})
    _,graph=parse_reasoning_output(json.dumps({'claims_text':'Authored fictional scenario','normalized_claims':claims,'claim_edges':edges,'reasoning_flows':flows}),[{'answers':{'q1':{'position':t}}} for t in responses])
    assert graph['rejected_flow_count']==0 and len(graph['claims'])==len(claims)
    return responses,claims,edges,flows,graph

def comment(d,i,j,r):
    priority=PRIORITIES[(i+int(d['key'][-2:]))%len(PRIORITIES)]
    p=rating(d,i,j,r)
    reason={'Agree':f'I support the proposition provided the review can change the decision. My priority remains {priority}.','Disagree':f'I do not think this proposition adequately protects {priority}. I would retain a separate route for challenging the proposed arrangement.','Unable to judge':f'I cannot resolve this proposition without an evaluation that would {d["test"]}. My uncertainty is about the claimed mechanism, not a demand that everyone agree.'}[p]
    if r==3:
        before=rating(d,i,j,2)
        reason+=f' After seeing the panel distribution and competing arguments, I {"retain" if before==p else "revise"} my position.'
        reason+=f' The qualification I still take seriously is: {d["explicit"][1]}'
    return reason

parser=argparse.ArgumentParser();parser.add_argument('--validate',action='store_true');parser.add_argument('--limit',type=int,default=20);parser.add_argument('--start',type=int,default=1);parser.add_argument('--checkpoint',type=Path,default=CHECKPOINT);parser.add_argument('--replace-from',type=Path);args=parser.parse_args();CHECKPOINT=args.checkpoint
validated={d['key']:material(d) for d in SPECS}
if args.validate:
    print(json.dumps([{'topic':d['title'],'experts':d['experts'],'budget':d['word_budget'],'actual_words':[min(len(t.split()) for t in validated[d['key']][0]),max(len(t.split()) for t in validated[d['key']][0])],'claims':len(validated[d['key']][1]),'inferred':len(d['inferred'])} for d in SPECS],indent=2));sys.exit()
state=json.loads(CHECKPOINT.read_text()) if CHECKPOINT.exists() else {'studies':{}}
checkpoint_lock=Lock()
def checkpoint():
    with checkpoint_lock:
        temporary=CHECKPOINT.with_suffix('.tmp')
        temporary.touch(mode=0o600);temporary.chmod(0o600)
        temporary.write_text(json.dumps(state));temporary.replace(CHECKPOINT)
def parallel_experts(count,action):
    with ThreadPoolExecutor(max_workers=4) as pool:
        list(pool.map(action,range(count)))
token=''
authorized_replacements=set()
def req(method,path,data=None,auth=False,form=False):
    assert BASE=='https://symphonia-dev-488613.web.app/api/'
    assert method!='DELETE' or path in authorized_replacements
    assert not any(x in path for x in ('generate','translate','probe','clarify','delete'))
    headers={'Content-Type':'application/x-www-form-urlencoded' if form else 'application/json'}
    if auth:headers['Authorization']='Bearer '+token
    body=(urllib.parse.urlencode(data).encode() if form else json.dumps(data).encode()) if data is not None else None
    for attempt in range(4):
        try:
            with urllib.request.urlopen(urllib.request.Request(BASE+path,method=method,headers=headers,data=body),timeout=45) as r:return json.load(r)
        except urllib.error.HTTPError as e:
            if e.code==429 and attempt<3:print('Respecting API rate limit; pausing.',flush=True);time.sleep(min(60,int(e.headers.get('Retry-After','60'))));continue
            raise RuntimeError(f'{method} {path.split("session/")[0]}: HTTP {e.code}') from None
    raise RuntimeError('Request failed')
token=req('POST','dev/demo-login',{})['access_token']
def replace_authored_predecessor(d,existing,s):
    if not args.replace_from:raise RuntimeError('A matching study exists; inspect before proceeding.')
    plan=json.loads(args.replace_from.read_text())
    predecessor=None
    for _ in range(1200):
        for filename in plan['checkpoint_files']:
            candidate=json.loads(Path(filename).read_text())['studies'].get(d['key'],{})
            if candidate.get('id')==existing['id']:predecessor=candidate
        if predecessor and predecessor.get('complete'):break
        if not predecessor:raise RuntimeError('Replacement is not one of the checkpointed authored examples.')
        time.sleep(1)
    else:raise RuntimeError('Authored predecessor is still being populated; not replacing it.')
    fid=predecessor['id']
    assert fid!=36 and existing['title']=='SIMULATED PANEL — '+d['title']
    rounds=sorted(req('GET',f'forms/{fid}/rounds_with_responses',auth=True),key=lambda r:r['round_number'])
    assert [r['round_number'] for r in rounds]==[1,2,3]
    expected=plan['expected'][d['key']]
    def canonical(answer):
        if isinstance(answer,str):answer=json.loads(answer)
        return json.dumps(answer,sort_keys=True)
    for number,rd in enumerate(rounds,1):
        wanted=[{'q1':{'position':text}} for text in expected['opening']] if number==1 else expected['ratings'][str(number)]
        if Counter(canonical(r['answers']) for r in rd['responses'])!=Counter(canonical(a) for a in wanted):
            raise RuntimeError('Authored example has additional or changed input; preserving it for review.')
    directory=Path('/tmp/symphonia-authored-example-archive');directory.mkdir(mode=0o700,exist_ok=True)
    archive=directory/f'form-{fid}.json'
    archive.touch(mode=0o600);archive.chmod(0o600)
    archive.write_text(json.dumps({'form':req('GET',f'forms/{fid}',auth=True),'rounds':rounds,'final':req('GET',f'forms/{fid}/final_synthesis',auth=True)}))
    s['replaced_form_id']=fid;s['predecessor_archive']=str(archive);checkpoint()
    authorized_replacements.add(f'forms/{fid}')
    req('DELETE',f'forms/{fid}',auth=True)
    authorized_replacements.remove(f'forms/{fid}')
    s['predecessor_deleted']=True;checkpoint()
    print('Rebuilding authored example with source-varied claims:',d['title'],flush=True)

def seed_study(d):
    key=d['key'];text,claims,edges,flows,graph=validated[key];s=state['studies'].setdefault(key,{});checkpoint()
    if s.get('complete'):print('Already verified:',d['title'],flush=True);return
    title='SIMULATED PANEL — '+d['title']
    question={'questionId':'opening','label':d['question'],'inputType':'textarea','optional':False,'rows':6 if d['word_budget']>200 else 4,'helpText':f'Fictional {d["experts"]}-person panel · up to {d["word_budget"]} words per opening response. Authored simulation; no real expert evidence.','requireEvidence':False,'requireCounterarguments':False,'requireConfidence':False}
    if not s.get('id'):
        existing=[f for f in req('GET','forms',auth=True) if f['title']==title]
        if existing:
            assert len(existing)==1
            replace_authored_predecessor(d,existing[0],s)
        f=req('POST','forms/create',{'title':title,'questions':[question],'allow_join':True,'allow_public_responses':True},True);s.update(id=f['id'],join_code=f['join_code'],sessions={},submitted={});checkpoint()
    fid=s['id'];rounds=req('GET',f'forms/{fid}/rounds',auth=True);r1=next(r for r in rounds if r['round_number']==1)
    if not s.get('r1_done'):
        def submit_opening(i):
            t=text[i]
            person=f'Fictional {d["roles"][i%3]} {i+1:02}'
            if str(i) not in s['sessions']:
                session=req('POST',f'public/forms/{s["join_code"]}/start',{'participant_name':person,'consent_given':'false'},form=True);s['sessions'][str(i)]=session['session_token'];checkpoint()
            if f'1:{i}' not in s['submitted']:
                req('POST',f'public/forms/session/{s["sessions"][str(i)]}/submit',{'participant_name':person,'answers':{'q1':{'position':t}}});s['submitted'][f'1:{i}']=True;checkpoint()
        parallel_experts(d['experts'],submit_opening)
        # The API numbers sources by creation time, not by our submission order.
        saved_round=next(r for r in req('GET',f'forms/{fid}/rounds_with_responses',auth=True) if r['round_number']==1)
        saved_material=[];remaining=list(enumerate(text,1));source_numbers={}
        for number,response in enumerate(saved_round['responses'],1):
            answers=response['answers']
            if isinstance(answers,str):answers=json.loads(answers)
            opening=answers['q1']['position']
            old_index=next(k for k,(_,value) in enumerate(remaining) if value==opening)
            old_number,_=remaining.pop(old_index);source_numbers[old_number]=number
            saved_material.append({'answers':answers,'response_id':response['id']})
        assert not remaining
        for claim in claims:
            for source in claim['sources']:source['response_number']=source_numbers[source['response_number']]
            if 'based_on_responses' in claim:claim['based_on_responses']=[source_numbers[n] for n in claim['based_on_responses']]
        for flow in flows:flow['response_number']=source_numbers[flow['response_number']]
        flows.sort(key=lambda flow:flow['response_number'])
        _,graph=parse_reasoning_output(json.dumps({'claims_text':'Authored fictional scenario','normalized_claims':claims,'claim_edges':edges,'reasoning_flows':flows}),saved_material)
        assert graph['rejected_flow_count']==0 and len(graph['claims'])==len(claims)
        summary='<p>Authored simulation with fictional experts. Claims and reasoning are illustrative; they are not findings from a real expert panel.</p>'+render_claim_map(graph)
        req('PUT',f'forms/{fid}/rounds/{r1["id"]}/synthesis',{'summary':summary},True)
        req('POST',f'forms/{fid}/rounds/{r1["id"]}/reasoning',{'expected_synthesis':summary,'reasoning_flows':flows,'normalized_claims':claims,'claim_edges':edges},True)
        req('PATCH',f'forms/{fid}/rounds/{r1["id"]}',{'context_settings':{'intro_body':question['helpText'],'simulation_key':key,'expert_count':d['experts'],'response_word_budget':d['word_budget'],'simulation_version':d['simulation_version']}},True)
        s['r1_done']=True;checkpoint()
    qs=[]
    for j,c in enumerate(graph['claims']):
        meta={'claimId':c['id'],'claimText':c['text'],'claimOrigin':c['origin'],'sectionTitle':c['text'],'requireEvidence':False,'requireCounterarguments':False,'requireConfidence':False}
        if c['origin']=='inferred':meta['inferenceQuestion']=c['question']
        prompt=('Inferred · unconfirmed. Not directly stated by an expert. '+c['question']) if c['origin']=='inferred' else 'Evaluate independently; persistent disagreement is valid.'
        qs.extend([{**meta,'questionId':c['id']+'_response','label':'Your view','inputType':'single_select','options':POSITIONS,'optional':False,'groupPrompt':prompt},{**meta,'questionId':c['id']+'_confidence','label':'Confidence in your rating','inputType':'single_select','options':CONFIDENCE,'optional':True},{**meta,'questionId':c['id']+'_comment','label':'Explain your position','inputType':'textarea','optional':True}])
    for number in [2,3]:
        if s.get(f'r{number}_done'):continue
        if number==3:
            for j,c in enumerate(graph['claims']):
                counts=Counter(rating(d,i,j,2) for i in range(d['experts']));certainty=Counter(CONFIDENCE[(i+j+int(key[-2:]))%5] for i in range(d['experts']))
                qs[j*3]['groupPrompt']+=' Round 2 fictional panel: '+ '; '.join(f'{v}: {counts[v]}' for v in POSITIONS)+'. Confidence, separately: '+ '; '.join(f'{v}: {certainty[v]}' for v in CONFIDENCE)+'. Anonymized explanation: '+comment(d,0,j,2)+' Another explanation: '+comment(d,d['experts']-1,j,2)+' Keep or revise your view; convergence is not required.'
        rounds=req('GET',f'forms/{fid}/rounds',auth=True)
        found=next((r for r in rounds if r['round_number']==number),None)
        if not found:found=req('POST',f'forms/{fid}/next_round',{'expected_round_number':number-1,'questions':qs,'context_settings':{'show_previous_response':True,'intro_body':question['helpText']}},True)
        def submit_rating(i):
            if f'{number}:{i}' in s['submitted']:return
            person=f'Fictional {d["roles"][i%3]} {i+1:02}'
            if s.get('session_round',{}).get(str(i),1)<number:
                continuation=req('POST',f'public/forms/session/{s["sessions"][str(i)]}/continue');s['sessions'][str(i)]=continuation['session_token'];s.setdefault('session_round',{})[str(i)]=number;checkpoint()
            answers={}
            for j,c in enumerate(graph['claims']):
                certainty=(i+j+int(key[-2:]))%5
                if number==3 and i%4==1:certainty=min(4,certainty+1)
                for k,v in enumerate([rating(d,i,j,number),CONFIDENCE[certainty],comment(d,i,j,number)]):answers[f'q{j*3+k+1}']={'position':v}
            req('POST',f'public/forms/session/{s["sessions"][str(i)]}/submit',{'participant_name':person,'answers':answers});s['submitted'][f'{number}:{i}']=True;checkpoint()
        parallel_experts(d['experts'],submit_rating)
        req('PUT',f'forms/{fid}/rounds/{found["id"]}/synthesis',{'summary':f'<p>Round {number} · Authored fictional judgments. Claims are unchanged; agreement and confidence are separate. Minority positions are retained.</p>'},True)
        s[f'r{number}_done']=True;checkpoint()
    account=req('GET',f'forms/{fid}/final_synthesis',auth=True)
    req('POST',f'forms/{fid}/final_synthesis',{'expected_revision':account['preview']['revision'],'complete':False},True)
    req('POST',f'forms/{fid}/rounds/{r1["id"]}/make_active',{},True)
    result=req('GET',f'forms/{fid}/rounds_with_responses',auth=True)
    ordered=sorted(result,key=lambda x:x['round_number'])
    assert [len(r['responses']) for r in ordered]==[d['experts']]*3
    identities=[{r['email'] for r in rd['responses']} for rd in ordered]
    assert len(identities[0])==d['experts'] and identities[0]==identities[1]==identities[2]
    for response in ordered[0]['responses']:
        answer=response['answers']
        if isinstance(answer,str):answer=json.loads(answer)
        assert len(answer['q1']['position'].split())<=d['word_budget']
    final=req('GET',f'forms/{fid}/final_synthesis',auth=True);assert final['saved'] and not final['stale'];assert len(final['saved']['claims'])==len(claims)
    s['complete']=True;checkpoint();print(f'Created and verified {fid}: {d["title"]} · {d["experts"]} experts · {d["word_budget"]} words',flush=True)

with ThreadPoolExecutor(max_workers=3) as study_pool:
    list(study_pool.map(seed_study,SPECS[args.start-1:args.limit]))
manifest=[{'id':s['id'],'title':next(d['title'] for d in SPECS if d['key']==key),'experts':next(d['experts'] for d in SPECS if d['key']==key),'word_budget':next(d['word_budget'] for d in SPECS if d['key']==key),'claim_count':len(validated[key][1]),'inferred_count':len(next(d['inferred'] for d in SPECS if d['key']==key)),'verified':bool(s.get('complete'))} for key,s in state['studies'].items() if s.get('id')]
(Path(__file__).parent/'fixtures/interesting-consultations-created.json').write_text(json.dumps(manifest,indent=2)+'\n')
print('Verified studies:',sum(x['verified'] for x in manifest),flush=True)
