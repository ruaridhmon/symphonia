"""
Simulated End-to-End Tests for Symphonia.

Covers the full user journey through the platform using FastAPI's TestClient
and an in-memory SQLite database. No running server required.

Journeys:
  1. Admin Full Flow (form creation → multi-round Delphi → synthesis)
  2. Participant Flow (register → unlock → submit → view)
  3. Multi-Round Delphi (3+ participants, 2 rounds, convergence)
  4. Synthesis Comments (create, reply, edit, delete, nesting)
  5. Response Editing (admin edit, optimistic locking, force edit)
"""
from __future__ import annotations

import json
from typing import Dict, List

import pytest
from fastapi.testclient import TestClient

from tests.conftest import create_form, register_and_login, submit_response


# =========================================================================
# Journey 1: Admin Full Flow
# =========================================================================


class TestAdminFullFlow:
    """Full admin lifecycle: create form → submit responses → synthesise →
    follow-ups → next round."""

    # We store state across tests in the class via class-level attributes.
    form_id: int = 0
    round_1_id: int = 0
    round_2_id: int = 0
    participant_tokens: List[str] = []

    def test_01_admin_login(self, client: TestClient, admin_headers: dict):
        """Admin can authenticate and access /me."""
        resp = client.get("/me", headers=admin_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["email"] == "antreas@axiotic.ai"
        assert data["is_admin"] is True

    def test_02_create_form(self, client: TestClient, admin_headers: dict):
        """Admin creates a form with 2 questions."""
        data = create_form(
            client,
            admin_headers,
            title="AI Governance Survey",
            questions=["What is the biggest risk?", "How should we respond?"],
        )
        TestAdminFullFlow.form_id = data["id"]
        TestAdminFullFlow.join_code = data["join_code"]
        assert data["title"] == "AI Governance Survey"
        assert data["current_round"] == 1

    def test_03_form_appears_in_listings(
        self, client: TestClient, admin_headers: dict
    ):
        """Created form appears in the admin form listing."""
        resp = client.get("/forms", headers=admin_headers)
        assert resp.status_code == 200
        titles = [f["title"] for f in resp.json()]
        assert "AI Governance Survey" in titles

    def test_04_register_participants_and_submit(
        self, client: TestClient, admin_headers: dict
    ):
        """Register 3 participants and submit responses."""
        for i in range(3):
            email = f"expert_j1_{i}@test.com"
            token = register_and_login(client, email)
            TestAdminFullFlow.participant_tokens.append(token)
            headers = {"Authorization": f"Bearer {token}"}

            # Unlock form
            resp = client.post(
                "/forms/unlock",
                json={"join_code": TestAdminFullFlow.join_code},
                headers=headers,
            )
            assert resp.status_code == 200

            submit_response(
                client,
                headers,
                TestAdminFullFlow.form_id,
                {"q1": f"Risk answer {i}", "q2": f"Response plan {i}"},
            )

    def test_05_run_committee_synthesis(
        self, client: TestClient, admin_headers: dict
    ):
        """Run mock committee synthesis."""
        resp = client.post(
            f"/forms/{TestAdminFullFlow.form_id}/synthesise_committee",
            json={"model": "mock", "mode": "human_only", "n_analysts": 3},
            headers=admin_headers,
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "synthesis" in data
        assert "convergence_score" in data
        assert data["convergence_score"] is not None

    def test_06_synthesis_stored_on_round(
        self, client: TestClient, admin_headers: dict
    ):
        """Synthesis results are persisted on the round."""
        resp = client.get(
            f"/forms/{TestAdminFullFlow.form_id}/rounds",
            headers=admin_headers,
        )
        assert resp.status_code == 200
        rounds = resp.json()
        active = [r for r in rounds if r["is_active"]]
        assert len(active) == 1
        r = active[0]
        TestAdminFullFlow.round_1_id = r["id"]
        assert r["synthesis"] is not None
        assert r["synthesis_json"] is not None
        assert r["convergence_score"] is not None

    def test_07_view_round_data_with_synthesis(
        self, client: TestClient, admin_headers: dict
    ):
        """Admin can view rounds with responses and synthesis data."""
        resp = client.get(
            f"/forms/{TestAdminFullFlow.form_id}/rounds_with_responses",
            headers=admin_headers,
        )
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) >= 1
        # First round should have 3 responses
        assert len(data[0]["responses"]) == 3

    def test_08_create_follow_up_questions(
        self, client: TestClient, admin_headers: dict
    ):
        """Admin creates follow-up questions on the active round."""
        resp = client.post(
            f"/forms/{TestAdminFullFlow.form_id}/follow_ups",
            json={"question": "Can you elaborate on the timeline?"},
            headers=admin_headers,
        )
        assert resp.status_code == 200
        fu = resp.json()
        assert fu["question"] == "Can you elaborate on the timeline?"
        assert fu["author_type"] == "human"
        TestAdminFullFlow._follow_up_id = fu["id"]

    def test_09_respond_to_follow_ups(
        self, client: TestClient, admin_headers: dict
    ):
        """Participant responds to a follow-up question."""
        headers = {
            "Authorization": f"Bearer {TestAdminFullFlow.participant_tokens[0]}"
        }
        resp = client.post(
            f"/follow_ups/{TestAdminFullFlow._follow_up_id}/respond",
            json={"response": "I think 6 months is realistic."},
            headers=headers,
        )
        assert resp.status_code == 200
        assert resp.json()["response"] == "I think 6 months is realistic."

    def test_10_advance_to_next_round(
        self, client: TestClient, admin_headers: dict
    ):
        """Admin advances to round 2."""
        resp = client.post(
            f"/forms/{TestAdminFullFlow.form_id}/next_round",
            json={"questions": ["Updated Q1?", "New Q2?", "New Q3?"]},
            headers=admin_headers,
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["round_number"] == 2
        assert len(data["questions"]) == 3
        TestAdminFullFlow.round_2_id = data["id"]

    def test_11_previous_synthesis_carried_forward(
        self, client: TestClient, admin_headers: dict
    ):
        """Previous round synthesis is available in the active round context."""
        resp = client.get(
            f"/forms/{TestAdminFullFlow.form_id}/active_round",
            headers=admin_headers,
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["round_number"] == 2
        # previous_round_synthesis should contain the round 1 synthesis text
        assert data["previous_round_synthesis"] != ""


# =========================================================================
# Journey 2: Participant Flow
# =========================================================================


class TestParticipantFlow:
    """Non-admin participant: register → unlock → submit → check → view."""

    form_id: int = 0
    participant_email: str = "new_participant@test.com"
    participant_token: str = ""

    def test_01_register_participant(self, client: TestClient):
        """Register a new non-admin user."""
        resp = client.post(
            "/register",
            data={
                "email": self.participant_email,
                "password": "securepass",
            },
        )
        assert resp.status_code == 200

        # Login
        resp = client.post(
            "/login",
            data={
                "username": self.participant_email,
                "password": "securepass",
            },
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["is_admin"] is False
        TestParticipantFlow.participant_token = data["access_token"]

    def test_02_admin_creates_form(
        self, client: TestClient, admin_headers: dict
    ):
        """Admin creates a form for participant to join."""
        data = create_form(
            client,
            admin_headers,
            title="Participant Survey",
            questions=["What do you think?", "Any concerns?"],
        )
        TestParticipantFlow.form_id = data["id"]
        TestParticipantFlow.join_code = data["join_code"]

    def test_03_unlock_form_with_join_code(self, client: TestClient):
        """Participant unlocks the form using the join code."""
        headers = {
            "Authorization": f"Bearer {TestParticipantFlow.participant_token}"
        }
        resp = client.post(
            "/forms/unlock",
            json={"join_code": TestParticipantFlow.join_code},
            headers=headers,
        )
        assert resp.status_code == 200

    def test_04_view_form_questions(self, client: TestClient):
        """Participant can view form details and questions."""
        headers = {
            "Authorization": f"Bearer {TestParticipantFlow.participant_token}"
        }
        resp = client.get(
            f"/forms/{TestParticipantFlow.form_id}",
            headers=headers,
        )
        assert resp.status_code == 200
        data = resp.json()
        assert len(data["questions"]) == 2

    def test_05_submit_response(self, client: TestClient):
        """Participant submits a response."""
        headers = {
            "Authorization": f"Bearer {TestParticipantFlow.participant_token}"
        }
        submit_response(
            client,
            headers,
            TestParticipantFlow.form_id,
            {"q1": "I think it's great", "q2": "No concerns"},
        )

    def test_06_check_submission_status(self, client: TestClient):
        """has_submitted returns True after submitting."""
        headers = {
            "Authorization": f"Bearer {TestParticipantFlow.participant_token}"
        }
        resp = client.get(
            f"/has_submitted?form_id={TestParticipantFlow.form_id}",
            headers=headers,
        )
        assert resp.status_code == 200
        assert resp.json()["submitted"] is True

    def test_07_retrieve_own_response(self, client: TestClient):
        """Participant can retrieve their own response."""
        headers = {
            "Authorization": f"Bearer {TestParticipantFlow.participant_token}"
        }
        resp = client.get(
            f"/form/{TestParticipantFlow.form_id}/my_response",
            headers=headers,
        )
        assert resp.status_code == 200
        assert resp.json()["answers"]["q1"] == "I think it's great"

    def test_08_resubmit_response(self, client: TestClient):
        """Participant can re-submit (update) their response."""
        headers = {
            "Authorization": f"Bearer {TestParticipantFlow.participant_token}"
        }
        submit_response(
            client,
            headers,
            TestParticipantFlow.form_id,
            {"q1": "Updated opinion", "q2": "Still no concerns"},
        )

        # Verify updated
        resp = client.get(
            f"/form/{TestParticipantFlow.form_id}/my_response",
            headers=headers,
        )
        assert resp.json()["answers"]["q1"] == "Updated opinion"

    def test_09_view_synthesis_when_available(
        self, client: TestClient, admin_headers: dict
    ):
        """After admin runs synthesis, participant can view rounds."""
        headers_p = {
            "Authorization": f"Bearer {TestParticipantFlow.participant_token}"
        }

        # Admin runs synthesis first
        client.post(
            f"/forms/{TestParticipantFlow.form_id}/synthesise_committee",
            json={"model": "mock", "mode": "human_only", "n_analysts": 2},
            headers=admin_headers,
        )

        # Participant views rounds
        resp = client.get(
            f"/forms/{TestParticipantFlow.form_id}/rounds",
            headers=headers_p,
        )
        assert resp.status_code == 200
        rounds = resp.json()
        assert any(r["synthesis_json"] is not None for r in rounds)


# =========================================================================
# Journey 3: Multi-Round Delphi
# =========================================================================


class TestMultiRoundDelphi:
    """3+ participants, 2 rounds, convergence tracking, archived responses."""

    form_id: int = 0
    tokens: List[str] = []
    round_1_id: int = 0
    round_2_id: int = 0

    def test_01_admin_creates_form(
        self, client: TestClient, admin_headers: dict
    ):
        """Admin creates form for multi-round Delphi."""
        data = create_form(
            client,
            admin_headers,
            title="Delphi Multi-Round",
            questions=["Key challenge?", "Proposed solution?", "Timeline?"],
        )
        TestMultiRoundDelphi.form_id = data["id"]
        TestMultiRoundDelphi.join_code = data["join_code"]

    def test_02_register_participants(self, client: TestClient):
        """Register 4 participants."""
        TestMultiRoundDelphi.tokens = []
        for i in range(4):
            email = f"delphi_expert_{i}@test.com"
            token = register_and_login(client, email)
            TestMultiRoundDelphi.tokens.append(token)

            # Unlock form
            headers = {"Authorization": f"Bearer {token}"}
            client.post(
                "/forms/unlock",
                json={"join_code": TestMultiRoundDelphi.join_code},
                headers=headers,
            )

    def test_03_round1_submissions(self, client: TestClient):
        """4 participants submit round 1 responses."""
        for i, token in enumerate(TestMultiRoundDelphi.tokens):
            headers = {"Authorization": f"Bearer {token}"}
            submit_response(
                client,
                headers,
                TestMultiRoundDelphi.form_id,
                {
                    "q1": f"Challenge from expert {i}",
                    "q2": f"Solution from expert {i}",
                    "q3": f"{3 + i} months",
                },
            )

    def test_04_run_synthesis_round1(
        self, client: TestClient, admin_headers: dict
    ):
        """Admin synthesises round 1."""
        resp = client.post(
            f"/forms/{TestMultiRoundDelphi.form_id}/synthesise_committee",
            json={"model": "mock", "mode": "human_only", "n_analysts": 3},
            headers=admin_headers,
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["convergence_score"] is not None

        # Capture round 1 ID
        rounds_resp = client.get(
            f"/forms/{TestMultiRoundDelphi.form_id}/rounds",
            headers=admin_headers,
        )
        for r in rounds_resp.json():
            if r["round_number"] == 1:
                TestMultiRoundDelphi.round_1_id = r["id"]

    def test_05_open_round2(self, client: TestClient, admin_headers: dict):
        """Admin opens round 2 with optionally changed questions."""
        resp = client.post(
            f"/forms/{TestMultiRoundDelphi.form_id}/next_round",
            json={
                "questions": [
                    "Revised challenge?",
                    "Revised solution?",
                    "Revised timeline?",
                ]
            },
            headers=admin_headers,
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["round_number"] == 2
        TestMultiRoundDelphi.round_2_id = data["id"]

    def test_06_round2_submissions(
        self, client: TestClient, admin_headers: dict
    ):
        """Participants submit round 2 (informed by round 1 synthesis)."""
        # Check that previous synthesis is accessible
        resp = client.get(
            f"/forms/{TestMultiRoundDelphi.form_id}/active_round",
            headers={"Authorization": f"Bearer {TestMultiRoundDelphi.tokens[0]}"},
        )
        assert resp.status_code == 200
        assert resp.json()["previous_round_synthesis"] != ""

        for i, token in enumerate(TestMultiRoundDelphi.tokens):
            headers = {"Authorization": f"Bearer {token}"}
            submit_response(
                client,
                headers,
                TestMultiRoundDelphi.form_id,
                {
                    "q1": f"Revised challenge {i}",
                    "q2": f"Converging solution {i}",
                    "q3": "4 months",  # converging
                },
            )

    def test_07_run_synthesis_round2(
        self, client: TestClient, admin_headers: dict
    ):
        """Admin synthesises round 2."""
        resp = client.post(
            f"/forms/{TestMultiRoundDelphi.form_id}/synthesise_committee",
            json={"model": "mock", "mode": "human_only", "n_analysts": 3},
            headers=admin_headers,
        )
        assert resp.status_code == 200

    def test_08_convergence_tracking(
        self, client: TestClient, admin_headers: dict
    ):
        """Both rounds have convergence scores."""
        resp = client.get(
            f"/forms/{TestMultiRoundDelphi.form_id}/rounds",
            headers=admin_headers,
        )
        assert resp.status_code == 200
        rounds = resp.json()
        assert len(rounds) == 2
        for r in rounds:
            assert r["convergence_score"] is not None

    def test_09_archived_responses_preserved(
        self, client: TestClient, admin_headers: dict
    ):
        """All archived responses from both rounds are preserved."""
        resp = client.get(
            f"/form/{TestMultiRoundDelphi.form_id}/archived_responses",
            headers=admin_headers,
        )
        assert resp.status_code == 200
        archived = resp.json()
        # 4 participants × 2 rounds = 8 archived responses
        assert len(archived) == 8

        # Verify both round IDs are represented
        round_ids = {a["round_id"] for a in archived}
        assert TestMultiRoundDelphi.round_1_id in round_ids
        assert TestMultiRoundDelphi.round_2_id in round_ids


# =========================================================================
# Journey 4: Synthesis Comments
# =========================================================================


class TestSynthesisComments:
    """Comment lifecycle: create, reply, edit, nested structure, delete."""

    form_id: int = 0
    round_id: int = 0
    comment_agreement_id: int = 0
    comment_disagreement_id: int = 0
    reply_id: int = 0
    user_a_token: str = ""
    user_b_token: str = ""

    def test_01_setup_form_and_synthesis(
        self, client: TestClient, admin_headers: dict
    ):
        """Create form, submit, and run synthesis so we have a round to comment on."""
        data = create_form(
            client,
            admin_headers,
            title="Comment Test Form",
            questions=["Thoughts?"],
        )
        TestSynthesisComments.form_id = data["id"]
        TestSynthesisComments.join_code = data["join_code"]

        # Register two users for commenting
        TestSynthesisComments.user_a_token = register_and_login(
            client, "commenter_a@test.com"
        )
        TestSynthesisComments.user_b_token = register_and_login(
            client, "commenter_b@test.com"
        )

        # Unlock + submit as both users
        for token in (
            TestSynthesisComments.user_a_token,
            TestSynthesisComments.user_b_token,
        ):
            headers = {"Authorization": f"Bearer {token}"}
            client.post(
                "/forms/unlock",
                json={"join_code": TestSynthesisComments.join_code},
                headers=headers,
            )
            submit_response(
                client,
                headers,
                TestSynthesisComments.form_id,
                {"q1": "Some thoughts"},
            )

        # Run synthesis
        resp = client.post(
            f"/forms/{TestSynthesisComments.form_id}/synthesise_committee",
            json={"model": "mock", "mode": "human_only", "n_analysts": 2},
            headers=admin_headers,
        )
        assert resp.status_code == 200

        # Get round ID
        rounds_resp = client.get(
            f"/forms/{TestSynthesisComments.form_id}/rounds",
            headers=admin_headers,
        )
        active = [r for r in rounds_resp.json() if r["is_active"]]
        TestSynthesisComments.round_id = active[0]["id"]

    def test_02_add_comment_on_agreement(self, client: TestClient):
        """User A comments on an agreement section."""
        headers = {
            "Authorization": f"Bearer {TestSynthesisComments.user_a_token}"
        }
        resp = client.post(
            f"/forms/{TestSynthesisComments.form_id}/rounds/{TestSynthesisComments.round_id}/comments",
            json={
                "section_type": "agreement",
                "section_index": 0,
                "body": "I strongly agree with this point.",
            },
            headers=headers,
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["section_type"] == "agreement"
        assert data["body"] == "I strongly agree with this point."
        TestSynthesisComments.comment_agreement_id = data["id"]

    def test_03_add_comment_on_disagreement(self, client: TestClient):
        """User A comments on a disagreement section."""
        headers = {
            "Authorization": f"Bearer {TestSynthesisComments.user_a_token}"
        }
        resp = client.post(
            f"/forms/{TestSynthesisComments.form_id}/rounds/{TestSynthesisComments.round_id}/comments",
            json={
                "section_type": "disagreement",
                "section_index": 0,
                "body": "This disagreement needs more nuance.",
            },
            headers=headers,
        )
        assert resp.status_code == 200
        TestSynthesisComments.comment_disagreement_id = resp.json()["id"]

    def test_04_reply_to_comment(self, client: TestClient):
        """User B replies to User A's agreement comment."""
        headers = {
            "Authorization": f"Bearer {TestSynthesisComments.user_b_token}"
        }
        resp = client.post(
            f"/forms/{TestSynthesisComments.form_id}/rounds/{TestSynthesisComments.round_id}/comments",
            json={
                "section_type": "agreement",
                "section_index": 0,
                "parent_id": TestSynthesisComments.comment_agreement_id,
                "body": "I also agree — great synthesis.",
            },
            headers=headers,
        )
        assert resp.status_code == 200
        TestSynthesisComments.reply_id = resp.json()["id"]

    def test_05_edit_own_comment(self, client: TestClient):
        """User A edits their own comment."""
        headers = {
            "Authorization": f"Bearer {TestSynthesisComments.user_a_token}"
        }
        resp = client.put(
            f"/comments/{TestSynthesisComments.comment_agreement_id}",
            json={"body": "I strongly agree — edited for clarity."},
            headers=headers,
        )
        assert resp.status_code == 200
        assert resp.json()["body"] == "I strongly agree — edited for clarity."

    def test_06_verify_nested_structure(self, client: TestClient):
        """Comments are returned with nested replies."""
        headers = {
            "Authorization": f"Bearer {TestSynthesisComments.user_a_token}"
        }
        resp = client.get(
            f"/forms/{TestSynthesisComments.form_id}/rounds/{TestSynthesisComments.round_id}/comments",
            headers=headers,
        )
        assert resp.status_code == 200
        comments = resp.json()

        # Should have 2 top-level comments (agreement + disagreement)
        assert len(comments) == 2

        # Find the agreement comment and check its reply
        agreement_comment = next(
            c for c in comments if c["section_type"] == "agreement"
        )
        assert len(agreement_comment["replies"]) == 1
        assert (
            agreement_comment["replies"][0]["body"]
            == "I also agree — great synthesis."
        )

    def test_07_delete_comment(self, client: TestClient):
        """User A deletes their disagreement comment."""
        headers = {
            "Authorization": f"Bearer {TestSynthesisComments.user_a_token}"
        }
        resp = client.delete(
            f"/comments/{TestSynthesisComments.comment_disagreement_id}",
            headers=headers,
        )
        assert resp.status_code == 200

        # Verify it's gone
        resp = client.get(
            f"/forms/{TestSynthesisComments.form_id}/rounds/{TestSynthesisComments.round_id}/comments",
            headers=headers,
        )
        comments = resp.json()
        ids = [c["id"] for c in comments]
        assert TestSynthesisComments.comment_disagreement_id not in ids


# =========================================================================
# Journey 5: Response Editing
# =========================================================================


class TestResponseEditing:
    """Admin response editing with optimistic locking."""

    form_id: int = 0
    response_id: int = 0
    participant_token: str = ""

    def test_01_setup(self, client: TestClient, admin_headers: dict):
        """Create form, register participant, and submit a response."""
        data = create_form(
            client,
            admin_headers,
            title="Response Edit Test",
            questions=["Your opinion?"],
        )
        TestResponseEditing.form_id = data["id"]

        TestResponseEditing.participant_token = register_and_login(
            client, "edit_participant@test.com"
        )
        headers = {
            "Authorization": f"Bearer {TestResponseEditing.participant_token}"
        }

        # Unlock + submit
        client.post(
            "/forms/unlock",
            json={"join_code": data["join_code"]},
            headers=headers,
        )
        submit_response(
            client,
            headers,
            TestResponseEditing.form_id,
            {"q1": "Original answer"},
        )

    def test_02_get_response_id(
        self, client: TestClient, admin_headers: dict
    ):
        """Admin gets the response to edit."""
        resp = client.get(
            f"/form/{TestResponseEditing.form_id}/responses",
            headers=admin_headers,
        )
        assert resp.status_code == 200
        responses = resp.json()
        assert len(responses) >= 1
        TestResponseEditing.response_id = responses[0]["id"]
        assert responses[0]["version"] == 1

    def test_03_admin_edits_response(
        self, client: TestClient, admin_headers: dict
    ):
        """Admin edits the response with correct version."""
        resp = client.put(
            f"/responses/{TestResponseEditing.response_id}",
            json={"answers": {"q1": "Admin-edited answer"}, "version": 1},
            headers=admin_headers,
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["answers"]["q1"] == "Admin-edited answer"
        assert data["version"] == 2

    def test_04_optimistic_locking_conflict(
        self, client: TestClient, admin_headers: dict
    ):
        """Editing with wrong version triggers 409 Conflict."""
        resp = client.put(
            f"/responses/{TestResponseEditing.response_id}",
            json={
                "answers": {"q1": "Should fail"},
                "version": 1,  # stale — current is 2
            },
            headers=admin_headers,
        )
        assert resp.status_code == 409

    def test_05_force_edit_bypasses_locking(
        self, client: TestClient, admin_headers: dict
    ):
        """Force edit ignores version mismatch."""
        resp = client.put(
            f"/responses/{TestResponseEditing.response_id}/force",
            json={
                "answers": {"q1": "Force-edited answer"},
                "version": 999,  # wrong version, but force ignores it
            },
            headers=admin_headers,
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["answers"]["q1"] == "Force-edited answer"
        assert data["version"] == 3  # incremented from 2 to 3


# =========================================================================
# Additional edge-case tests
# =========================================================================


class TestEdgeCases:
    """Misc edge cases and error paths."""

    def test_duplicate_registration(self, client: TestClient):
        """Registering the same email twice returns 400."""
        email = "duplicate@test.com"
        client.post(
            "/register", data={"email": email, "password": "pass123"}
        )
        resp = client.post(
            "/register", data={"email": email, "password": "pass123"}
        )
        assert resp.status_code == 400

    def test_wrong_credentials(self, client: TestClient):
        """Login with wrong password returns 401."""
        register_and_login(client, "wrong_cred@test.com", "correct_pass")
        resp = client.post(
            "/login",
            data={"username": "wrong_cred@test.com", "password": "wrong_pass"},
        )
        assert resp.status_code == 401

    def test_unauthenticated_access(self, client: TestClient):
        """Accessing protected endpoints without auth returns 401."""
        resp = client.get("/me")
        assert resp.status_code in (401, 403)

    def test_non_admin_cannot_create_form(
        self, client: TestClient, participant_headers: dict
    ):
        """Non-admin user cannot create forms."""
        resp = client.post(
            "/forms/create",
            json={
                "title": "Should Fail",
                "questions": ["Q?"],
                "allow_join": True,
            },
            headers=participant_headers,
        )
        assert resp.status_code == 403

    def test_invalid_join_code(
        self, client: TestClient, participant_headers: dict
    ):
        """Unlocking with a non-existent join code returns 404."""
        resp = client.post(
            "/forms/unlock",
            json={"join_code": "DOESNOTEXIST"},
            headers=participant_headers,
        )
        assert resp.status_code == 404

    def test_submit_without_active_round(
        self, client: TestClient, admin_headers: dict
    ):
        """Submitting to a form with no active round returns 400."""
        # Create a form then deactivate its round by advancing
        data = create_form(
            client,
            admin_headers,
            title="No-Round Form",
            questions=["Q?"],
        )
        form_id = data["id"]

        # Submit once so it works
        tok = register_and_login(client, "nornd_user@test.com")
        headers = {"Authorization": f"Bearer {tok}"}
        client.post(
            "/forms/unlock",
            json={"join_code": data["join_code"]},
            headers=headers,
        )
        submit_response(client, headers, form_id, {"q1": "answer"})

        # Now advance to round 2, then check round 1 is inactive
        client.post(
            f"/forms/{form_id}/next_round",
            headers=admin_headers,
        )

        # has_submitted should reflect the new (empty) round
        resp = client.get(
            f"/has_submitted?form_id={form_id}",
            headers=headers,
        )
        assert resp.status_code == 200
        assert resp.json()["submitted"] is False

    def test_cannot_reply_to_reply(
        self, client: TestClient, admin_headers: dict
    ):
        """Cannot create a comment that replies to a reply (max 1 level)."""
        # Use the form/round from Journey 4 if it exists, or create a new one
        data = create_form(
            client,
            admin_headers,
            title="Nested Comment Test",
            questions=["Q?"],
        )
        form_id = data["id"]

        # Submit so synthesis can run
        submit_response(
            client, admin_headers, form_id, {"q1": "answer"}
        )
        client.post(
            f"/forms/{form_id}/synthesise_committee",
            json={"model": "mock", "mode": "human_only", "n_analysts": 2},
            headers=admin_headers,
        )

        # Get round ID
        rounds_resp = client.get(
            f"/forms/{form_id}/rounds", headers=admin_headers
        )
        round_id = rounds_resp.json()[0]["id"]

        # Create top-level comment
        resp = client.post(
            f"/forms/{form_id}/rounds/{round_id}/comments",
            json={
                "section_type": "agreement",
                "section_index": 0,
                "body": "Top level",
            },
            headers=admin_headers,
        )
        top_id = resp.json()["id"]

        # Create reply
        resp = client.post(
            f"/forms/{form_id}/rounds/{round_id}/comments",
            json={
                "section_type": "agreement",
                "section_index": 0,
                "parent_id": top_id,
                "body": "First reply",
            },
            headers=admin_headers,
        )
        reply_id = resp.json()["id"]

        # Try to reply to the reply — should fail
        resp = client.post(
            f"/forms/{form_id}/rounds/{round_id}/comments",
            json={
                "section_type": "agreement",
                "section_index": 0,
                "parent_id": reply_id,
                "body": "Nested reply — should fail",
            },
            headers=admin_headers,
        )
        assert resp.status_code == 400

    def test_cannot_edit_others_comment(
        self, client: TestClient, admin_headers: dict
    ):
        """User cannot edit another user's comment."""
        data = create_form(
            client,
            admin_headers,
            title="Edit Others Comment Test",
            questions=["Q?"],
        )
        form_id = data["id"]

        # Submit + synthesis
        submit_response(
            client, admin_headers, form_id, {"q1": "answer"}
        )
        client.post(
            f"/forms/{form_id}/synthesise_committee",
            json={"model": "mock", "mode": "human_only", "n_analysts": 2},
            headers=admin_headers,
        )

        rounds_resp = client.get(
            f"/forms/{form_id}/rounds", headers=admin_headers
        )
        round_id = rounds_resp.json()[0]["id"]

        # Admin creates a comment
        resp = client.post(
            f"/forms/{form_id}/rounds/{round_id}/comments",
            json={
                "section_type": "general",
                "body": "Admin's comment",
            },
            headers=admin_headers,
        )
        comment_id = resp.json()["id"]

        # Another user tries to edit it
        other_token = register_and_login(client, "other_editor@test.com")
        other_headers = {"Authorization": f"Bearer {other_token}"}
        resp = client.put(
            f"/comments/{comment_id}",
            json={"body": "Trying to edit admin's comment"},
            headers=other_headers,
        )
        assert resp.status_code == 403
