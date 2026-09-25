"""Create the explicitly synthetic ten-person panel on local QA or Symphonia dev only.
Uses the dev demo login; no secrets are printed or committed. Run with --base URL.
A private /tmp checkpoint makes interrupted runs resumable without duplicate forms.
"""
import argparse
import html
import json
import os
from pathlib import Path
import time
from urllib.parse import urlparse
import httpx

parser = argparse.ArgumentParser()
parser.add_argument('--base', required=True)
args = parser.parse_args()
base = args.base.rstrip('/')
if base not in ('http://127.0.0.1:8767/api', 'https://symphonia-dev-488613.web.app/api'):
    raise SystemExit('Only the isolated local QA server and the named dev project are allowed.')
fixture = json.loads((Path(__file__).parent/'fixtures/hypothesis-panel.json').read_text())
state_path = Path('/tmp/symphonia-hypothesis-panel-' + urlparse(base).hostname + '.json')
state = json.loads(state_path.read_text()) if state_path.exists() else {'sessions': {}, 'submitted': []}
def checkpoint():
    state_path.write_text(json.dumps(state)); os.chmod(state_path, 0o600)
client = httpx.Client(base_url=base+'/', timeout=90)

def request(method, path, **kwargs):
    for attempt in range(6):
        response = client.request(method, path.lstrip('/'), **kwargs)
        if response.status_code == 429:
            time.sleep(min(30, 5*(attempt+1))); continue
        if not response.is_success:
            # Never expose capability URLs, cookies or tokens in errors.
            raise RuntimeError(f'API operation failed with HTTP {response.status_code}: {response.text[:250]}')
        return response.json()
    raise RuntimeError('Rate limit remained active; rerun to resume the checkpoint.')

if '127.0.0.1' in base:
    auth=request('POST','login',data={'username':'workspace-qa@example.com','password':'workspace-qa-local-only'})
else:
    auth=request('POST','dev/demo-login')
client.cookies.clear()
headers={'Authorization':'Bearer '+auth['access_token']}
options=['Strongly agree','Agree','Neither agree nor disagree','Disagree','Strongly disagree','Unable to judge — need more information']
opening=[{'questionId':'opening','label':fixture['question'],'inputType':'textarea','optional':False,'requireEvidence':False,'requireCounterarguments':False,'requireConfidence':False}]
rating_questions=[q for i,claim in enumerate(fixture['claims'],1) for q in [
    {'questionId':f'claim_{i}_response','sectionTitle':f'Claim {i}: {claim}','label':'Your response','inputType':'single_select','options':options,'optional':False,'requireEvidence':False,'requireCounterarguments':False,'requireConfidence':False},
    {'questionId':f'claim_{i}_comment','sectionTitle':f'Claim {i}: {claim}','label':'Explain your position','inputType':'textarea','optional':False,'requireEvidence':False,'requireCounterarguments':False,'requireConfidence':False}]]

def synthesis(number):
    chunks=['<p>Authored synthetic demonstration. Ten fictional experts, three rounds. These are simulated perspectives, not empirical findings or real expert judgments.</p>']
    for i,claim in enumerate(fixture['claims']):
        chunks.append(f'<p>Claim {i+1}: <strong>{html.escape(claim)}</strong></p>')
        if number==1:
            chunks.append('<p>Candidate claim for the next round. Agreement has not yet been measured.</p>')
        else:
            votes=[e[f'round{number}']['votes'][i] for e in fixture['experts']]
            agree=sum(v in ('Agree','Strongly agree') for v in votes)
            disagree=sum(v in ('Disagree','Strongly disagree') for v in votes)
            chunks.append(f'<p>Recorded ratings: {agree} agree · {disagree} disagree · {10-agree-disagree} neutral (10 simulated responses).</p>')
            summaries={
                2: [
                    'The panel is divided over the cost and role of review. Supporters want an independent check on experimental design; critics worry about delay and senior gatekeeping.',
                    'Several participants favour protecting exploration from delivery pressure. Others dispute the fixed percentage or ask how low confidence will be distinguished from poor data quality.',
                    'Supporters see corroboration as protection against fragile signals. Opponents argue that a second source may not exist for a genuinely new mechanism, and apparent independence can be misleading.'
                ],
                3: [
                    'Support grows after participants distinguish review of a hypothesis and protocol from approval of each routine action. One expert remains opposed on cost grounds; another is neutral because appeal and fairness protections are absent from the claim.',
                    'Support grows modestly. The portfolio and early-career arguments move some participants, while the economist remains opposed to a universal floor. Three experts remain neutral about its definition or allocation rule.',
                    'Support falls after discussion of novel mechanisms and correlated evidence. Most now favour a documented, bounded exploratory pilot when evidence is limited. Two experts still support the rule for prioritising substantial programmes.'
                ]
            }
            chunks.append(f'<p>{summaries[number][i]}</p>')
            chunks.append('<p>Read each original rating and explanation in Responses. Across rounds shows the same participant and identical claim side by side.</p>')
    return ''.join(chunks)

if 'form_id' not in state:
    form=request('POST','forms/create',headers=headers,json={'title':fixture['title'],'description':fixture['description'],'questions':opening,'allow_join':True,'allow_public_responses':True})
    state.update(form_id=form['id'],join_code=form['join_code']); checkpoint()
form_id=state['form_id']
for number in (1,2,3):
    rounds=request('GET',f'forms/{form_id}/rounds',headers=headers)
    target=next((r for r in rounds if r['round_number']==number),None)
    if target is None:
        request('POST',f'forms/{form_id}/next_round',headers=headers,json={'expected_round_number':number-1,'questions':rating_questions})
        rounds=request('GET',f'forms/{form_id}/rounds',headers=headers)
        target=next(r for r in rounds if r['round_number']==number)
    for index,expert in enumerate(fixture['experts']):
        key=f'{number}:{index}'
        if key in state['submitted']: continue
        name=f'Synthetic {expert["name"]} — {expert["role"]}'
        if key not in state['sessions']:
            if number==1:
                session=request('POST',f'public/forms/{state["join_code"]}/start',data={'participant_name':name,'consent_given':'false'})
            else:
                previous=state['sessions'][f'{number-1}:{index}']
                session=request('POST',f'public/forms/session/{previous}/continue')
            state['sessions'][key]=session['session_token']; checkpoint()
        token=state['sessions'][key]
        current=request('GET',f'public/forms/session/{token}')
        if number>1 and not current['form']['previous_round_synthesis']:
            raise RuntimeError('Published feedback was not available before re-rating.')
        if not current['submitted']:
            answers={'q1':{'position':expert['opening']}} if number==1 else {key:{'position':value} for i in range(3) for key,value in [(f'q{2*i+1}',expert[f'round{number}']['votes'][i]),(f'q{2*i+2}',expert[f'round{number}']['comments'][i])]}
            request('POST',f'public/forms/session/{token}/submit',json={'participant_name':name,'answers':answers})
        state['submitted'].append(key); checkpoint()
    if target['is_active']:
        request('PUT',f'forms/{form_id}/rounds/{target["id"]}/synthesis',headers=headers,json={'summary':synthesis(number)})
        request('POST',f'forms/{form_id}/rounds/{target["id"]}/synthesis_publication',headers=headers,json={'published':True})
    print(f'Round {number}: 10 responses saved and feedback published.',flush=True)
responses=request('GET',f'forms/{form_id}/rounds_with_responses',headers=headers)
rounds=request('GET',f'forms/{form_id}/rounds',headers=headers)
assert [len(r['responses']) for r in responses]==[10,10,10]
assert len({r['email'] for group in responses for r in group['responses']})==10
canonical=lambda questions:[{key:value for key,value in question.items() if value is not None} for question in questions]
assert canonical(rounds[1]['questions'])==canonical(rounds[2]['questions'])
# Close public submissions once the demonstration is complete; preserve final-round questions.
request('PUT',f'forms/{form_id}',headers=headers,json={'title':fixture['title'],'questions':rounds[-1]['questions'],'allow_public_responses':False})
assert not request('GET',f'forms/{form_id}',headers=headers)['allow_public_responses']
print(f'Verified 10 identities, 30 submissions, 3 rounds, identical rating claims. Form {form_id}.',flush=True)
# Export only the fictional response data, never session capabilities.
export={'fixture':fixture,'rounds':rounds,'responses':responses}
for group in export['responses']:
    for i,response in enumerate(group['responses']):
        # Display IDs remain internally consistent but cannot identify/access a guest session.
        name=response.get('email','')
        response['email']=name.split(' [')[0].removeprefix('Guest: ')
Path('/tmp/symphonia-hypothesis-panel-results.json').write_text(json.dumps(export,indent=2,ensure_ascii=False)+'\n')
