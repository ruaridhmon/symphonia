import json
from types import SimpleNamespace
from unittest.mock import Mock

import pytest

from core import routes
from core.grounded_generation import final_material, parse_opening
from core.models import Response, RoundModel, SynthesisVersion
from tests.conftest import TestingSessionLocal, create_form, submit_response
from tests.test_final_synthesis import fixture as final_fixture

SOURCE = "We should retain medical exceptions because some pupils need access."


def opening_output():
    return {
        "normalized_claims": [
            {
                "id": "claim_1",
                "text": "Retain medical exceptions.",
                "origin": "explicit",
                "sources": [
                    {"response_number": 1, "quote": SOURCE, "stance": "support"}
                ],
            }
        ],
        "claim_edges": [],
        "reasoning_flows": [
            {
                "title": "Access exceptions",
                "response_number": 1,
                "nodes": [
                    {
                        "id": "a",
                        "kind": "recommendation",
                        "text": "Retain medical exceptions.",
                        "quote": SOURCE,
                    }
                ],
                "edges": [],
            }
        ],
        "response_coverage": [{"response_number": 1, "status": "mapped", "reason": ""}],
        "limitations": [],
    }


def provider(monkeypatch, output, callback=None, finish="stop"):
    def create(**kwargs):
        if callback:
            callback()
        return SimpleNamespace(
            choices=[
                SimpleNamespace(
                    finish_reason=finish,
                    message=SimpleNamespace(content=json.dumps(output)),
                )
            ]
        )

    call = Mock(side_effect=create)
    constructor = Mock(
        return_value=SimpleNamespace(
            chat=SimpleNamespace(completions=SimpleNamespace(create=call))
        )
    )
    monkeypatch.setenv("OPENROUTER_API_KEY", "test-only-no-network")
    monkeypatch.setattr(routes, "OpenAI", constructor)
    return call, constructor


def opening_fixture(client, admin_headers, participant_headers):
    form = create_form(client, admin_headers, questions=["What should schools do?"])
    submit_response(client, participant_headers, form["id"], {"q1": SOURCE})
    rid = client.get(f"/forms/{form['id']}/rounds", headers=admin_headers).json()[0][
        "id"
    ]
    return f"/forms/{form['id']}/rounds/{rid}/generate_synthesis", rid


def test_opening_one_call_saves_validated_source_map(
    client, admin_headers, participant_headers, monkeypatch
):
    url, rid = opening_fixture(client, admin_headers, participant_headers)
    call, constructor = provider(monkeypatch, opening_output())
    monkeypatch.setattr(
        routes,
        "_resolve_synthesis_model",
        lambda db, model=None: model or "configured-model",
    )
    got = client.post(url, headers=admin_headers, json={})
    assert got.status_code == 200, got.text
    data = got.json()
    assert data["strategy"] == "grounded" and data["model_used"] == "configured-model"
    graph = data["synthesis_json"]["reasoning_graph"]
    assert graph["claims"][0]["sources"][0]["quote"] == SOURCE
    assert graph["response_coverage"][0]["status"] == "mapped"
    assert "confidence_map" not in data["synthesis_json"]
    call.assert_called_once()
    assert constructor.call_args.kwargs["max_retries"] == 0
    assert call.call_args.kwargs["response_format"] == {"type": "json_object"}
    assert call.call_args.kwargs["extra_body"]["provider"]["sort"] == "latency"
    assert "Committee" not in call.call_args.kwargs["messages"][1]["content"]
    with TestingSessionLocal() as db:
        assert db.query(SynthesisVersion).filter_by(round_id=rid).count() == 1


@pytest.mark.parametrize("failure", ["quote", "coverage", "flow", "truncated"])
def test_invalid_opening_retains_previous_draft(
    client, admin_headers, participant_headers, monkeypatch, failure
):
    url, rid = opening_fixture(client, admin_headers, participant_headers)
    with TestingSessionLocal() as db:
        row = db.get(RoundModel, rid)
        row.synthesis = "Previous approved text"
        db.commit()
    output = opening_output()
    if failure == "quote":
        output["normalized_claims"][0]["sources"][0]["quote"] = (
            "Fabricated source quotation"
        )
    elif failure == "coverage":
        output["response_coverage"] = []
    elif failure == "flow":
        output["reasoning_flows"][0]["nodes"][0]["quote"] = "Another invented quotation"
    call, _ = provider(
        monkeypatch, output, finish="length" if failure == "truncated" else "stop"
    )
    got = client.post(url, headers=admin_headers, json={"strategy": "grounded"})
    assert got.status_code == 502, got.text
    call.assert_called_once()
    with TestingSessionLocal() as db:
        assert db.get(RoundModel, rid).synthesis == "Previous approved text"
        assert db.query(SynthesisVersion).filter_by(round_id=rid).count() == 0


def test_missing_provider_never_silently_creates_mock(
    client, admin_headers, participant_headers, monkeypatch
):
    url, rid = opening_fixture(client, admin_headers, participant_headers)
    monkeypatch.delenv("OPENROUTER_API_KEY", raising=False)
    call = Mock()
    monkeypatch.setattr(routes, "OpenAI", call)
    assert client.post(url, headers=admin_headers, json={}).status_code == 503
    call.assert_not_called()
    with TestingSessionLocal() as db:
        assert db.query(SynthesisVersion).filter_by(round_id=rid).count() == 0


def final_output(account, threshold=60):
    material = final_material(account, threshold)
    return {
        "sections": [
            {
                "id": name,
                "paragraphs": [
                    {
                        "text": "The inferred exception remains unconfirmed. Experts retained different views about access, with the original reasons available for review.",
                        "claim_ids": [c["id"] for c in claims],
                    }
                ]
                if claims
                else [],
            }
            for name, claims in material["groups"].items()
        ]
    }


def test_final_one_call_snapshot_and_context_preservation(
    client, admin_headers, monkeypatch
):
    fid = final_fixture(client, admin_headers)
    url = f"/forms/{fid}/final_synthesis"
    initial = client.get(url, headers=admin_headers).json()
    account = initial["preview"]
    call, _ = provider(monkeypatch, final_output(account))
    got = client.post(
        url + "/generate",
        headers=admin_headers,
        json={
            "expected_revision": account["revision"],
            "threshold": 60,
            "model": "chosen-model",
        },
    )
    assert got.status_code == 200, got.text
    draft = got.json()["narrative"]
    assert draft["revision"] == account["revision"] and draft["model"] == "chosen-model"
    assert got.json()["preview"]["claims"] == account["claims"]
    call.assert_called_once()
    saved = client.post(
        url,
        headers=admin_headers,
        json={"expected_revision": account["revision"], "threshold": 60},
    ).json()["saved"]
    assert saved["generated_narrative"] == draft
    with TestingSessionLocal() as db:
        rid = db.query(RoundModel).filter_by(form_id=fid, round_number=3).one().id
    patched = client.patch(
        f"/forms/{fid}/rounds/{rid}",
        headers=admin_headers,
        json={"context_settings": {"final_narrative": {"fake": True}}},
    )
    assert patched.status_code == 200, patched.text
    assert client.get(url, headers=admin_headers).json()["narrative"] == draft


@pytest.mark.parametrize(
    "failure", ["wrong_group", "missing_claim", "inference", "percentage", "revision"]
)
def test_final_failures_keep_prior_text(client, admin_headers, monkeypatch, failure):
    fid = final_fixture(client, admin_headers)
    url = f"/forms/{fid}/final_synthesis"
    account = client.get(url, headers=admin_headers).json()["preview"]
    prior = {
        "revision": account["revision"],
        "threshold": 60,
        "sections": [],
        "model": "previous",
    }
    with TestingSessionLocal() as db:
        r = db.query(RoundModel).filter_by(form_id=fid, round_number=3).one()
        rid = r.id
        r.context_settings = {"final_narrative": prior}
        db.commit()
    output = final_output(account)
    group = next(s for s in output["sections"] if s["paragraphs"])
    if failure == "wrong_group":
        group["paragraphs"][0]["claim_ids"] = ["unknown"]
    elif failure == "missing_claim":
        group["paragraphs"] = []
    elif failure == "inference":
        group["paragraphs"][0]["text"] = "This assumption is now proved."
    elif failure == "percentage":
        group["paragraphs"][0]["text"] += " 90% agree."

    def change_response():
        if failure == "revision":
            with TestingSessionLocal() as db:
                r = db.query(Response).filter_by(round_id=rid).first()
                r.answers = {**r.answers, "q3": "A changed justification"}
                db.commit()

    call, _ = provider(monkeypatch, output, callback=change_response)
    got = client.post(
        url + "/generate",
        headers=admin_headers,
        json={"expected_revision": account["revision"], "threshold": 60},
    )
    assert got.status_code == (409 if failure == "revision" else 502), got.text
    call.assert_called_once()
    assert client.get(url, headers=admin_headers).json()["narrative"] == prior


def test_threshold_uses_exact_all_position_denominator():
    claim = {
        "id": "a",
        "positions": [
            {"label": "Agree", "count": 3},
            {"label": "Unable to judge", "count": 1},
            {"label": "Not recorded", "count": 1},
        ],
    }
    account = {"title": "Panel", "claims": [claim]}
    assert final_material(account, 60)["groups"]["consensus"]
    assert final_material(account, 61)["groups"]["disagreement"]
    claim["positions"][0]["label"] = "Strongly disagree"
    assert (
        final_material(account, 60)["groups"]["consensus"][0]["recorded_counts"][
            "disagree"
        ]
        == 3
    )


def test_opening_covers_empty_contributions_without_manufacturing_claims():
    output = opening_output()
    output["response_coverage"].append(
        {
            "response_number": 2,
            "status": "no_substantive_claim",
            "reason": "Blank answer",
        }
    )
    graph = parse_opening(
        json.dumps(output),
        [
            {"response_id": 1, "answers": {"q1": SOURCE}},
            {"response_id": 2, "answers": {"q1": ""}},
        ],
    )
    assert len(graph["claims"]) == 1 and graph["response_count"] == 2


def test_short_substantive_answer_can_be_attributed_but_not_a_tiny_fragment():
    output = opening_output()
    output["normalized_claims"][0]["text"] = "Ban phones."
    output["normalized_claims"][0]["sources"][0]["quote"] = "Ban phones."
    output["reasoning_flows"][0]["nodes"][0].update(
        text="Ban phones.", quote="Ban phones."
    )
    graph = parse_opening(
        json.dumps(output), [{"response_id": 1, "answers": {"q1": "Ban phones."}}]
    )
    assert graph["claims"][0]["sources"][0]["quote"] == "Ban phones."
    with pytest.raises(ValueError):
        parse_opening(
            json.dumps(output),
            [
                {
                    "response_id": 1,
                    "answers": {"q1": "Ban phones. Exceptions need safeguards."},
                }
            ],
        )


def test_opening_generation_cannot_rewrite_claims_after_review_starts(
    client, admin_headers, monkeypatch
):
    fid = final_fixture(client, admin_headers)
    with TestingSessionLocal() as db:
        opening = db.query(RoundModel).filter_by(form_id=fid, round_number=1).one()
        rid = opening.id
        expert = db.query(Response).filter_by(form_id=fid).first().user_id
        db.add(
            Response(form_id=fid, round_id=rid, user_id=expert, answers={"q1": SOURCE})
        )
        db.commit()
    call, _ = provider(monkeypatch, opening_output())
    got = client.post(
        f"/forms/{fid}/rounds/{rid}/generate_synthesis", headers=admin_headers, json={}
    )
    assert got.status_code == 409, got.text
    call.assert_not_called()


def test_source_ids_attach_exact_answers_without_model_copying():
    output = opening_output()
    output["normalized_claims"][0]["sources"] = [
        {"source_id": "r1_a1", "stance": "support"}
    ]
    node = output["reasoning_flows"][0]["nodes"][0]
    node.pop("quote")
    node["source_id"] = "r1_a1"
    graph = parse_opening(
        json.dumps(output), [{"response_id": 91, "answers": {"q1": SOURCE}}]
    )
    assert graph["claims"][0]["sources"][0]["quote"] == SOURCE
    assert graph["flows"][0]["nodes"][0]["quote"] == SOURCE


@pytest.mark.parametrize("source_id", ["r9_a1", "r2_a1"])
def test_flow_source_ids_cannot_cross_responses(source_id):
    output = opening_output()
    node = output["reasoning_flows"][0]["nodes"][0]
    node["source_id"] = source_id
    with pytest.raises((KeyError, ValueError)):
        parse_opening(
            json.dumps(output),
            [
                {"response_id": 91, "answers": {"q1": SOURCE}},
                {
                    "response_id": 92,
                    "answers": {"q1": "A different answer from another expert."},
                },
            ],
        )
