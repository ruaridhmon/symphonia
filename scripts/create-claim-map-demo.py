"""Create one explicitly authored dev demo through CRUD APIs; never call a model.
Private resume tokens are outside the repo. Run only against named development host.
"""
import json,sys,urllib.request,urllib.parse
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'backend'))
from core.reasoning import parse_reasoning_output,render_claim_map
BASE='https://symphonia-dev-488613.web.app/api/'
private=Path('/tmp/symphonia-claim-map-demo-private.json')
s=json.loads(private.read_text()) if private.exists() else {}
def save():private.write_text(json.dumps(s));private.chmod(0o600)
def req(method,path,data=None,auth=False,form=False):
    assert not any(x in path for x in ['generate','probe','translate','clarify'])
    h={'Content-Type':'application/x-www-form-urlencoded' if form else 'application/json'}
    if auth:h['Authorization']='Bearer '+s['token']
    body=(urllib.parse.urlencode(data).encode() if form else json.dumps(data).encode()) if data is not None else None
    try:
        with urllib.request.urlopen(urllib.request.Request(BASE+path,method=method,headers=h,data=body),timeout=60) as r:return json.load(r)
    except urllib.error.HTTPError as e:raise RuntimeError(f'{method} {path.split("session/")[0]}: {e.code} {e.read().decode()[:200]}') from None
s['token']=req('POST','dev/demo-login',{} )['access_token'];save()
if s.get('completed'):print('Demo already created:',s['form_id']);sys.exit()
if s.get('form_id'):raise SystemExit('Partial demo exists; inspect private checkpoint before retrying.')
form=req('POST','forms/create',{'title':'SIMULATED PANEL — School phones: claims, assumptions and disagreement','questions':[{'questionId':'opening','label':'How should schools handle personal phones? Explain your reasoning, evidence and uncertainty.','inputType':'textarea','optional':False}],'allow_join':True,'allow_public_responses':True},True)
s.update(form_id=form['id'],join_code=form['join_code'],sessions=[]);save();fid=form['id']
texts=['Phones interrupt lessons. Store phones during lessons, with medical exceptions. I favour a small pilot; my evidence is classroom observation, not a controlled trial.','Phones help some pupils regulate anxiety. A whole-day ban could harm those pupils. Medical and accessibility access must remain. I oppose restrictions that remove these supports.','Evidence for a whole-day ban is weak. Pilot lesson-only storage before expanding it. I am uncertain that storage alone will improve learning; compare participation and disruption before and after.']
for i,text in enumerate(texts):
    sess=req('POST',f'public/forms/{s["join_code"]}/start',{'participant_name':f'Fictional expert {i+1}','consent_given':'false'},form=True)
    token=sess['session_token'];s['sessions'].append(token);save()
    req('POST',f'public/forms/session/{token}/submit',{'participant_name':f'Fictional expert {i+1}','answers':{'q1':{'position':text}}})
r1=req('GET',f'forms/{fid}/rounds',auth=True)[0]
def explicit(n,text,source,quote):return {'id':f'claim_{n}','text':text,'origin':'explicit','sources':[{'response_number':source,'quote':quote,'stance':'support'}]}
def inferred(n,text,source,question):return {'id':f'claim_{n}','text':text,'origin':'inferred','sources':[],'based_on_responses':[source],'question':question}
claims=[explicit(1,'Phones interrupt lessons.',1,'Phones interrupt lessons.'),explicit(2,'Phones help some pupils regulate anxiety.',2,'Phones help some pupils regulate anxiety.'),explicit(3,'Evidence for a whole-day ban is weak.',3,'Evidence for a whole-day ban is weak.'),inferred(4,'Storing phones during lessons would reduce phone-related interruptions.',1,'Does storage actually reduce interruptions, or might pupils find other distractions?'),inferred(5,'Removing access to an anxiety-regulation tool could impair participation.',2,'Is impaired participation the mechanism behind the concern about a whole-day ban?'),explicit(6,'Store phones during lessons, with medical exceptions.',1,'Store phones during lessons, with medical exceptions.'),explicit(7,'A whole-day ban could harm those pupils.',2,'A whole-day ban could harm those pupils.')]
edges=[{'from':'claim_1','to':'claim_4','relation':'supports'},{'from':'claim_4','to':'claim_6','relation':'supports'},{'from':'claim_2','to':'claim_5','relation':'supports'},{'from':'claim_5','to':'claim_7','relation':'supports'},{'from':'claim_3','to':'claim_6','relation':'qualifies'},{'from':'claim_7','to':'claim_6','relation':'qualifies'}]
flows=[]
for i,(a,b,c) in enumerate([(0,3,5),(1,4,6)]):
    ns=[]
    for j in [a,b,c]:
        q=claims[j];ns.append({'id':q['id'],'text':q['text'],'kind':'assumption' if q['origin']=='inferred' else 'premise',**({'question':q['question']} if q['origin']=='inferred' else {'quote':q['sources'][0]['quote']})})
    flows.append({'title':['Disruption → storage, with exceptions','Anxiety support → risk of harm'][i],'response_number':i+1,'nodes':ns,'edges':[e for e in edges if e['from'] in [n['id'] for n in ns] and e['to'] in [n['id'] for n in ns]]})
flows.append({'title':'Weak evidence → cautious pilot','response_number':3,'nodes':[{'id':'e','kind':'premise','text':claims[2]['text'],'quote':claims[2]['sources'][0]['quote']},{'id':'p','kind':'recommendation','text':'Pilot lesson-only storage before expanding it.','quote':'Pilot lesson-only storage before expanding it.'}],'edges':[{'from':'e','to':'p','relation':'motivates'}]})
_,graph=parse_reasoning_output(json.dumps({'claims_text':'Authored demo','normalized_claims':claims,'claim_edges':edges,'reasoning_flows':flows}),[{'answers':{'q1':{'position':t}}} for t in texts])
html='<p>Authored demonstration with three fictional experts. These are illustrative interpretations, not AI extraction results or real expert evidence.</p>'+render_claim_map(graph)
req('PUT',f'forms/{fid}/rounds/{r1["id"]}/synthesis',{'summary':html},True)
req('POST',f'forms/{fid}/rounds/{r1["id"]}/reasoning',{'expected_synthesis':html,'reasoning_flows':flows,'normalized_claims':claims,'claim_edges':edges},True)
opts=['Strongly agree','Agree','Neither agree nor disagree','Disagree','Strongly disagree','Unable to judge — need more information'];conf=['Not at all confident','Slightly confident','Moderately confident','Very confident','Extremely confident'];qs=[]
for q in graph['claims']:
    meta={'claimId':q['id'],'claimText':q['text'],'claimOrigin':q['origin'],'sectionTitle':q['text'],'requireEvidence':False,'requireCounterarguments':False,'requireConfidence':False}
    if q['origin']=='inferred':meta['inferenceQuestion']=q['question']
    qs.extend([{**meta,'questionId':q['id']+'_response','label':'Your view','inputType':'single_select','options':opts,'optional':False,'groupPrompt':('Inferred · unconfirmed. Not directly stated by an expert. '+q['question']) if q['origin']=='inferred' else 'Evaluate independently; disagreement is valid.'},{**meta,'questionId':q['id']+'_confidence','label':'Confidence in your rating','inputType':'single_select','options':conf,'optional':True},{**meta,'questionId':q['id']+'_comment','label':'Explain your position','inputType':'textarea','optional':True}])
positions={}
for round_number in [2,3]:
    if round_number==3:
        for q in qs:
            if q['questionId'].endswith('_response'):
                q['groupPrompt']+=' Round 2 fictional panel: '+ ' · '.join(positions[q['claimId']])+'. Confidence is recorded separately. One expert cautioned: Do not remove anxiety support; preserve medical access. Keep or revise your view; convergence is not required.'
    req('POST',f'forms/{fid}/next_round',{'expected_round_number':round_number-1,'questions':qs,'context_settings':{'show_previous_response':True,'intro_body':'Authored demo with fictional experts. Inferred claims remain unconfirmed even when rated.'}},True)
    for i,old in enumerate(s['sessions']):
        token=req('POST',f'public/forms/session/{old}/continue')['session_token'];s['sessions'][i]=token;save();answers={}
        for j,q in enumerate(graph['claims']):
            position= ['Agree','Disagree','Unable to judge — need more information'][i] if q['id'] in ['claim_4','claim_6'] else ['Agree','Strongly agree','Neither agree nor disagree'][i]
            if round_number==3 and i==0 and q['id']=='claim_6':position='Strongly agree'
            if round_number==2:positions.setdefault(q['id'],[]).append(position)
            for k,value in enumerate([position,conf[[1,4,2][i]],['I favour a cautious pilot, with exceptions.','Do not remove anxiety support; preserve medical access.','The evidence remains weak. I am not ready to endorse the inferred mechanism.'][i]]):answers[f'q{j*3+k+1}']={'position':value}
        req('POST',f'public/forms/session/{token}/submit',{'participant_name':f'Fictional expert {i+1}','answers':answers})
for r in req('GET',f'forms/{fid}/rounds',auth=True):
    if r['round_number']>1:
        note='Three fictional experts rated all seven claims, with separate confidence and explanations.' if r['round_number']==2 else 'The fictional panel reconsidered the same seven claims. One expert strengthened support for lesson-only storage; disagreement and uncertainty remain.'
        req('PUT',f'forms/{fid}/rounds/{r["id"]}/synthesis',{'summary':'<p>'+note+'</p>'+r['synthesis']},True)
account=req('GET',f'forms/{fid}/final_synthesis',auth=True)
req('POST',f'forms/{fid}/final_synthesis',{'expected_revision':account['preview']['revision'],'complete':False},True)
s['completed']=True;save();print(json.dumps({'form_id':fid,'claims':7,'inferred':2,'responses':9,'paid_calls':0}))
