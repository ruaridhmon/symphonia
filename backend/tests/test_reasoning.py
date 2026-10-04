import json
import pytest
from core.reasoning import parse_reasoning_output

RESPONSES=[{'response_id':15,'answers':{'q1':{'position':'Phones interrupt lessons. Put them away during lessons, with medical exceptions.'}}},{'response_id':16,'answers':{'q1':{'position':'A whole-day ban would make travel less safe.'}}}]
def payload():
    return {'claims_text':'Claims\nClaim 1\nText: Put phones away during lessons.', 'reasoning_flows':[{'title':'Lesson disruption','response_number':1,'nodes':[{'id':'a','kind':'premise','text':'Phones interrupt lessons.','quote':'Phones interrupt lessons.'},{'id':'b','kind':'assumption','text':'Putting phones away reduces disruption.','question':'Would storage reduce interruptions?','quote':'invented attribution'},{'id':'c','kind':'recommendation','text':'Put phones away during lessons.','quote':'Put them away during lessons, with medical exceptions.','condition':'Medical exceptions'}],'edges':[{'from':'a','to':'b','relation':'supports'},{'from':'b','to':'c','relation':'supports'}]}]}
def parse(p):return parse_reasoning_output(json.dumps(p),RESPONSES)[1]
def test_source_grounding_and_assumption_separation():
    graph=parse(payload());assert graph['mapped_response_count']==1
    flow=graph['flows'][0];assert flow['response_id']==15
    assert flow['nodes'][2]['condition']=='Medical exceptions'
    assert 'quote' not in flow['nodes'][1]
    assert flow['nodes'][1]['confirmed'] is False
    assert 'Phones interrupt' in flow['nodes'][0]['source_text']
@pytest.mark.parametrize('kind',['wrong_quote','wrong_expert','cycle','missing_node','duplicate','missing_question'])
def test_invalid_maps_never_become_grounded_claims(kind):
    p=payload();f=p['reasoning_flows'][0]
    if kind=='wrong_quote':f['nodes'][0]['quote']='A made up source sentence.'
    if kind=='wrong_expert':f['response_number']=2
    if kind=='cycle':f['edges'].append({'from':'c','to':'a','relation':'supports'})
    if kind=='missing_node':f['edges'][0]['to']='missing'
    if kind=='duplicate':f['nodes'][1]['id']='a'
    if kind=='missing_question':del f['nodes'][1]['question']
    g=parse(p);assert g['flows']==[];assert g['rejected_flow_count']==1

def test_partial_validity_keeps_good_map_and_reports_coverage():
    p=payload();p['reasoning_flows'].append({'response_number':99});g=parse(p)
    assert len(g['flows'])==1 and g['rejected_flow_count']==1 and g['response_count']==2

def test_invalid_json_does_not_produce_a_draft():
    with pytest.raises(ValueError):parse_reasoning_output('not JSON',RESPONSES)

def test_provided_map_is_versioned_scoped_and_does_not_change_claims(client,admin_headers,participant_headers):
    from tests.conftest import create_form,submit_response
    form=create_form(client,admin_headers,questions=['Your view?'])
    submit_response(client,participant_headers,form['id'],RESPONSES[0]['answers'])
    rid=client.get(f"/forms/{form['id']}/rounds",headers=admin_headers).json()[0]['id']
    url=f"/forms/{form['id']}/rounds/{rid}"
    original='<p>Claim 1: Put phones away during lessons.</p>'
    client.put(url+'/synthesis',headers=admin_headers,json={'summary':original})
    body={'expected_synthesis':original,'reasoning_flows':payload()['reasoning_flows']}
    assert client.post(url+'/reasoning',headers=participant_headers,json=body).status_code==403
    assert client.post(url+'/reasoning',headers=admin_headers,json={**body,'expected_synthesis':'changed'}).status_code==409
    saved=client.post(url+'/reasoning',headers=admin_headers,json=body)
    assert saved.status_code==200,saved.text
    assert saved.json()['synthesis_json']['reasoning_graph']['status']=='provided_interpretation'
    reloaded=client.get(f"/forms/{form['id']}/rounds",headers=admin_headers).json()[0]
    assert reloaded['synthesis']==original and reloaded['questions']==['Your view?']
    client.put(url+'/synthesis',headers=admin_headers,json={'summary':'<p>Changed claim</p>'})
    reloaded=client.get(f"/forms/{form['id']}/rounds",headers=admin_headers).json()[0]
    assert 'reasoning_graph' not in reloaded['synthesis_json']

def test_first_round_simple_generates_graph_in_one_call(client,admin_headers,participant_headers,monkeypatch):
    from types import SimpleNamespace
    from core import routes
    from tests.conftest import create_form,submit_response
    form=create_form(client,admin_headers,questions=['Your view?'])
    submit_response(client,participant_headers,form['id'],RESPONSES[0]['answers'])
    rid=client.get(f"/forms/{form['id']}/rounds",headers=admin_headers).json()[0]['id']
    calls=[]
    def completion(**kwargs):
        calls.append(kwargs)
        return SimpleNamespace(choices=[SimpleNamespace(message=SimpleNamespace(content=json.dumps(payload())))])
    monkeypatch.setenv('SYNTHESIS_MODE','live');monkeypatch.setenv('OPENROUTER_API_KEY','fake-test-key')
    monkeypatch.setattr(routes,'OpenAI',lambda **kw:SimpleNamespace(chat=SimpleNamespace(completions=SimpleNamespace(create=completion))))
    result=client.post(f"/forms/{form['id']}/rounds/{rid}/generate_synthesis",headers=admin_headers,json={'strategy':'simple','model':'test/model'})
    assert result.status_code==200,result.text
    assert len(calls)==1 and calls[0]['model']=='test/model'
    assert len(result.json()['synthesis_json']['reasoning_graph']['flows'])==1
