"""Populate four explicitly authored synthetic surveys using ordinary dev APIs only."""
import json,urllib.request,urllib.error,urllib.parse,time,html
from pathlib import Path
base='https://symphonia-dev-488613.web.app/api/'
fixture=json.loads(Path('scripts/fixtures/new-dev-surveys.json').read_text())
p=Path('/tmp/symphonia-new-dev-surveys-private.json');state=json.loads(p.read_text()) if p.exists() else {}
def save():p.write_text(json.dumps(state));p.chmod(0o600)
def req(method,path,data=None,auth=False,form=False):
 assert not any(x in path for x in ['generate','synthesise','synthesize','probe','translate','clarify'])
 body=(urllib.parse.urlencode(data).encode() if form else json.dumps(data).encode()) if data is not None else (b'' if method=='POST' else None)
 headers={'Content-Type':'application/x-www-form-urlencoded' if form else 'application/json'}
 if auth:headers['Authorization']='Bearer '+token
 for retry in range(8):
  try:
   with urllib.request.urlopen(urllib.request.Request(base+path,data=body,headers=headers,method=method),timeout=60) as r:return json.load(r)
  except urllib.error.HTTPError as e:
   if e.code==429:time.sleep(8);continue
   raise RuntimeError(f'{method} request failed: {e.code}') from None
 raise RuntimeError('Rate limited. Resume from private checkpoint.')
token=req('POST','dev/demo-login')['access_token']
opts=['Strongly agree','Agree','Neither agree nor disagree','Disagree','Strongly disagree','Unable to judge — need more information']
confidence=['Not at all confident','Slightly confident','Moderately confident','Very confident','Extremely confident']
def question(**kw):return dict(requireEvidence=False,requireCounterarguments=False,requireConfidence=False,**kw)
def qs(s):
 out=[]
 for j,claim in enumerate(s['claims'],1):
  section=f'Claim {j}: {claim}'
  out.extend([question(questionId=f'claim_{j}_response',sectionTitle=section,label='Your view',inputType='single_select',options=opts,optional=False),question(questionId=f'claim_{j}_confidence',sectionTitle=section,label='Confidence in your rating',inputType='single_select',options=confidence,optional=True),question(questionId=f'claim_{j}_comment',sectionTitle=section,label='Explain your position',inputType='textarea',optional=True)])
 return out
def summary(s,n):
 out=['<p><strong>Fictional simulation.</strong> Six assistant-authored participants. Ratings, confidence and changes are scripted, not research findings.</p>']
 if n==3:out.append('<p>'+html.escape(s['feedback'])+'</p>')
 for j,claim in enumerate(s['claims']):
  out.append(f'<div><p>Claim {j+1}: <strong>{html.escape(claim)}</strong></p>')
  if n==1:out.append('<p>Prepared from the authored opening responses; not yet rated.</p>')
  else:
   for label,allowed in [('Supporting experts',{'Agree','Strongly agree'}),('Opposing experts',{'Disagree','Strongly disagree'}),('Uncertain experts',{'Neither agree nor disagree','Unable to judge — need more information'})]:
    people=[x for x in s['people'] if x[f'round{n}']['votes'][j] in allowed]
    out.append('<details><summary>'+label+f' ({len(people)})</summary><ul>')
    for x in people:out.append('<li>'+html.escape(x['role']+': '+x[f'round{n}']['votes'][j]+'. '+x[f'round{n}']['reasons'][j]+' Confidence: '+x[f'round{n}']['confidence'][j])+'.</li>')
    out.append('</ul></details>')
  out.append('</div>')
 return ''.join(out)
manifest=[]
for s in fixture['scenarios']:
 st=state.setdefault(s['id'],{'sessions':{},'submitted':[]})
 if 'form_id' not in st:
  f=req('POST','forms/create',dict(title='Simulated example · '+s['title'],questions=[question(questionId='opening',label=s['question'],inputType='textarea',optional=False)],allow_join=True,allow_public_responses=True),True)
  st.update(form_id=f['id'],join_code=f['join_code']);save()
 fid=st['form_id']
 for n in [1,2,3]:
  rounds=req('GET',f'forms/{fid}/rounds',auth=True);r=next((x for x in rounds if x['round_number']==n),None)
  if r is None:
   req('POST',f'forms/{fid}/next_round',dict(expected_round_number=n-1,questions=qs(s),context_settings={'intro_title':'Fictional panel','intro_body':'Assistant-authored simulation. No real participants or empirical results.','show_previous_response':True}),True)
   rounds=req('GET',f'forms/{fid}/rounds',auth=True);r=next(x for x in rounds if x['round_number']==n)
  for i,person in enumerate(s['people']):
   key=f'{n}:{i}';name='Fictional '+person['id']+' — '+person['role']
   if key in st['submitted']:continue
   if key not in st['sessions']:
    sess=req('POST',f'public/forms/{st["join_code"]}/start',{'participant_name':name,'consent_given':'false'},form=True) if n==1 else req('POST',f'public/forms/session/{st["sessions"][f"{n-1}:{i}"]}/continue')
    st['sessions'][key]=sess['session_token'];save()
   session=st['sessions'][key];current=req('GET',f'public/forms/session/{session}')
   if not current['submitted']:
    answers={'q1':{'position':person['opening']}} if n==1 else {f'q{j*3+k+1}':{'position':person[f'round{n}'][field][j]} for j in range(4) for k,field in enumerate(['votes','confidence','reasons'])}
    req('POST',f'public/forms/session/{session}/submit',{'participant_name':name,'answers':answers})
   st['submitted'].append(key);save()
  req('PUT',f'forms/{fid}/rounds/{r["id"]}/synthesis',{'summary':summary(s,n)},True)
  req('POST',f'forms/{fid}/rounds/{r["id"]}/synthesis_publication',{'published':True},True)
  print(f'{s["id"]}: round {n} complete (6 saved submissions)',flush=True)
 rounds=req('GET',f'forms/{fid}/rounds',auth=True);responses=req('GET',f'forms/{fid}/rounds_with_responses',auth=True)
 assert len(rounds)==3 and all(len(x['responses'])==6 for x in responses)
 assert rounds[1]['questions']==rounds[2]['questions']
 req('PUT',f'forms/{fid}',{'title':'Simulated example · '+s['title'],'questions':rounds[-1]['questions'],'allow_public_responses':False},True)
 manifest.append({'id':s['id'],'title':s['title'],'form_id':fid,'rounds':3,'fictional_participants':6,'saved_submissions':18,'status':'Assistant-authored simulation; not empirical results'})
Path('frontend/public/examples/new-surveys-manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
print('All four verified; no model endpoints called.',flush=True)
