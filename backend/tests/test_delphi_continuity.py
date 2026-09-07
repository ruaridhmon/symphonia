from core.models import FormModel, PublicFormSession, Response, RoundModel, User
from tests.conftest import TestingSessionLocal, create_form


def test_three_rounds_preserve_ten_identities_and_old_links(client, admin_headers):
    form = create_form(client, admin_headers, join_code='CONTINUE10')
    with TestingSessionLocal() as db:
        db.get(FormModel, form['id']).allow_public_responses = True
        first = db.query(RoundModel).filter_by(form_id=form['id'], is_active=True).one()
        first.questions = [{'label': 'Your position', 'questionId': 'view', 'inputType': 'textarea'}]
        first_id = first.id
        tokens = []
        for index in range(10):
            user = User(email=f'continuity-{index}@synthetic.invalid', hashed_password='unused', role='expert', is_public_guest=True)
            db.add(user)
            db.flush()
            token = f'continuity-synthetic-{index}'
            db.add(PublicFormSession(form_id=form['id'], user_id=user.id, round_id=first.id,
                                     session_token=token, participant_name=f'Synthetic expert {index}', consent_given=True))
            tokens.append(token)
        db.commit()
    original_tokens = tokens[:]
    for round_number in range(1, 4):
        for index, token in enumerate(tokens):
            url = f'/public/forms/session/{token}'
            payload = {'participant_name': f'Synthetic expert {index}', 'answers': {'q1': {'position': f'Round {round_number} view from expert {index}'}}}
            assert client.get(url).json()['submitted'] is False
            assert client.put(url + '/draft', json=payload).status_code == 200
            assert client.post(url + '/submit', json=payload).status_code == 200
            assert client.post(url + '/submit', json=payload).status_code == 400
            assert client.get(url).json()['submitted'] is True
        if round_number < 3:
            opened = client.post(f'/forms/{form["id"]}/next_round', json={'questions': [{'label':'Your position', 'questionId':f'round{round_number+1}', 'inputType':'textarea'}]}, headers=admin_headers)
            assert opened.status_code == 200, opened.text
            new_tokens = []
            for token in tokens:
                url = f'/public/forms/session/{token}'
                old = client.get(url).json()
                assert old['next_round_available'] is True
                assert old['round_number'] == round_number
                assert client.put(url + '/draft', json=payload).status_code == 400
                next_session = client.post(url + '/continue')
                assert next_session.status_code == 200, next_session.text
                assert client.post(url + '/continue').json() == next_session.json()
                new_tokens.append(next_session.json()['session_token'])
            tokens = new_tokens
    with TestingSessionLocal() as db:
        rows = db.query(Response).filter_by(form_id=form['id']).all()
        assert len(rows) == 30
        assert len({row.user_id for row in rows}) == 10
        assert len({row.round_id for row in rows}) == 3
        assert all('Round 1' in row.answers['q1']['position'] for row in rows if row.round_id == first_id)
        db.get(FormModel, form['id']).allow_public_responses = False
        db.commit()
    assert client.post(f'/public/forms/session/{original_tokens[0]}/continue').status_code == 403
    assert client.get(f'/public/forms/session/{tokens[0]}').status_code == 403
    assert client.post('/public/forms/session/not-a-token/continue').status_code == 404


def test_publication_is_explicit_and_admin_only(client, admin_headers, participant_headers):
    form = create_form(client, admin_headers, join_code='PUBLISHDELPHI')
    round_id = client.get(f'/forms/{form["id"]}/rounds', headers=admin_headers).json()[0]['id']
    base = f'/forms/{form["id"]}/rounds/{round_id}'
    assert client.post(base + '/synthesis_publication', json={'published':True}, headers=participant_headers).status_code == 403
    assert client.post(base + '/synthesis_publication', json={'published':True}, headers=admin_headers).status_code == 409
    assert client.put(base + '/synthesis', json={'summary':'<p>Reviewed evidence</p>'}, headers=admin_headers).json()['synthesis_published'] is False
    published = client.post(base + '/synthesis_publication', json={'published':True}, headers=admin_headers)
    assert published.status_code == 200
    assert published.json()['synthesis_published'] is True
    assert client.get(f'/forms/{form["id"]}/rounds', headers=admin_headers).json()[0]['synthesis_published'] is True
    hidden = client.post(base + '/synthesis_publication', json={'published':False}, headers=admin_headers)
    assert hidden.json()['synthesis_published'] is False
    with TestingSessionLocal() as db:
        db.get(FormModel, form['id']).allow_public_responses = True
        db.commit()
    assert client.post(f'/forms/{form["id"]}/next_round', json={}, headers=admin_headers).status_code == 200
    assert client.get(f'/public/forms/{form["join_code"]}').json()['previous_round_synthesis'] == ''
    client.post(base + '/synthesis_publication', json={'published':True}, headers=admin_headers)
    assert client.get(f'/public/forms/{form["join_code"]}').json()['previous_round_synthesis'] == '<p>Reviewed evidence</p>'


def test_repeated_open_does_not_skip_a_round(client, admin_headers):
    form = create_form(client, admin_headers)
    url = f'/forms/{form["id"]}/next_round'
    payload = {'expected_round_number': 1, 'questions': ['Review this claim']}
    assert client.post(url, json=payload, headers=admin_headers).status_code == 200
    assert client.post(url, json=payload, headers=admin_headers).status_code == 409
    rounds = client.get(f'/forms/{form["id"]}/rounds', headers=admin_headers).json()
    assert len(rounds) == 2
    assert rounds[-1]['is_active'] is True
    restore = f'/forms/{form["id"]}/rounds/{rounds[0]["id"]}/make_active'
    assert client.post(restore, headers=admin_headers).status_code == 200
    reloaded = client.get(f'/forms/{form["id"]}/rounds', headers=admin_headers).json()
    assert reloaded[0]['is_active'] is True
    assert reloaded[1]['is_active'] is False
