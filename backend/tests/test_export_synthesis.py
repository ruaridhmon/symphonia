"""Tests for the synthesis export endpoint: GET /forms/{form_id}/export_synthesis."""

from __future__ import annotations

import json

import pytest
from fastapi.testclient import TestClient

from tests.conftest import create_form, submit_response
from tests.conftest import TestingSessionLocal
from core.models import RoundModel


# ── Module-scoped fixtures ────────────────────────────────────────────────────


@pytest.fixture(scope="module")
def seeded_form(client: TestClient, admin_headers: dict, participant_token: str):
    """Create a form, submit responses, and generate a synthesis so there's
    data to export. Returns (form_id, admin_headers, participant_headers)."""
    participant_headers = {"Authorization": f"Bearer {participant_token}"}

    # Create form
    form = create_form(
        client,
        admin_headers,
        title="Export Test Form",
        questions=["What is your view on X?", "How confident are you?"],
    )
    form_id = form["id"]

    # Unlock form for participant
    client.post(
        "/forms/unlock",
        json={"join_code": form["join_code"]},
        headers=participant_headers,
    )

    # Submit response from participant
    submit_response(
        client,
        participant_headers,
        form_id,
        {"q1": "I think X is promising", "q2": "Very confident"},
    )

    # Generate a synthesis (mock mode is active via conftest)
    resp = client.post(
        f"/forms/{form_id}/rounds/{_get_active_round_id(client, form_id, admin_headers)}/generate_synthesis",
        json={"model": "mock", "strategy": "simple"},
        headers=admin_headers,
    )
    assert resp.status_code == 200, f"generate_synthesis failed: {resp.text}"

    return form_id, admin_headers, participant_headers


def _get_active_round_id(client: TestClient, form_id: int, headers: dict) -> int:
    resp = client.get(f"/forms/{form_id}/active_round", headers=headers)
    assert resp.status_code == 200
    return resp.json()["id"]


def _seed_round_two_probe(form_id: int) -> None:
    db = TestingSessionLocal()
    try:
        round_obj = (
            db.query(RoundModel)
            .filter(RoundModel.form_id == form_id, RoundModel.round_number == 1)
            .first()
        )
        assert round_obj is not None
        round_obj.synthesis = (
            "Below is a synthesis you can use as the Round 1 feedback report "
            "and as the basis for Round 2. Participants agreed on the main risk."
        )
        round_obj.synthesis_json = {
            "narrative": (
                "Below is a synthesis you can use as the Round 1 feedback report "
                "and as the basis for Round 2. Participants agreed on the main risk."
            ),
            "follow_up_probes": [
                {
                    "question": "Can you elaborate on the specific risks of the aggressive timeline?",
                    "target_experts": [1],
                    "rationale": "Clarify trade-offs between speed and quality",
                }
            ],
        }
        db.commit()
    finally:
        db.close()


# ── Tests ─────────────────────────────────────────────────────────────────────


class TestExportSynthesisMarkdown:
    """Test markdown export format."""

    def test_markdown_export_returns_200(self, client: TestClient, seeded_form):
        form_id, admin_headers, _ = seeded_form
        resp = client.get(
            f"/forms/{form_id}/export_synthesis?format=markdown",
            headers=admin_headers,
        )
        assert resp.status_code == 200

    def test_markdown_export_content_type(self, client: TestClient, seeded_form):
        form_id, admin_headers, _ = seeded_form
        resp = client.get(
            f"/forms/{form_id}/export_synthesis?format=markdown",
            headers=admin_headers,
        )
        assert "text/markdown" in resp.headers.get("content-type", "")

    def test_markdown_export_has_title(self, client: TestClient, seeded_form):
        form_id, admin_headers, _ = seeded_form
        resp = client.get(
            f"/forms/{form_id}/export_synthesis?format=markdown",
            headers=admin_headers,
        )
        body = resp.text
        assert "Export Test Form" in body

    def test_markdown_export_has_round_info(self, client: TestClient, seeded_form):
        form_id, admin_headers, _ = seeded_form
        resp = client.get(
            f"/forms/{form_id}/export_synthesis?format=markdown",
            headers=admin_headers,
        )
        body = resp.text
        assert "## Round 1" in body

    def test_markdown_export_formats_round_two_questions(
        self, client: TestClient, seeded_form
    ):
        form_id, admin_headers, _ = seeded_form
        _seed_round_two_probe(form_id)
        resp = client.get(
            f"/forms/{form_id}/export_synthesis?format=markdown",
            headers=admin_headers,
        )
        body = resp.text
        assert "## Round 1 Feedback Report" in body
        assert "### Proposed Questions for Round 2" in body
        assert "Can you elaborate on the specific risks" in body
        assert "Below is a synthesis you can use" not in body

    def test_markdown_export_has_content_disposition(
        self, client: TestClient, seeded_form
    ):
        form_id, admin_headers, _ = seeded_form
        resp = client.get(
            f"/forms/{form_id}/export_synthesis?format=markdown",
            headers=admin_headers,
        )
        disposition = resp.headers.get("content-disposition", "")
        assert "attachment" in disposition
        assert ".md" in disposition

    def test_markdown_default_format(self, client: TestClient, seeded_form):
        """When no format param is given, default is markdown."""
        form_id, admin_headers, _ = seeded_form
        resp = client.get(
            f"/forms/{form_id}/export_synthesis",
            headers=admin_headers,
        )
        assert resp.status_code == 200
        assert "text/markdown" in resp.headers.get("content-type", "")


class TestExportSynthesisJson:
    """Test JSON export format."""

    def test_json_export_returns_200(self, client: TestClient, seeded_form):
        form_id, admin_headers, _ = seeded_form
        resp = client.get(
            f"/forms/{form_id}/export_synthesis?format=json",
            headers=admin_headers,
        )
        assert resp.status_code == 200

    def test_json_export_is_valid_json(self, client: TestClient, seeded_form):
        form_id, admin_headers, _ = seeded_form
        resp = client.get(
            f"/forms/{form_id}/export_synthesis?format=json",
            headers=admin_headers,
        )
        data = json.loads(resp.text)
        assert "form_id" in data
        assert "title" in data
        assert "rounds" in data

    def test_json_export_has_round_data(self, client: TestClient, seeded_form):
        form_id, admin_headers, _ = seeded_form
        resp = client.get(
            f"/forms/{form_id}/export_synthesis?format=json",
            headers=admin_headers,
        )
        data = json.loads(resp.text)
        assert len(data["rounds"]) >= 1
        round_data = data["rounds"][0]
        assert "round_number" in round_data
        assert "questions" in round_data

    def test_json_export_has_next_round_questions(
        self, client: TestClient, seeded_form
    ):
        form_id, admin_headers, _ = seeded_form
        _seed_round_two_probe(form_id)
        resp = client.get(
            f"/forms/{form_id}/export_synthesis?format=json",
            headers=admin_headers,
        )
        data = json.loads(resp.text)
        assert data["rounds"][0]["next_round_questions"] == [
            "Can you elaborate on the specific risks of the aggressive timeline?"
        ]

    def test_json_export_content_disposition(self, client: TestClient, seeded_form):
        form_id, admin_headers, _ = seeded_form
        resp = client.get(
            f"/forms/{form_id}/export_synthesis?format=json",
            headers=admin_headers,
        )
        disposition = resp.headers.get("content-disposition", "")
        assert "attachment" in disposition
        assert ".json" in disposition


class TestExportSynthesisErrors:
    """Test error cases."""

    def test_missing_form_returns_404(self, client: TestClient, seeded_form):
        _, admin_headers, _ = seeded_form
        resp = client.get(
            "/forms/99999/export_synthesis?format=markdown",
            headers=admin_headers,
        )
        assert resp.status_code == 404

    def test_unauthenticated_returns_401(self, client: TestClient, seeded_form):
        form_id, _, _ = seeded_form
        resp = client.get(f"/forms/{form_id}/export_synthesis?format=markdown")
        assert resp.status_code in (401, 403)

    def test_invalid_format_returns_422(self, client: TestClient, seeded_form):
        form_id, admin_headers, _ = seeded_form
        resp = client.get(
            f"/forms/{form_id}/export_synthesis?format=xlsx",
            headers=admin_headers,
        )
        assert resp.status_code == 422

    def test_participant_can_export(self, client: TestClient, seeded_form):
        """Non-admin authenticated users should also be able to export."""
        form_id, _, participant_headers = seeded_form
        resp = client.get(
            f"/forms/{form_id}/export_synthesis?format=json",
            headers=participant_headers,
        )
        assert resp.status_code == 200


class TestExportSynthesisPdf:
    """Test PDF export format."""

    def test_pdf_export_returns_200(self, client: TestClient, seeded_form):
        form_id, admin_headers, _ = seeded_form
        resp = client.get(
            f"/forms/{form_id}/export_synthesis?format=pdf",
            headers=admin_headers,
        )
        assert resp.status_code == 200

    def test_pdf_export_has_content_disposition(self, client: TestClient, seeded_form):
        form_id, admin_headers, _ = seeded_form
        resp = client.get(
            f"/forms/{form_id}/export_synthesis?format=pdf",
            headers=admin_headers,
        )
        disposition = resp.headers.get("content-disposition", "")
        assert "attachment" in disposition
        assert ".pdf" in disposition

    def test_pdf_export_content_type(self, client: TestClient, seeded_form):
        form_id, admin_headers, _ = seeded_form
        resp = client.get(
            f"/forms/{form_id}/export_synthesis?format=pdf",
            headers=admin_headers,
        )
        assert "application/pdf" in resp.headers.get("content-type", "")

    def test_pdf_export_returns_pdf_bytes(self, client: TestClient, seeded_form):
        form_id, admin_headers, _ = seeded_form
        resp = client.get(
            f"/forms/{form_id}/export_synthesis?format=pdf",
            headers=admin_headers,
        )
        assert resp.content.startswith(b"%PDF")

    def test_pdf_export_uses_bold_heading_font(self, client: TestClient, seeded_form):
        form_id, admin_headers, _ = seeded_form
        resp = client.get(
            f"/forms/{form_id}/export_synthesis?format=pdf",
            headers=admin_headers,
        )
        assert b"Helvetica-Bold" in resp.content


class TestSynthesisDisplayPreferences:
    """Test persisted synthesis display preferences."""

    def test_display_preferences_are_saved_on_round_and_active_version(
        self, client: TestClient, seeded_form
    ):
        form_id, admin_headers, _ = seeded_form
        round_id = _get_active_round_id(client, form_id, admin_headers)

        resp = client.patch(
            f"/forms/{form_id}/rounds/{round_id}/synthesis_display",
            headers=admin_headers,
            json={
                "summary_options": {
                    "statistics": False,
                    "narrative": True,
                    "agreements": True,
                    "disagreements": False,
                    "nuances": True,
                    "consensusMap": True,
                    "probes": False,
                },
                "summary_order": [
                    "narrative",
                    "consensusMap",
                    "agreements",
                    "nuances",
                ],
                "synthesis_background": "paper",
            },
        )

        assert resp.status_code == 200
        body = resp.json()
        assert body["synthesis_json"]["summary_options"]["consensusMap"] is True
        assert body["synthesis_json"]["summary_options"]["statistics"] is False
        assert body["synthesis_json"]["summary_order"][:4] == [
            "narrative",
            "consensusMap",
            "agreements",
            "nuances",
        ]
        assert body["synthesis_json"]["synthesis_background"] == "paper"

        rounds_resp = client.get(f"/forms/{form_id}/rounds", headers=admin_headers)
        assert rounds_resp.status_code == 200
        saved_round = next(r for r in rounds_resp.json() if r["id"] == round_id)
        assert saved_round["synthesis_json"]["summary_options"]["consensusMap"] is True

        versions_resp = client.get(
            f"/forms/{form_id}/rounds/{round_id}/synthesis_versions",
            headers=admin_headers,
        )
        assert versions_resp.status_code == 200
        active_version = next(v for v in versions_resp.json() if v["is_active"])
        assert active_version["synthesis_json"]["synthesis_background"] == "paper"
