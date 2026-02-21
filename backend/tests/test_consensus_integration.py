"""
Consensus Library Integration Tests (Task 5.2).

Focused integration testing of the synthesis adapter through the FastAPI API
layer. Complements the unit tests in test_synthesis.py and the user journey
tests in test_e2e_journey.py.

Coverage:
  1. Factory integration (get_synthesiser modes, env var)
  2. Mock synthesis through API (structured output, convergence, persistence)
  3. Synthesis versioning integration (generate, list, activate)
  4. Structured output validation (field-level schema checks)
  5. AI-assisted mode (FollowUp records with author_type="ai")
  6. Error scenarios through API (missing round, no responses, invalid mode)
  7. Multi-round synthesis (independent synthesis per round)
  8. Synthesis data persistence (round-level fields)
"""
from __future__ import annotations

import json
import os
from typing import List

import pytest
from fastapi.testclient import TestClient

from core.synthesis import (
    ConsensusLibraryAdapter,
    MockSynthesis,
    SynthesisConfigError,
    SynthesisResult,
    get_synthesiser,
)
from tests.conftest import create_form, register_and_login, submit_response


# =========================================================================
# Helpers
# =========================================================================

def _setup_form_with_responses(
    client: TestClient,
    admin_headers: dict,
    title: str = "Integration Test Form",
    join_code: str = "INT001",
    questions: list | None = None,
    n_participants: int = 3,
    participant_prefix: str = "integ",
) -> dict:
    """Create a form, register participants, submit responses, and return metadata.

    Returns dict with keys: form_id, participant_tokens, participant_headers_list.
    """
    if questions is None:
        questions = ["What is the main challenge?", "What is your proposed solution?"]

    form = create_form(
        client, admin_headers, title=title, questions=questions, join_code=join_code
    )
    form_id = form["id"]

    tokens: List[str] = []
    headers_list: List[dict] = []
    for i in range(n_participants):
        email = f"{participant_prefix}_{i}@test.com"
        token = register_and_login(client, email)
        tokens.append(token)
        h = {"Authorization": f"Bearer {token}"}
        headers_list.append(h)

        # Unlock form
        resp = client.post("/forms/unlock", json={"join_code": join_code}, headers=h)
        assert resp.status_code == 200

        # Submit response
        submit_response(
            client,
            h,
            form_id,
            {f"q{j+1}": f"Answer {i} to question {j+1}" for j in range(len(questions))},
        )

    return {
        "form_id": form_id,
        "participant_tokens": tokens,
        "participant_headers_list": headers_list,
    }


# =========================================================================
# 1. Factory Integration
# =========================================================================


class TestFactoryIntegration:
    """Test get_synthesiser factory returns correct types and produces valid results."""

    def test_mock_mode_returns_mock_synthesis(self):
        s = get_synthesiser(mode="mock")
        assert isinstance(s, MockSynthesis)

    @pytest.mark.asyncio
    async def test_mock_produces_valid_synthesis_result(self):
        s = get_synthesiser(mode="mock")
        assert isinstance(s, MockSynthesis)
        result = await s.run(
            questions=[{"label": "Q1"}],
            responses=[{"answers": {"q1": "A1"}}, {"answers": {"q1": "A2"}}],
        )
        assert isinstance(result, SynthesisResult)
        assert len(result.agreements) > 0
        assert "overall" in result.confidence_map
        assert result.provenance["mode"] == "mock"

    def test_simple_mode_returns_adapter(self):
        s = get_synthesiser(mode="simple")
        assert isinstance(s, ConsensusLibraryAdapter)
        assert s._effective_strategy == "simple"

    def test_committee_falls_back_to_ttd(self):
        s = get_synthesiser(mode="committee")
        assert isinstance(s, ConsensusLibraryAdapter)
        assert s.strategy_name == "committee"
        assert s._effective_strategy == "ttd"

    def test_factory_respects_synthesis_mode_env_var(self, monkeypatch):
        monkeypatch.setenv("SYNTHESIS_MODE", "mock")
        s = get_synthesiser()
        assert isinstance(s, MockSynthesis)

    def test_factory_rejects_invalid_mode(self):
        with pytest.raises(SynthesisConfigError, match="Unknown synthesis mode"):
            get_synthesiser(mode="nonexistent_mode")


# =========================================================================
# 2. Mock Synthesis Through API
# =========================================================================


class TestMockSynthesisThroughAPI:
    """Test mock synthesis via the /synthesise_committee API endpoint."""

    form_id: int = 0
    synthesis_response: dict = {}

    def test_01_setup_form_with_responses(
        self, client: TestClient, admin_headers: dict
    ):
        """Create form with 3 participants and responses."""
        meta = _setup_form_with_responses(
            client,
            admin_headers,
            title="Mock Synthesis API Test",
            join_code="MSAPI1",
            participant_prefix="mock_api",
        )
        TestMockSynthesisThroughAPI.form_id = meta["form_id"]

    def test_02_synthesise_returns_structured_json(
        self, client: TestClient, admin_headers: dict
    ):
        """POST synthesise_committee returns synthesis with structured fields."""
        resp = client.post(
            f"/forms/{self.form_id}/synthesise_committee",
            json={"model": "mock", "mode": "human_only", "n_analysts": 3},
            headers=admin_headers,
        )
        assert resp.status_code == 200
        data = resp.json()
        TestMockSynthesisThroughAPI.synthesis_response = data

        assert "synthesis" in data
        assert "convergence_score" in data
        assert "text_synthesis" in data

    def test_03_synthesis_json_contains_all_required_keys(self):
        """synthesis_json has all expected top-level keys."""
        sj = self.synthesis_response["synthesis"]
        required_keys = [
            "agreements",
            "disagreements",
            "nuances",
            "confidence_map",
            "follow_up_probes",
            "provenance",
            "emergent_insights",
            "minority_reports",
        ]
        for key in required_keys:
            assert key in sj, f"Missing key: {key}"

    def test_04_convergence_score_computed(self):
        """Convergence score is a number."""
        score = self.synthesis_response["convergence_score"]
        assert score is not None
        assert isinstance(score, (int, float))

    def test_05_text_synthesis_is_html(self):
        """Text synthesis is non-empty HTML for backwards compat."""
        text = self.synthesis_response["text_synthesis"]
        assert text is not None
        assert len(text) > 0
        # Should contain HTML tags (agreements/disagreements/nuances)
        assert "<h3>" in text or "Synthesis complete" in text

    def test_06_synthesis_json_retrievable_via_rounds(
        self, client: TestClient, admin_headers: dict
    ):
        """GET /forms/{id}/rounds returns synthesis_json on the active round."""
        resp = client.get(
            f"/forms/{self.form_id}/rounds",
            headers=admin_headers,
        )
        assert resp.status_code == 200
        rounds = resp.json()
        active = [r for r in rounds if r["is_active"]]
        assert len(active) == 1
        r = active[0]
        assert r["synthesis_json"] is not None
        assert "agreements" in r["synthesis_json"]
        assert r["convergence_score"] is not None


# =========================================================================
# 3. Synthesis Versioning Integration
# =========================================================================


class TestSynthesisVersioningIntegration:
    """Test synthesis version lifecycle: generate, list, activate."""

    form_id: int = 0
    round_id: int = 0
    version_1_id: int = 0
    version_2_id: int = 0
    version_3_id: int = 0

    def test_01_setup(self, client: TestClient, admin_headers: dict):
        """Create form with responses for versioning tests."""
        meta = _setup_form_with_responses(
            client,
            admin_headers,
            title="Versioning Test Form",
            join_code="VERS01",
            participant_prefix="vers",
        )
        TestSynthesisVersioningIntegration.form_id = meta["form_id"]

        # Get round ID
        resp = client.get(
            f"/forms/{meta['form_id']}/rounds",
            headers=admin_headers,
        )
        rounds = resp.json()
        active = [r for r in rounds if r["is_active"]]
        TestSynthesisVersioningIntegration.round_id = active[0]["id"]

    def test_02_generate_first_version(
        self, client: TestClient, admin_headers: dict
    ):
        """POST generate_synthesis creates version 1."""
        resp = client.post(
            f"/forms/{self.form_id}/rounds/{self.round_id}/generate_synthesis",
            json={"model": "mock", "strategy": "simple", "n_analysts": 3},
            headers=admin_headers,
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["version"] == 1
        assert data["is_active"] is False
        TestSynthesisVersioningIntegration.version_1_id = data["id"]

    def test_03_generate_second_version(
        self, client: TestClient, admin_headers: dict
    ):
        """Second generate increments version to 2."""
        resp = client.post(
            f"/forms/{self.form_id}/rounds/{self.round_id}/generate_synthesis",
            json={"model": "mock", "strategy": "committee", "n_analysts": 2},
            headers=admin_headers,
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["version"] == 2
        TestSynthesisVersioningIntegration.version_2_id = data["id"]

    def test_04_generate_third_version(
        self, client: TestClient, admin_headers: dict
    ):
        """Third generate increments version to 3."""
        resp = client.post(
            f"/forms/{self.form_id}/rounds/{self.round_id}/generate_synthesis",
            json={"model": "mock", "strategy": "simple"},
            headers=admin_headers,
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["version"] == 3
        TestSynthesisVersioningIntegration.version_3_id = data["id"]

    def test_05_list_all_versions(
        self, client: TestClient, admin_headers: dict
    ):
        """GET synthesis_versions returns all 3 versions in order."""
        resp = client.get(
            f"/forms/{self.form_id}/rounds/{self.round_id}/synthesis_versions",
            headers=admin_headers,
        )
        assert resp.status_code == 200
        versions = resp.json()
        assert len(versions) == 3
        assert [v["version"] for v in versions] == [1, 2, 3]
        # All should be inactive initially
        assert all(v["is_active"] is False for v in versions)

    def test_06_activate_version_2(
        self, client: TestClient, admin_headers: dict
    ):
        """PUT activate sets is_active and copies to round."""
        resp = client.put(
            f"/synthesis_versions/{self.version_2_id}/activate",
            headers=admin_headers,
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["is_active"] is True
        assert data["version"] == 2

    def test_07_only_one_active_at_a_time(
        self, client: TestClient, admin_headers: dict
    ):
        """After activating v2, only v2 is active."""
        resp = client.get(
            f"/forms/{self.form_id}/rounds/{self.round_id}/synthesis_versions",
            headers=admin_headers,
        )
        versions = resp.json()
        active = [v for v in versions if v["is_active"]]
        assert len(active) == 1
        assert active[0]["version"] == 2

    def test_08_activate_different_version_deactivates_previous(
        self, client: TestClient, admin_headers: dict
    ):
        """Activating v3 deactivates v2."""
        resp = client.put(
            f"/synthesis_versions/{self.version_3_id}/activate",
            headers=admin_headers,
        )
        assert resp.status_code == 200

        resp = client.get(
            f"/forms/{self.form_id}/rounds/{self.round_id}/synthesis_versions",
            headers=admin_headers,
        )
        versions = resp.json()
        active = [v for v in versions if v["is_active"]]
        assert len(active) == 1
        assert active[0]["version"] == 3

    def test_09_activated_version_appears_on_round(
        self, client: TestClient, admin_headers: dict
    ):
        """The activated version's synthesis is copied to the round."""
        # Get the activated version's synthesis text
        resp = client.get(
            f"/synthesis_versions/{self.version_3_id}",
            headers=admin_headers,
        )
        version_data = resp.json()

        # Get the round
        resp = client.get(
            f"/forms/{self.form_id}/rounds",
            headers=admin_headers,
        )
        rounds = resp.json()
        r = [r for r in rounds if r["id"] == self.round_id][0]
        assert r["synthesis"] == version_data["synthesis"]


# =========================================================================
# 4. Structured Output Validation
# =========================================================================


class TestStructuredOutputValidation:
    """Validate the detailed structure of synthesis output fields."""

    synthesis_dict: dict = {}

    def test_01_run_synthesis_and_capture(
        self, client: TestClient, admin_headers: dict
    ):
        """Run synthesis to get structured output for validation."""
        meta = _setup_form_with_responses(
            client,
            admin_headers,
            title="Structure Validation Form",
            join_code="STRV01",
            participant_prefix="struct_val",
        )
        resp = client.post(
            f"/forms/{meta['form_id']}/synthesise_committee",
            json={"model": "mock", "mode": "human_only", "n_analysts": 3},
            headers=admin_headers,
        )
        assert resp.status_code == 200
        TestStructuredOutputValidation.synthesis_dict = resp.json()["synthesis"]

    def test_02_agreements_structure(self):
        """Each agreement has claim, supporting_experts, confidence, evidence_summary."""
        agreements = self.synthesis_dict["agreements"]
        assert len(agreements) > 0
        for a in agreements:
            assert isinstance(a["claim"], str) and len(a["claim"]) > 0
            assert isinstance(a["supporting_experts"], list)
            assert all(isinstance(e, int) for e in a["supporting_experts"])
            assert isinstance(a["confidence"], (int, float))
            assert 0 <= a["confidence"] <= 1
            assert isinstance(a["evidence_summary"], str)

    def test_03_disagreements_structure(self):
        """Each disagreement has topic, positions (list[dict]), severity."""
        disagreements = self.synthesis_dict["disagreements"]
        assert len(disagreements) > 0
        for d in disagreements:
            assert isinstance(d["topic"], str) and len(d["topic"]) > 0
            assert isinstance(d["positions"], list)
            for p in d["positions"]:
                assert isinstance(p, dict)
            assert d["severity"] in ("low", "moderate", "high")

    def test_04_nuances_structure(self):
        """Each nuance has claim, context, relevant_experts."""
        nuances = self.synthesis_dict["nuances"]
        assert len(nuances) > 0
        for n in nuances:
            assert isinstance(n["claim"], str)
            assert isinstance(n["context"], str)
            assert isinstance(n["relevant_experts"], list)
            assert all(isinstance(e, int) for e in n["relevant_experts"])

    def test_05_probes_structure(self):
        """Each follow_up_probe has question, target_experts, rationale."""
        probes = self.synthesis_dict["follow_up_probes"]
        assert len(probes) > 0
        for p in probes:
            assert isinstance(p["question"], str) and len(p["question"]) > 0
            assert isinstance(p["target_experts"], list)
            assert all(isinstance(e, int) for e in p["target_experts"])
            assert isinstance(p["rationale"], str) and len(p["rationale"]) > 0

    def test_06_emergent_insights_structure(self):
        """Each emergent insight has insight, contributing_experts, emergence_type, explanation."""
        insights = self.synthesis_dict["emergent_insights"]
        assert len(insights) > 0
        for ei in insights:
            assert isinstance(ei["insight"], str) and len(ei["insight"]) > 0
            assert isinstance(ei["contributing_experts"], list)
            assert all(isinstance(e, int) for e in ei["contributing_experts"])
            assert isinstance(ei["emergence_type"], str)
            assert isinstance(ei["explanation"], str) and len(ei["explanation"]) > 0

    def test_07_minority_reports_structure(self):
        """Each minority report has claim, expert_ids, agreement_level, counterpoint, original_evidence."""
        reports = self.synthesis_dict["minority_reports"]
        assert len(reports) > 0
        for mr in reports:
            assert isinstance(mr["claim"], str) and len(mr["claim"]) > 0
            assert isinstance(mr["expert_ids"], list)
            assert all(isinstance(e, int) for e in mr["expert_ids"])
            assert mr["agreement_level"] in ("minority", "divided")
            assert isinstance(mr["counterpoint"], str) and len(mr["counterpoint"]) > 0
            assert isinstance(mr["original_evidence"], str)

    def test_08_confidence_map_structure(self):
        """confidence_map has 'overall' key with float value."""
        cm = self.synthesis_dict["confidence_map"]
        assert isinstance(cm, dict)
        assert "overall" in cm
        assert isinstance(cm["overall"], (int, float))

    def test_09_provenance_structure(self):
        """provenance has 'mode' key."""
        prov = self.synthesis_dict["provenance"]
        assert isinstance(prov, dict)
        assert "mode" in prov

    def test_10_result_is_json_serializable(self):
        """The entire synthesis dict can be serialized to JSON."""
        serialized = json.dumps(self.synthesis_dict)
        assert len(serialized) > 100
        # Round-trip
        deserialized = json.loads(serialized)
        assert deserialized["agreements"] == self.synthesis_dict["agreements"]


# =========================================================================
# 5. AI-Assisted Mode
# =========================================================================


class TestAIAssistedMode:
    """Test AI-assisted synthesis creates FollowUp records."""

    form_id: int = 0

    def test_01_setup_and_run_ai_assisted(
        self, client: TestClient, admin_headers: dict
    ):
        """Run synthesis with ai_assisted mode."""
        meta = _setup_form_with_responses(
            client,
            admin_headers,
            title="AI Assisted Test",
            join_code="AIAS01",
            participant_prefix="ai_asst",
        )
        TestAIAssistedMode.form_id = meta["form_id"]

        resp = client.post(
            f"/forms/{meta['form_id']}/synthesise_committee",
            json={"model": "mock", "mode": "ai_assisted", "n_analysts": 3},
            headers=admin_headers,
        )
        assert resp.status_code == 200

    def test_02_follow_ups_created_with_ai_author_type(
        self, client: TestClient, admin_headers: dict
    ):
        """AI-generated follow-ups should have author_type='ai'."""
        resp = client.get(
            f"/forms/{self.form_id}/follow_ups",
            headers=admin_headers,
        )
        assert resp.status_code == 200
        follow_ups = resp.json()
        # MockSynthesis generates at least 1 follow_up_probe
        ai_follow_ups = [fu for fu in follow_ups if fu["author_type"] == "ai"]
        assert len(ai_follow_ups) > 0

    def test_03_ai_follow_ups_have_questions(
        self, client: TestClient, admin_headers: dict
    ):
        """Each AI follow-up has a non-empty question."""
        resp = client.get(
            f"/forms/{self.form_id}/follow_ups",
            headers=admin_headers,
        )
        follow_ups = resp.json()
        ai_follow_ups = [fu for fu in follow_ups if fu["author_type"] == "ai"]
        for fu in ai_follow_ups:
            assert isinstance(fu["question"], str) and len(fu["question"]) > 0
            assert fu["author_id"] is None  # AI has no user ID


# =========================================================================
# 6. Error Scenarios Through API
# =========================================================================


class TestErrorScenarios:
    """Test error paths for synthesis API endpoints."""

    def test_synthesis_on_form_with_no_active_round(
        self, client: TestClient, admin_headers: dict
    ):
        """Synthesis on form with no active round returns 400."""
        # Create a form, then deactivate its round by advancing
        form = create_form(
            client,
            admin_headers,
            title="No Active Round Form",
            questions=["Q?"],
            join_code="NOACT1",
        )
        form_id = form["id"]

        # Submit a response first (needed so round 1 has data)
        tok = register_and_login(client, "noact_user@test.com")
        h = {"Authorization": f"Bearer {tok}"}
        client.post("/forms/unlock", json={"join_code": "NOACT1"}, headers=h)
        submit_response(client, h, form_id, {"q1": "answer"})

        # Advance to round 2 (deactivates round 1)
        client.post(f"/forms/{form_id}/next_round", headers=admin_headers)

        # Now synthesise — round 2 is active but has no responses
        resp = client.post(
            f"/forms/{form_id}/synthesise_committee",
            json={"model": "mock", "mode": "human_only", "n_analysts": 2},
            headers=admin_headers,
        )
        # Round 2 has no responses → 404
        assert resp.status_code == 404

    def test_synthesis_on_round_with_no_responses(
        self, client: TestClient, admin_headers: dict
    ):
        """Synthesis on round with no responses returns 404."""
        form = create_form(
            client,
            admin_headers,
            title="Empty Round Form",
            questions=["Q?"],
            join_code="EMPTY1",
        )
        resp = client.post(
            f"/forms/{form['id']}/synthesise_committee",
            json={"model": "mock", "mode": "human_only"},
            headers=admin_headers,
        )
        assert resp.status_code == 404

    def test_synthesis_with_invalid_mode(
        self, client: TestClient, admin_headers: dict
    ):
        """Synthesis with invalid flow mode returns 400."""
        meta = _setup_form_with_responses(
            client,
            admin_headers,
            title="Invalid Mode Form",
            join_code="INVM01",
            n_participants=1,
            participant_prefix="inv_mode",
        )
        resp = client.post(
            f"/forms/{meta['form_id']}/synthesise_committee",
            json={"model": "mock", "mode": "nonexistent_mode", "n_analysts": 2},
            headers=admin_headers,
        )
        assert resp.status_code == 400
        assert "Invalid mode" in resp.json()["detail"]


# =========================================================================
# 7. Multi-Round Synthesis
# =========================================================================


class TestMultiRoundSynthesis:
    """Test synthesis across multiple rounds maintains independence."""

    form_id: int = 0
    round_1_id: int = 0
    round_2_id: int = 0
    round_1_synthesis: dict = {}
    round_2_synthesis: dict = {}

    def test_01_create_form_and_submit_round_1(
        self, client: TestClient, admin_headers: dict
    ):
        """Create form and submit round 1 responses."""
        meta = _setup_form_with_responses(
            client,
            admin_headers,
            title="Multi-Round Synthesis Test",
            join_code="MRND01",
            questions=["Key issue?", "Proposal?"],
            n_participants=3,
            participant_prefix="mrnd",
        )
        TestMultiRoundSynthesis.form_id = meta["form_id"]

    def test_02_synthesise_round_1(
        self, client: TestClient, admin_headers: dict
    ):
        """Run synthesis on round 1."""
        resp = client.post(
            f"/forms/{self.form_id}/synthesise_committee",
            json={"model": "mock", "mode": "human_only", "n_analysts": 3},
            headers=admin_headers,
        )
        assert resp.status_code == 200
        TestMultiRoundSynthesis.round_1_synthesis = resp.json()["synthesis"]

        # Capture round 1 ID
        resp = client.get(
            f"/forms/{self.form_id}/rounds", headers=admin_headers
        )
        for r in resp.json():
            if r["round_number"] == 1:
                TestMultiRoundSynthesis.round_1_id = r["id"]

    def test_03_advance_to_round_2(
        self, client: TestClient, admin_headers: dict
    ):
        """Advance to round 2."""
        resp = client.post(
            f"/forms/{self.form_id}/next_round",
            json={"questions": ["Revised issue?", "Revised proposal?"]},
            headers=admin_headers,
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["round_number"] == 2
        TestMultiRoundSynthesis.round_2_id = data["id"]

    def test_04_submit_round_2_responses(
        self, client: TestClient, admin_headers: dict
    ):
        """Submit responses for round 2."""
        for i in range(3):
            email = f"mrnd_{i}@test.com"
            # Already registered from round 1 setup
            tok = register_and_login(client, email)
            h = {"Authorization": f"Bearer {tok}"}
            submit_response(
                client,
                h,
                self.form_id,
                {"q1": f"Revised issue {i}", "q2": f"Revised proposal {i}"},
            )

    def test_05_synthesise_round_2(
        self, client: TestClient, admin_headers: dict
    ):
        """Run synthesis on round 2."""
        resp = client.post(
            f"/forms/{self.form_id}/synthesise_committee",
            json={"model": "mock", "mode": "human_only", "n_analysts": 3},
            headers=admin_headers,
        )
        assert resp.status_code == 200
        TestMultiRoundSynthesis.round_2_synthesis = resp.json()["synthesis"]

    def test_06_both_rounds_retain_synthesis_independently(
        self, client: TestClient, admin_headers: dict
    ):
        """Both rounds have their own synthesis_json."""
        resp = client.get(
            f"/forms/{self.form_id}/rounds", headers=admin_headers
        )
        assert resp.status_code == 200
        rounds = resp.json()
        assert len(rounds) == 2

        r1 = [r for r in rounds if r["round_number"] == 1][0]
        r2 = [r for r in rounds if r["round_number"] == 2][0]

        assert r1["synthesis_json"] is not None
        assert r2["synthesis_json"] is not None
        assert r1["convergence_score"] is not None
        assert r2["convergence_score"] is not None

    def test_07_active_round_shows_previous_synthesis(
        self, client: TestClient, admin_headers: dict
    ):
        """Round 2's active_round endpoint includes round 1's synthesis text."""
        resp = client.get(
            f"/forms/{self.form_id}/active_round",
            headers=admin_headers,
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["round_number"] == 2
        # previous_round_synthesis should be round 1's text synthesis
        assert data["previous_round_synthesis"] is not None
        assert len(data["previous_round_synthesis"]) > 0


# =========================================================================
# 8. Synthesis Data Persistence
# =========================================================================


class TestSynthesisDataPersistence:
    """Verify all synthesis fields are persisted on the round model."""

    form_id: int = 0

    def test_01_setup_and_synthesise(
        self, client: TestClient, admin_headers: dict
    ):
        """Create form, submit responses, and run synthesis."""
        meta = _setup_form_with_responses(
            client,
            admin_headers,
            title="Persistence Test Form",
            join_code="PERS01",
            participant_prefix="pers",
        )
        TestSynthesisDataPersistence.form_id = meta["form_id"]

        resp = client.post(
            f"/forms/{meta['form_id']}/synthesise_committee",
            json={"model": "mock", "mode": "human_only", "n_analysts": 3},
            headers=admin_headers,
        )
        assert resp.status_code == 200

    def test_02_synthesis_json_is_not_none(
        self, client: TestClient, admin_headers: dict
    ):
        """round.synthesis_json is persisted."""
        resp = client.get(
            f"/forms/{self.form_id}/rounds",
            headers=admin_headers,
        )
        rounds = resp.json()
        active = [r for r in rounds if r["is_active"]][0]
        assert active["synthesis_json"] is not None
        assert isinstance(active["synthesis_json"], dict)

    def test_03_convergence_score_is_float(
        self, client: TestClient, admin_headers: dict
    ):
        """round.convergence_score is a float."""
        resp = client.get(
            f"/forms/{self.form_id}/rounds",
            headers=admin_headers,
        )
        rounds = resp.json()
        active = [r for r in rounds if r["is_active"]][0]
        assert active["convergence_score"] is not None
        assert isinstance(active["convergence_score"], float)

    def test_04_synthesis_text_stored(
        self, client: TestClient, admin_headers: dict
    ):
        """round.synthesis (text HTML) is stored for backwards compat."""
        resp = client.get(
            f"/forms/{self.form_id}/rounds",
            headers=admin_headers,
        )
        rounds = resp.json()
        active = [r for r in rounds if r["is_active"]][0]
        assert active["synthesis"] is not None
        assert len(active["synthesis"]) > 0
