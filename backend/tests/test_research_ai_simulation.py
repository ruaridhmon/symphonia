"""Run the eight-person, three-round scripted demo through an isolated API.

No production connection, guest links, external messages or model calls are used.
Set SYMPHONIA_DEMO_EXPORT to export the verified, synthetic-only round data.
"""
import html
import json
import os
from pathlib import Path
from tests.conftest import create_form, register_and_login, submit_response

FIXTURE = json.loads((Path(__file__).parent / 'fixtures/research_ai_delphi.json').read_text())
OPTIONS = ['Strongly agree','Agree','Neither agree nor disagree','Disagree','Strongly disagree','Unable to judge — need more information']

def questions():
    return [q for i,claim in enumerate(FIXTURE['claims'],1) for q in [
        {'questionId':f'claim_{i}_response','sectionTitle':f'Claim {i}: {claim}','label':'Your response','inputType':'single_select','options':OPTIONS,'optional':False},
        {'questionId':f'claim_{i}_comment','sectionTitle':f'Claim {i}: {claim}','label':'What led you to this view?','inputType':'textarea','optional':True}]]

def synthesis(number):
    out=['<p>Scripted synthetic panel. Eight fictional experts; no empirical evidence. Threshold 80%; stop after three rounds.</p>']
    for i,claim in enumerate(FIXTURE['claims']):
        out.append(f'<p>Claim {i+1}: <strong>{html.escape(claim)}</strong></p>')
        if number == 1:
            out.append('<p>Candidate claim extracted from the proposals; not yet rated.</p>')
        else:
            for e in FIXTURE['experts']:
                r=e[f'round{number}']
                out.append(f'<p>{html.escape(e["role"])} — {html.escape(r["votes"][i])}: {html.escape(r["comments"][i])}</p>')
    return ''.join(out)

def test_full_authenticated_simulation(client, admin_headers):
    form=create_form(client,admin_headers,title=FIXTURE['title'],questions=[{'questionId':'proposal','label':FIXTURE['question'],'inputType':'textarea','optional':False}])
    form_id=form['id']
    participants=[]
    for i,e in enumerate(FIXTURE['experts']):
        token=register_and_login(client,f'research-ai-{i}@example.com')
        headers={'Authorization':f'Bearer {token}'}
        assert client.post('/forms/unlock',json={'join_code':form['join_code']},headers=headers).status_code==200
        participants.append(headers)
    for number in range(1,4):
        if number>1:
            opened=client.post(f'/forms/{form_id}/next_round',headers=admin_headers,json={'expected_round_number':number-1,'questions':questions()})
            assert opened.status_code==200,opened.text
            # The same people can review the preceding synthesis before re-rating.
            feedback=client.get(f'/forms/{form_id}/active_round',headers=participants[0]).json()
            assert feedback['previous_round_synthesis']
        for e,headers in zip(FIXTURE['experts'],participants):
            if number==1: answers={'q1':{'position':e['proposal']}}
            else:
                r=e[f'round{number}'];answers={}
                for i in range(4):
                    answers[f'q{2*i+1}']={'position':r['votes'][i]}
                    answers[f'q{2*i+2}']={'position':r['comments'][i]}
            submit_response(client,headers,form_id,answers)
        active=client.get(f'/forms/{form_id}/active_round',headers=admin_headers).json()
        round_id=active['id']
        saved=client.put(f'/forms/{form_id}/rounds/{round_id}/synthesis',headers=admin_headers,json={'summary':synthesis(number)})
        assert saved.status_code==200,saved.text
        assert client.post(f'/forms/{form_id}/rounds/{round_id}/synthesis_publication',headers=admin_headers,json={'published':True}).status_code==200
    rounds=client.get(f'/forms/{form_id}/rounds',headers=admin_headers).json()
    responses=client.get(f'/forms/{form_id}/rounds_with_responses',headers=admin_headers).json()
    assert len(rounds)==3
    assert [len(r['responses']) for r in responses]==[8,8,8]
    assert len({r['email'] for group in responses for r in group['responses']})==8
    final=responses[-1]['responses']
    assert [sum(r['answers'][f'q{2*i+1}']['position']=='Agree' for r in final) for i in range(4)]==[8,6,4,1]
    assert sum(r['answers']['q7']['position']=='Disagree' for r in final)==7
    # Export only synthetic identities and content, never auth or guest-session data.
    for group in responses:
        for i,r in enumerate(group['responses']):
            r['email']=f'synthetic-expert-{i+1}'
    path=os.getenv('SYMPHONIA_DEMO_EXPORT')
    if path:
        Path(path).write_text(json.dumps({'fixture':FIXTURE,'rounds':rounds,'responses':responses},ensure_ascii=False,indent=2)+'\n')
