"""Save an authored fixture through normal DEV consultation APIs. Never calls AI endpoints.
Run --stage initial, then author reconsideration from the exported feedback, then --stage final.
Checkpoint capabilities are private; public exports contain only authored fictional records.
"""
import argparse,html,json,os,time
from pathlib import Path
import httpx
p=argparse.ArgumentParser();p.add_argument('--stage',choices=['initial','final'],required=True);args=p.parse_args()
base='https://symphonia-dev-488613.web.app/api/'
fixture=json.loads(Path('scripts/fixtures/authored-feedback-pilot.json').read_text())
state_path=Path('/tmp/symphonia-authored-feedback-pilot-state.json')
state=json.loads(state_path.read_text()) if state_path.exists() else {}
def save():
 state_path.write_text(json.dumps(state));state_path.chmod(0o600)
client=httpx.Client(base_url=base,timeout=90)
def req(method,path,**kwargs):
 # Reject any generation path even if a later edit accidentally adds one.
 assert not any(x in path for x in ('generate','synthesise','synthesize','probe','translate','counterargument','clarify'))
 for i in range(7):
  r=client.request(method,path,**kwargs)
  if r.status_code==429:time.sleep(min(30,5*(i+1)));continue
  if not r.is_success:raise RuntimeError(f'{method} operation failed: HTTP {r.status_code}')
  return r.json()
 raise RuntimeError('Rate limited; resume using the private checkpoint.')
auth=req('POST','dev/demo-login');client.cookies.clear();headers={'Authorization':'Bearer '+auth['access_token']}
def admin(method,path,**kw):return req(method,path,headers=headers,**kw)
options=['Agree','Disagree','Unable to judge']
def questions(c):
 return [q for j,claim in enumerate(c['claims']) for q in [dict(questionId=f'claim{j+1}',label=claim,inputType='single_select',options=options,optional=False,requireEvidence=False,requireCounterarguments=False,requireConfidence=False),dict(questionId=f'reason{j+1}',label='Explain your position',inputType='textarea',optional=False,requireEvidence=False,requireCounterarguments=False,requireConfidence=False)]]
def feedback(c,roundno,arm):
 if roundno==1:return '<p>Authored synthetic workflow pilot. These claims were prepared by the assistant from the opening responses, not extracted by a platform model. They are not yet rated.</p>'+''.join(f'<p>Claim {j+1}: {html.escape(t)}</p>' for j,t in enumerate(c['claims']))
 if arm=='no-feedback' and roundno==2:return '<p>No peer feedback in this arm. Reconsider the same claims using only your original private evidence and your own previous answers. No new evidence is supplied.</p>'
 out=['<p>Authored synthetic workflow pilot. Counts below are calculated from the submitted ratings. These are fictional perspectives, not real expert evidence.</p>']
 for j,claim in enumerate(c['claims']):
  rows=[x['round2'] if roundno==2 else x['round3'][arm] for x in c['people']]
  out.append(f'<p>Claim {j+1}: {html.escape(claim)}</p>')
  out.append('<p>'+ ' · '.join(f'{sum(r["votes"][j]==v for r in rows)} {v.lower()}' for v in options)+'</p>')
  for person,row in zip(c['people'],rows):out.append(f'<p>{person["id"]}: {row["votes"][j]}. {html.escape(row["reasons"][j])}</p>')
 return ''.join(out)
exports=[]
for c in fixture['scenarios']:
 for arm in ('feedback','no-feedback'):
  key=c['id']+'/'+arm;s=state.setdefault(key,{'sessions':{},'submitted':[]})
  if 'form_id' not in s:
   f=admin('POST','forms/create',json=dict(title=f'Synthetic pilot · {c["title"]} · {arm}',questions=[dict(questionId='opening',label=c['question'],inputType='textarea',optional=False,requireEvidence=False,requireCounterarguments=False,requireConfidence=False)],allow_join=True,allow_public_responses=True))
   s.update(form_id=f['id'],join_code=f['join_code']);save()
  fid=s['form_id']
  for number in ((1,2) if args.stage=='initial' else (3,)):
   rounds=admin('GET',f'forms/{fid}/rounds');target=next((r for r in rounds if r['round_number']==number),None)
   if target is None:
    admin('POST',f'forms/{fid}/next_round',json={'expected_round_number':number-1,'questions':questions(c)})
    rounds=admin('GET',f'forms/{fid}/rounds');target=next(r for r in rounds if r['round_number']==number)
   for i,person in enumerate(c['people']):
    sk=f'{number}:{i}'
    if sk in s['submitted']:continue
    name=f'Synthetic {person["id"]} — {person["role"]}'
    if sk not in s['sessions']:
     session=req('POST',f'public/forms/{s["join_code"]}/start',data={'participant_name':name,'consent_given':'false'}) if number==1 else req('POST',f'public/forms/session/{s["sessions"][f"{number-1}:{i}"]}/continue')
     s['sessions'][sk]=session['session_token'];save()
    token=s['sessions'][sk];current=req('GET',f'public/forms/session/{token}')
    if number==3:
     shown=current['form']['previous_round_synthesis']
     assert shown==feedback(c,2,arm),'Feedback exposure does not match this arm'
    if not current['submitted']:
     row=person['round2'] if number==2 else person.get('round3',{}).get(arm)
     answers={'q1':{'position':person['opening']}} if number==1 else {k:{'position':v} for j in range(4) for k,v in [(f'q{2*j+1}',row['votes'][j]),(f'q{2*j+2}',row['reasons'][j])]}
     req('POST',f'public/forms/session/{token}/submit',json={'participant_name':name,'answers':answers})
    s['submitted'].append(sk);save()
   admin('PUT',f'forms/{fid}/rounds/{target["id"]}/synthesis',json={'summary':feedback(c,number,arm)})
   admin('POST',f'forms/{fid}/rounds/{target["id"]}/synthesis_publication',json={'published':True})
   print(f'{c["title"]} / {arm}: round {number}, eight saved submissions.',flush=True)
  rounds=admin('GET',f'forms/{fid}/rounds');responses=admin('GET',f'forms/{fid}/rounds_with_responses')
  assert len(rounds)==(2 if args.stage=='initial' else 3)
  assert all(len(r['responses'])==8 for r in responses)
  assert len({x['email'] for r in responses for x in r['responses']})==8
  if args.stage=='final':
   assert rounds[1]['questions']==rounds[2]['questions']
   admin('PUT',f'forms/{fid}',json={'title':f'Synthetic pilot · {c["title"]} · {arm}','questions':rounds[-1]['questions'],'allow_public_responses':False})
  # Exclude guest capabilities, auth and internal identity transport strings.
  public_rounds=[]
  for r in responses:
   clean=[]
   for x in r['responses']:
    name=x.get('email','');pid=next(p['id'] for p in c['people'] if p['id'] in name)
    clean.append({'participant_id':pid,'answers':x['answers']})
   rn=r.get('round_number'); original=next(z for z in rounds if z['round_number']==rn)
   public_rounds.append({'round_number':rn,'questions':original['questions'],'summary':original.get('synthesis',''),'responses':clean})
  exports.append({'scenario_id':c['id'],'arm':arm,'form_id':fid,'rounds':public_rounds})
Path(f'/tmp/symphonia-authored-feedback-{args.stage}.json').write_text(json.dumps(exports,indent=2))
print('Verified and exported saved platform records. No model endpoints called.',flush=True)
