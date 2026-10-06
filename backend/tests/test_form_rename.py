from core.models import FormModel, RoundModel
from tests.conftest import TestingSessionLocal


def test_rename_preserves_questions_consent_and_access(client, admin_headers, participant_headers):
    client.cookies.clear()
    made = client.post('/forms/create', headers=admin_headers, json={
        'title': 'Original', 'questions': ['Keep this question'],
        'allow_public_responses': True, 'require_consent': True, 'consent_text': 'Saved consent',
    })
    assert made.status_code == 201, made.text
    form_id = made.json()['id']
    with TestingSessionLocal() as db:
        form = db.get(FormModel, form_id)
        before = (form.questions, form.allow_public_responses, form.require_consent, form.consent_text)
        round_before = db.query(RoundModel).filter_by(form_id=form_id).first().questions
    url = f'/forms/{form_id}/title'
    assert client.patch(url, headers=participant_headers, json={'title': 'Forbidden'}).status_code == 403
    assert client.patch(url, headers=admin_headers, json={'title': '   '}).status_code == 422
    assert client.patch(url, headers=admin_headers, json={'title': 'x' * 241}).status_code == 422
    assert client.patch(url, headers=admin_headers, json={'title': 'New', 'expected_title': 'Stale'}).status_code == 409
    renamed = client.patch(url, headers=admin_headers, json={'title': ' New name ', 'expected_title': 'Original'})
    assert renamed.status_code == 200, renamed.text
    assert renamed.json()['title'] == 'New name'
    with TestingSessionLocal() as db:
        form = db.get(FormModel, form_id)
        assert (form.questions, form.allow_public_responses, form.require_consent, form.consent_text) == before
        assert db.query(RoundModel).filter_by(form_id=form_id).first().questions == round_before
    assert client.patch('/forms/999999/title', headers=admin_headers, json={'title': 'Missing'}).status_code == 404
