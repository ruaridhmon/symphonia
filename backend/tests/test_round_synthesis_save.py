from core.models import RoundModel
from tests.conftest import TestingSessionLocal, create_form


def test_editor_save_is_versioned_and_survives_reload(client, admin_headers):
    form = create_form(client, admin_headers, join_code="SAVEDEMO")
    form_id = form["id"]
    rounds = client.get(f"/forms/{form_id}/rounds", headers=admin_headers).json()
    round_id = rounds[0]["id"]
    url = f"/forms/{form_id}/rounds/{round_id}/synthesis"
    first = client.put(url, json={"summary": "<p>First reviewed claim</p>"}, headers=admin_headers)
    assert first.status_code == 200, first.text
    second = client.put(url, json={"summary": "<p>Corrected claim</p>"}, headers=admin_headers)
    assert second.status_code == 200, second.text
    assert second.json()["questions"] == rounds[0]["questions"]
    assert client.put(url, json={"summary": "<p>Corrected claim</p>"}, headers=admin_headers).status_code == 200
    reloaded = client.get(f"/forms/{form_id}/rounds", headers=admin_headers).json()[0]
    assert reloaded["synthesis"] == "<p>Corrected claim</p>"
    versions = client.get(f"/forms/{form_id}/rounds/{round_id}/synthesis_versions", headers=admin_headers).json()
    assert len(versions) == 2
    assert [v["is_active"] for v in versions] == [False, True]
    assert versions[0]["synthesis"] == "<p>First reviewed claim</p>"
    assert versions[1]["strategy"] == "manual"
    assert client.put(f"/forms/{form_id + 999}/rounds/{round_id}/synthesis", json={"summary": "wrong form"}, headers=admin_headers).status_code == 404
    with TestingSessionLocal() as db:
        row = db.get(RoundModel, round_id)
        row.is_active = False
        db.commit()
    assert client.put(url, json={"summary": "historical edit"}, headers=admin_headers).status_code == 409


def test_participant_cannot_edit_synthesis(client, admin_headers, participant_headers):
    form = create_form(client, admin_headers, join_code="SAVEAUTH")
    round_id = client.get(f'/forms/{form["id"]}/rounds', headers=admin_headers).json()[0]["id"]
    result = client.put(f'/forms/{form["id"]}/rounds/{round_id}/synthesis', json={"summary": "unauthorized"}, headers=participant_headers)
    assert result.status_code == 403
