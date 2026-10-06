from uuid import uuid4

from core.models import ArchivedResponse, Response, RoundModel, User
from tests.conftest import TestingSessionLocal


def setup_entry(client, admin_headers, consent=False):
    client.cookies.clear()
    questions = [{"label": "What matters?", "inputType": "textarea", "requireEvidence": False,
                  "requireCounterarguments": False, "requireConfidence": False}]
    result = client.post("/forms/create", headers=admin_headers, json={
        "title": "Offline entry test", "questions": questions, "require_consent": consent,
    })
    assert result.status_code == 201, result.text
    form_id = result.json()["id"]
    with TestingSessionLocal() as db:
        saved_round = db.query(RoundModel).filter(RoundModel.form_id == form_id).first()
        round_id = saved_round.id
        questions = saved_round.questions
    return f"/forms/{form_id}/rounds/{round_id}/responses", {
        "participant_name": "Offline respondent", "request_id": str(uuid4()),
        "expected_questions": questions, "answers": {"q1": {"position": "Keep independent review"}},
    }, round_id


def test_separate_entries_archive_and_idempotent_retry(client, admin_headers):
    url, payload, round_id = setup_entry(client, admin_headers)
    first = client.post(url, headers=admin_headers, json=payload)
    assert first.status_code == 200, first.text
    retry = client.post(url, headers=admin_headers, json=payload)
    assert retry.json()["id"] == first.json()["id"]
    second = client.post(url, headers=admin_headers, json={**payload, "request_id": str(uuid4())})
    assert second.status_code == 200
    assert second.json()["id"] != first.json()["id"]
    with TestingSessionLocal() as db:
        responses = db.query(Response).filter(Response.round_id == round_id).all()
        assert len(responses) == 2
        assert responses[0].user_id != responses[1].user_id
        assert db.query(ArchivedResponse).filter(ArchivedResponse.round_id == round_id).count() == 2
        assert all(db.get(User, r.user_id).email.startswith("Admin entry: Offline respondent") for r in responses)
    conflict = client.post(url, headers=admin_headers, json={**payload, "answers": {"q1": "Different"}})
    assert conflict.status_code == 409


def test_guards_access_required_answers_consent_and_stale_schema(client, admin_headers, participant_headers):
    url, payload, round_id = setup_entry(client, admin_headers, consent=True)
    assert client.post(url, headers=participant_headers, json=payload).status_code == 403
    assert client.post(url, headers=admin_headers, json=payload).status_code == 400
    payload["consent_confirmed"] = True
    assert client.post(url, headers=admin_headers, json={**payload, "answers": {}}).status_code == 400
    assert client.post(url, headers=admin_headers, json={**payload, "participant_name": "  "}).status_code == 400
    assert client.post(url, headers=admin_headers, json={**payload, "expected_questions": []}).status_code == 409
    with TestingSessionLocal() as db:
        assert db.query(Response).filter(Response.round_id == round_id).count() == 0
        db.get(RoundModel, round_id).is_active = False
        db.commit()
    assert client.post(url, headers=admin_headers, json=payload).status_code == 409
