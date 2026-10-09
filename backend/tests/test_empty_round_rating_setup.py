from core.models import Draft, Response, User
from tests.conftest import TestingSessionLocal, create_form

OLD = [{'questionId':'claim_1_response','sectionTitle':'Claim 1: Preserve this wording','claimText':'Preserve this wording','label':'Do you agree?', 'inputType':'single_select','options':['Strongly agree','Agree','Disagree','Strongly disagree']}]
NEW = [{**OLD[0], 'options':['Agree','Neither agree nor disagree','Disagree']}]


def setup(client, headers):
    form = create_form(client, headers)
    second = client.post(f'/forms/{form["id"]}/next_round', json={'questions':OLD}, headers=headers).json()
    url = f'/forms/{form["id"]}/rounds/{second["id"]}'
    return form, second, url


def test_scale_repair_requires_stale_and_empty_guards(client, admin_headers):
    form, second, url = setup(client, admin_headers)
    assert client.patch(url, json={'questions':NEW}, headers=admin_headers).status_code == 409
    assert client.patch(url, json={'questions':NEW,'require_unanswered':True,'expected_questions':[]}, headers=admin_headers).status_code == 409
    changed = [{**NEW[0], 'claimText':'A different claim'}]
    assert client.patch(url, json={'questions':changed,'require_unanswered':True,'expected_questions':OLD}, headers=admin_headers).status_code == 409
    updated = client.patch(url, json={'questions':NEW,'require_unanswered':True,'expected_questions':OLD}, headers=admin_headers)
    assert updated.status_code == 200, updated.text
    assert updated.json()['questions'] == NEW
    third = client.post(f'/forms/{form["id"]}/next_round', json={'questions':NEW}, headers=admin_headers)
    assert third.status_code == 200
    assert client.patch(url, json={'questions':OLD,'require_unanswered':True,'expected_questions':NEW}, headers=admin_headers).status_code == 409


def test_saved_ballots_block_scale_repair(client, admin_headers):
    form, second, url = setup(client, admin_headers)
    with TestingSessionLocal() as db:
        user = db.query(User).first()
        db.add(Response(form_id=form['id'],round_id=second['id'],user_id=user.id,answers={'q1':{'position':'Strongly agree'}}))
        db.commit()
    assert client.patch(url, json={'questions':NEW,'require_unanswered':True,'expected_questions':OLD}, headers=admin_headers).status_code == 409
    with TestingSessionLocal() as db:
        assert db.query(Response).filter_by(round_id=second['id']).one().answers['q1']['position'] == 'Strongly agree'


def test_in_progress_ballots_block_scale_repair(client, admin_headers):
    form, second, url = setup(client, admin_headers)
    with TestingSessionLocal() as db:
        user = db.query(User).first()
        db.add(Draft(form_id=form['id'],round_id=second['id'],user_id=user.id,answers={'q1':{'position':'Agree'}}))
        db.commit()
    assert client.patch(url, json={'questions':NEW,'require_unanswered':True,'expected_questions':OLD}, headers=admin_headers).status_code == 409
