import copy

from core.models import Response, RoundModel, User
from tests.conftest import TestingSessionLocal, create_form


def fixture(client, headers):
    form = create_form(client, headers, questions=["Original view?"])
    q = [
        {
            "questionId": "claim_1_response",
            "sectionTitle": "Claim 1: Retain medical exceptions.",
            "claimText": "Retain medical exceptions.",
            "claimOrigin": "inferred",
            "inferenceQuestion": "Is this the necessary bridge?",
            "label": "Your view",
            "inputType": "single_select",
            "options": [
                "Strongly agree",
                "Agree",
                "Neither agree nor disagree",
                "Disagree",
                "Strongly disagree",
                "Unable to judge",
            ],
            "optional": False,
        },
        {
            "questionId": "claim_1_confidence",
            "sectionTitle": "Claim 1: Retain medical exceptions.",
            "label": "Confidence in your rating",
            "inputType": "single_select",
            "options": ["Very confident", "Slightly confident"],
        },
        {
            "questionId": "claim_1_comment",
            "sectionTitle": "Claim 1: Retain medical exceptions.",
            "label": "Explain your position",
            "inputType": "textarea",
        },
    ]
    with TestingSessionLocal() as db:
        first = db.query(RoundModel).filter_by(form_id=form["id"]).one()
        first.is_active = False
        a = User(
            email=f"final-{form['id']}@synthetic.invalid",
            hashed_password="unused",
            role="expert",
        )
        b = User(
            email=f"minority-{form['id']}@synthetic.invalid",
            hashed_password="unused",
            role="expert",
        )
        db.add_all([a, b])
        db.flush()
        r2 = RoundModel(
            form_id=form["id"], round_number=2, is_active=False, questions=q
        )
        r3 = RoundModel(
            form_id=form["id"],
            round_number=3,
            is_active=True,
            questions=copy.deepcopy(q),
        )
        db.add_all([r2, r3])
        db.flush()
        for r, position, conf, reason in [
            (r2, "Agree", "Very confident", "Original majority reason"),
            (r3, "Strongly agree", "Slightly confident", "Evidence is still weak"),
        ]:
            db.add(
                Response(
                    form_id=form["id"],
                    round_id=r.id,
                    user_id=a.id,
                    answers={
                        "q1": {"position": position, "confidence": 5},
                        "q2": {"position": conf},
                        "q3": {"position": reason},
                    },
                )
            )
            db.add(
                Response(
                    form_id=form["id"],
                    round_id=r.id,
                    user_id=b.id,
                    answers={
                        "q1": {"position": "Strongly disagree"},
                        "q3": {
                            "position": "Preserve this minority counterargument exactly."
                        },
                    },
                )
            )
        db.commit()
    return form["id"]


def test_final_account_keeps_strength_confidence_minority_and_raw_history(
    client, admin_headers, participant_headers
):
    fid = fixture(client, admin_headers)
    url = f"/forms/{fid}/final_synthesis"
    client.cookies.clear()
    assert client.get(url, headers=participant_headers).status_code == 403
    got = client.get(url, headers=admin_headers)
    assert got.status_code == 200, got.text
    data = got.json()
    claim = data["preview"]["claims"][0]
    assert (
        claim["text"] == "Retain medical exceptions." and claim["origin"] == "inferred"
    )
    assert claim["changes"] == 1 and claim["matched"] == 2
    first = claim["final_responses"][0]
    assert (
        first["before"]["position"] == "Agree" and first["position"] == "Strongly agree"
    )
    assert (
        first["confidence"] == "Slightly confident"
        and first["before"]["confidence"] == "Very confident"
    )
    assert (
        "Preserve this minority counterargument exactly." in data["preview"]["markdown"]
    )
    assert {"label": "Not recorded", "count": 1} in claim["confidence"]
    assert data["preview"]["reasoning_graph"] is None
    revision = data["preview"]["revision"]
    assert (
        client.post(
            url, headers=admin_headers, json={"expected_revision": "stale"}
        ).status_code
        == 409
    )
    saved = client.post(
        url, headers=admin_headers, json={"expected_revision": revision}
    ).json()
    assert saved["collection_open"] and saved["saved"]["revision"] == revision
    with TestingSessionLocal() as db:
        response = (
            db.query(Response)
            .filter_by(form_id=fid)
            .order_by(Response.id.desc())
            .first()
        )
        response.answers = {
            **response.answers,
            "q3": {"position": "Updated minority reason"},
        }
        db.commit()
    newer = client.get(url, headers=admin_headers).json()
    assert newer["stale"] and newer["saved"]["revision"] == revision
    assert (
        client.post(
            url,
            headers=admin_headers,
            json={"expected_revision": revision, "complete": True},
        ).status_code
        == 409
    )
    finished = client.post(
        url,
        headers=admin_headers,
        json={"expected_revision": newer["preview"]["revision"], "complete": True},
    ).json()
    assert finished["saved"]["completed"] and not finished["collection_open"]
    with TestingSessionLocal() as db:
        assert db.query(Response).filter_by(form_id=fid).count() == 4
        assert db.query(RoundModel).filter_by(form_id=fid).count() == 3


def test_final_synthesis_is_not_available_before_reconsideration(client, admin_headers):
    form = create_form(client, admin_headers)
    assert (
        client.get(
            f"/forms/{form['id']}/final_synthesis", headers=admin_headers
        ).status_code
        == 409
    )


def test_context_edits_do_not_discard_saved_final_snapshot(client, admin_headers):
    fid = fixture(client, admin_headers)
    url = f"/forms/{fid}/final_synthesis"
    revision = client.get(url, headers=admin_headers).json()["preview"]["revision"]
    client.post(url, headers=admin_headers, json={"expected_revision": revision})
    rounds = client.get(f"/forms/{fid}/rounds", headers=admin_headers).json()
    rid = next(r["id"] for r in rounds if r["round_number"] == 3)
    edited = client.patch(
        f"/forms/{fid}/rounds/{rid}",
        headers=admin_headers,
        json={"context_settings": {"intro_body": "Updated introduction"}},
    )
    assert edited.status_code == 200, edited.text
    assert (
        client.get(url, headers=admin_headers).json()["saved"]["revision"] == revision
    )
