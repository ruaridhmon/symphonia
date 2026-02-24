"""
Synthesis Pipeline Hardening Tests.

Covers real-mode error paths that were never tested:
  1. Missing API key when mode is non-mock → graceful error (not crash)
  2. API returns malformed JSON → handled fallback
  3. API timeout → proper error with WebSocket notification
  4. /synthesis/status endpoint → reports mode, key status, strategies
  5. WebSocket error events fire on synthesis failure
  6. Settings model propagation to synthesis engine
  7. Graceful fallback when consensus library isn't installed

All tests are pure-unit or use TestClient: no real API calls.
"""
from __future__ import annotations

import asyncio
import json
import os
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from tests.conftest import create_form, register_and_login, submit_response, TestingSessionLocal


# =============================================================================
# 1. SYNTHESIS STATUS ENDPOINT
# =============================================================================


class TestSynthesisStatus:
    """Tests for the /synthesis/status endpoint."""

    def test_status_returns_mock_mode(
        self, client: TestClient, admin_headers: dict
    ):
        """Status endpoint reports mock mode when SYNTHESIS_MODE=mock."""
        resp = client.get("/synthesis/status", headers=admin_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["configured_mode"] == "mock"
        assert data["effective_mode"] == "mock"
        assert "mock" in data["available_strategies"]
        assert "simple" in data["available_strategies"]
        assert "committee" in data["available_strategies"]
        assert "ttd" in data["available_strategies"]
        assert isinstance(data["api_key_configured"], bool)
        assert isinstance(data["default_model"], str)

    def test_status_requires_auth(self, client: TestClient):
        """Status endpoint requires authentication."""
        resp = client.get("/synthesis/status")
        assert resp.status_code == 401

    def test_status_reports_missing_key_fallback(
        self, client: TestClient, admin_headers: dict, monkeypatch: pytest.MonkeyPatch
    ):
        """When mode is 'simple' but API key is missing, reports fallback to mock."""
        monkeypatch.setenv("SYNTHESIS_MODE", "simple")
        monkeypatch.delenv("OPENROUTER_API_KEY", raising=False)
        resp = client.get("/synthesis/status", headers=admin_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["configured_mode"] == "simple"
        assert data["effective_mode"] == "mock"
        assert data["api_key_configured"] is False
        assert data["note"] is not None
        assert "missing" in data["note"].lower()
        # Restore
        monkeypatch.setenv("SYNTHESIS_MODE", "mock")

    def test_status_reports_key_present(
        self, client: TestClient, admin_headers: dict, monkeypatch: pytest.MonkeyPatch
    ):
        """When API key is present, reports it correctly (without leaking value)."""
        monkeypatch.setenv("SYNTHESIS_MODE", "simple")
        monkeypatch.setenv("OPENROUTER_API_KEY", "sk-test-12345")
        resp = client.get("/synthesis/status", headers=admin_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["api_key_configured"] is True
        assert data["effective_mode"] == "simple"
        assert data["note"] is None
        # The actual key value should NOT appear anywhere in the response
        assert "sk-test-12345" not in json.dumps(data)
        # Restore
        monkeypatch.setenv("SYNTHESIS_MODE", "mock")
        monkeypatch.delenv("OPENROUTER_API_KEY", raising=False)


# =============================================================================
# 2. MISSING API KEY IN NON-MOCK MODE
# =============================================================================


class TestMissingApiKey:
    """Test graceful handling when API key is missing but mode requires it."""

    def test_generate_synthesis_falls_back_to_mock_without_key(
        self, client: TestClient, admin_headers: dict, monkeypatch: pytest.MonkeyPatch
    ):
        """generate_synthesis_for_round falls back to mock when no API key."""
        # Ensure no API key, and mode is 'simple'
        monkeypatch.setenv("SYNTHESIS_MODE", "simple")
        monkeypatch.delenv("OPENROUTER_API_KEY", raising=False)

        # Create form + submit a response
        form = create_form(
            client, admin_headers, title="NoKeyTest", join_code="NOKEY001"
        )
        form_id = form["id"]

        # Submit as a participant
        ptk = register_and_login(client, "nokey_expert@test.com")
        ph = {"Authorization": f"Bearer {ptk}"}
        submit_response(
            client, ph, form_id, {"q1": "My answer 1", "q2": "My answer 2"}
        )

        # Get round
        rounds_resp = client.get(
            f"/forms/{form_id}/rounds", headers=admin_headers
        )
        round_id = rounds_resp.json()[0]["id"]

        # Generate synthesis - should fall back to mock, not crash
        resp = client.post(
            f"/forms/{form_id}/rounds/{round_id}/generate_synthesis",
            json={"model": "test-model", "strategy": "simple"},
            headers=admin_headers,
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "Mock Mode" in data.get("synthesis", "")

        # Restore
        monkeypatch.setenv("SYNTHESIS_MODE", "mock")

    @pytest.mark.asyncio
    async def test_adapter_raises_config_error_without_key(
        self, monkeypatch: pytest.MonkeyPatch
    ):
        """ConsensusLibraryAdapter raises SynthesisConfigError when API key is missing."""
        from core.synthesis import ConsensusLibraryAdapter, SynthesisError

        monkeypatch.delenv("OPENROUTER_API_KEY", raising=False)
        adapter = ConsensusLibraryAdapter(strategy="simple")

        with pytest.raises(SynthesisError):
            await adapter.run(
                questions=[{"label": "Test?"}],
                responses=[{"answers": {"q1": "answer"}}],
            )

    def test_factory_mock_mode_no_key_needed(self):
        """get_synthesiser with mode='mock' works without any API key."""
        from core.synthesis import MockSynthesis, get_synthesiser

        s = get_synthesiser(mode="mock")
        assert isinstance(s, MockSynthesis)


# =============================================================================
# 3. API RETURNS MALFORMED JSON
# =============================================================================


class TestMalformedApiResponse:
    """Test handling when API returns non-JSON or malformed output."""

    def test_simple_synthesis_malformed_json_fallback(
        self, client: TestClient, admin_headers: dict, monkeypatch: pytest.MonkeyPatch
    ):
        """When LLM returns non-JSON text, synthesis stores it as raw text."""
        monkeypatch.setenv("SYNTHESIS_MODE", "live")
        monkeypatch.setenv("OPENROUTER_API_KEY", "sk-fake-key")

        # Create form + submit
        form = create_form(
            client, admin_headers, title="MalformedTest", join_code="MALFM001"
        )
        form_id = form["id"]
        ptk = register_and_login(client, "malformed_expert@test.com")
        ph = {"Authorization": f"Bearer {ptk}"}
        submit_response(
            client, ph, form_id, {"q1": "answer 1", "q2": "answer 2"}
        )

        rounds_resp = client.get(
            f"/forms/{form_id}/rounds", headers=admin_headers
        )
        round_id = rounds_resp.json()[0]["id"]

        # Mock the OpenAI client to return malformed text
        mock_completion = MagicMock()
        mock_completion.choices = [
            MagicMock(message=MagicMock(content="This is not valid JSON at all, just rambling text."))
        ]
        mock_client = MagicMock()
        mock_client.chat.completions.create.return_value = mock_completion

        # Synthesis now runs as a background task — capture the coroutine
        # so we can run it synchronously with the test DB.
        captured_coro = None

        def _intercept_create_task(coro, **kwargs):
            nonlocal captured_coro
            captured_coro = coro
            fut = asyncio.get_running_loop().create_future()
            fut.set_result(None)
            return fut

        with patch("core.routes.get_openai_client", return_value=mock_client), \
             patch("asyncio.create_task", side_effect=_intercept_create_task):
            resp = client.post(
                f"/forms/{form_id}/rounds/{round_id}/generate_synthesis",
                json={"model": "test-model", "strategy": "simple"},
                headers=admin_headers,
            )

        assert resp.status_code == 200

        # Run the captured background task synchronously against the test DB
        assert captured_coro is not None
        with patch("core.routes.SessionLocal", TestingSessionLocal), \
             patch("core.routes.get_openai_client", return_value=mock_client):
            _loop = asyncio.new_event_loop()
            try:
                _loop.run_until_complete(captured_coro)
            finally:
                _loop.close()

        # Fetch the result via the synthesis versions API
        versions_resp = client.get(
            f"/forms/{form_id}/rounds/{round_id}/synthesis_versions",
            headers=admin_headers,
        )
        assert versions_resp.status_code == 200
        versions = versions_resp.json()
        assert len(versions) >= 1
        data = versions[-1]

        # synthesis_json should be None (couldn't parse)
        assert data.get("synthesis_json") is None
        # Raw text should be preserved as the synthesis
        assert "rambling text" in data.get("synthesis", "")

        # Restore
        monkeypatch.setenv("SYNTHESIS_MODE", "mock")
        monkeypatch.delenv("OPENROUTER_API_KEY", raising=False)

    def test_simple_synthesis_valid_json_parses(
        self, client: TestClient, admin_headers: dict, monkeypatch: pytest.MonkeyPatch
    ):
        """When LLM returns valid structured JSON, it's properly parsed."""
        monkeypatch.setenv("SYNTHESIS_MODE", "live")
        monkeypatch.setenv("OPENROUTER_API_KEY", "sk-fake-key")

        form = create_form(
            client, admin_headers, title="ValidJsonTest", join_code="VALID001"
        )
        form_id = form["id"]
        ptk = register_and_login(client, "valid_json_expert@test.com")
        ph = {"Authorization": f"Bearer {ptk}"}
        submit_response(
            client, ph, form_id, {"q1": "ans 1", "q2": "ans 2"}
        )

        rounds_resp = client.get(
            f"/forms/{form_id}/rounds", headers=admin_headers
        )
        round_id = rounds_resp.json()[0]["id"]

        valid_json = json.dumps({
            "narrative": "Test narrative",
            "agreements": [
                {
                    "claim": "Experts agree on X",
                    "supporting_experts": [1],
                    "confidence": 0.9,
                    "evidence_summary": "Based on response 1",
                    "evidence_excerpts": [],
                }
            ],
            "disagreements": [],
            "nuances": [],
            "confidence_map": {"overall": 0.85},
            "follow_up_probes": [],
            "meta_synthesis_reasoning": "Direct synthesis",
        })

        mock_completion = MagicMock()
        mock_completion.choices = [
            MagicMock(message=MagicMock(content=valid_json))
        ]
        mock_client = MagicMock()
        mock_client.chat.completions.create.return_value = mock_completion

        # Synthesis now runs as a background task — capture the coroutine
        # so we can run it synchronously with the test DB.
        captured_coro = None

        def _intercept_create_task(coro, **kwargs):
            nonlocal captured_coro
            captured_coro = coro
            fut = asyncio.get_running_loop().create_future()
            fut.set_result(None)
            return fut

        with patch("core.routes.get_openai_client", return_value=mock_client), \
             patch("asyncio.create_task", side_effect=_intercept_create_task):
            resp = client.post(
                f"/forms/{form_id}/rounds/{round_id}/generate_synthesis",
                json={"model": "test-model", "strategy": "simple"},
                headers=admin_headers,
            )

        assert resp.status_code == 200

        # Run the captured background task synchronously against the test DB
        assert captured_coro is not None
        with patch("core.routes.SessionLocal", TestingSessionLocal), \
             patch("core.routes.get_openai_client", return_value=mock_client):
            _loop = asyncio.new_event_loop()
            try:
                _loop.run_until_complete(captured_coro)
            finally:
                _loop.close()

        # Fetch the result via the synthesis versions API
        versions_resp = client.get(
            f"/forms/{form_id}/rounds/{round_id}/synthesis_versions",
            headers=admin_headers,
        )
        assert versions_resp.status_code == 200
        versions = versions_resp.json()
        assert len(versions) >= 1
        data = versions[-1]

        assert data.get("synthesis_json") is not None
        assert data["synthesis_json"]["narrative"] == "Test narrative"
        assert len(data["synthesis_json"]["agreements"]) == 1

        # Restore
        monkeypatch.setenv("SYNTHESIS_MODE", "mock")
        monkeypatch.delenv("OPENROUTER_API_KEY", raising=False)


# =============================================================================
# 4. API TIMEOUT HANDLING
# =============================================================================


class TestApiTimeout:
    """Test synthesis timeout handling."""

    @pytest.mark.asyncio
    async def test_adapter_raises_timeout_error(self):
        """ConsensusLibraryAdapter raises SynthesisTimeoutError on slow strategy."""
        from core.synthesis import (
            ConsensusLibraryAdapter,
            SynthesisTimeoutError,
        )

        adapter = ConsensusLibraryAdapter(
            strategy="simple",
            timeout_seconds=0.001,  # Near-instant timeout
        )
        adapter._strategy_instance = MagicMock()

        async def slow_run(**kwargs):
            await asyncio.sleep(100)

        adapter._strategy_instance.run = slow_run

        with pytest.raises(SynthesisTimeoutError, match="timed out"):
            await adapter.run(
                questions=[{"label": "Q?"}],
                responses=[{"answers": {"q1": "A"}}],
            )

    @pytest.mark.asyncio
    async def test_timeout_includes_strategy_info(self):
        """Timeout error message includes strategy name."""
        from core.synthesis import (
            ConsensusLibraryAdapter,
            SynthesisTimeoutError,
        )

        adapter = ConsensusLibraryAdapter(
            strategy="ttd",
            timeout_seconds=0.001,
        )
        adapter._strategy_instance = MagicMock()

        async def slow_run(**kwargs):
            await asyncio.sleep(100)

        adapter._strategy_instance.run = slow_run

        with pytest.raises(SynthesisTimeoutError) as exc_info:
            await adapter.run(
                questions=[{"label": "Q?"}],
                responses=[{"answers": {"q1": "A"}}],
            )
        assert "ttd" in str(exc_info.value)


# =============================================================================
# 5. WEBSOCKET ERROR EVENTS
# =============================================================================


class TestWebSocketErrorEvents:
    """Test that synthesis failures broadcast WebSocket error events."""

    @pytest.mark.asyncio
    async def test_broadcast_synthesis_error(self):
        """_broadcast_synthesis_error sends correct WebSocket event."""
        from core.routes import _broadcast_synthesis_error
        from core.ws import ws_manager

        mock_ws = AsyncMock()
        ws_manager.active_connections.add(mock_ws)

        try:
            await _broadcast_synthesis_error(42, 7, "Test error message")

            mock_ws.send_json.assert_called_once()
            call_data = mock_ws.send_json.call_args[0][0]
            assert call_data["type"] == "synthesis_error"
            assert call_data["form_id"] == 42
            assert call_data["round_id"] == 7
            assert call_data["error"] == "Test error message"
        finally:
            ws_manager.active_connections.discard(mock_ws)

    @pytest.mark.asyncio
    async def test_broadcast_error_handles_disconnected_ws(self):
        """Error broadcast gracefully handles disconnected WebSockets."""
        from core.routes import _broadcast_synthesis_error
        from core.ws import ws_manager

        mock_ws = AsyncMock()
        mock_ws.send_json.side_effect = Exception("Connection closed")
        ws_manager.active_connections.add(mock_ws)

        try:
            # Should not raise even when WebSocket fails
            await _broadcast_synthesis_error(1, 1, "Error")
        finally:
            # Cleanup (ws_manager.disconnect was called internally)
            ws_manager.active_connections.discard(mock_ws)


# =============================================================================
# 6. SETTINGS MODEL PROPAGATION
# =============================================================================


class TestSettingsModelPropagation:
    """Test that admin settings propagate to synthesis engine."""

    def test_resolve_model_from_settings(
        self, client: TestClient, admin_headers: dict
    ):
        """When synthesis_model is set in admin settings, it's reflected in status."""
        # Set a custom model
        resp = client.patch(
            "/admin/settings",
            json={"synthesis_model": "anthropic/claude-opus-4-6"},
            headers=admin_headers,
        )
        assert resp.status_code == 200

        # Check it's reflected in synthesis status
        status_resp = client.get(
            "/synthesis/status", headers=admin_headers
        )
        assert status_resp.status_code == 200
        assert status_resp.json()["default_model"] == "anthropic/claude-opus-4-6"

    def test_resolve_model_priority_chain(self):
        """_resolve_synthesis_model follows the priority chain correctly."""
        from core.routes import _resolve_synthesis_model

        # Mock a DB session with no Setting
        mock_db = MagicMock()
        mock_query = MagicMock()
        mock_db.query.return_value = mock_query
        mock_query.filter.return_value = mock_query
        mock_query.first.return_value = None

        # 1. Explicit payload takes priority
        assert _resolve_synthesis_model(mock_db, "explicit-model") == "explicit-model"

        # 2. No payload → DB setting
        mock_setting = MagicMock()
        mock_setting.value = "db-model"
        mock_query.first.return_value = mock_setting
        assert _resolve_synthesis_model(mock_db, None) == "db-model"

        # 3. No payload, no DB → env var / default
        mock_query.first.return_value = None
        result = _resolve_synthesis_model(mock_db, "")
        assert isinstance(result, str)
        assert len(result) > 0


# =============================================================================
# 7. CONSENSUS LIBRARY IMPORT FAILURE
# =============================================================================


class TestConsensusLibraryUnavailable:
    """Test graceful handling when the consensus library is not installed."""

    @pytest.mark.asyncio
    async def test_adapter_raises_config_error_on_import_failure(self):
        """When consensus library isn't installed, SynthesisConfigError is raised."""
        from core.synthesis import ConsensusLibraryAdapter, SynthesisConfigError

        adapter = ConsensusLibraryAdapter(strategy="simple")

        # Mock the import to fail
        with patch.dict("sys.modules", {"consensus": None, "consensus.config": None}):
            # Force re-init
            adapter._strategy_instance = None
            adapter._llm_client = None

            with pytest.raises(SynthesisConfigError):
                await adapter.run(
                    questions=[{"label": "Q?"}],
                    responses=[{"answers": {"q1": "A"}}],
                )

    def test_get_synthesiser_unknown_mode_message(self):
        """get_synthesiser with unknown mode gives helpful error message."""
        from core.synthesis import SynthesisConfigError, get_synthesiser

        with pytest.raises(SynthesisConfigError) as exc_info:
            get_synthesiser(mode="quantum")
        error_msg = str(exc_info.value)
        assert "quantum" in error_msg
        assert "mock" in error_msg
        assert "simple" in error_msg


# =============================================================================
# 8. ERROR EXCEPTION HIERARCHY
# =============================================================================


class TestSynthesisExceptionHierarchy:
    """Verify exception class hierarchy and usability."""

    def test_all_errors_inherit_from_base(self):
        """All custom synthesis errors inherit from SynthesisError."""
        from core.synthesis import (
            SynthesisConfigError,
            SynthesisError,
            SynthesisLibraryError,
            SynthesisResponseError,
            SynthesisTimeoutError,
        )

        for exc_cls in [
            SynthesisConfigError,
            SynthesisLibraryError,
            SynthesisTimeoutError,
            SynthesisResponseError,
        ]:
            assert issubclass(exc_cls, SynthesisError)
            # All can be instantiated with a message
            exc = exc_cls("test message")
            assert "test message" in str(exc)

    def test_synthesis_error_caught_by_base(self):
        """Catching SynthesisError catches all subtypes."""
        from core.synthesis import (
            SynthesisConfigError,
            SynthesisError,
            SynthesisTimeoutError,
        )

        for exc_cls in [SynthesisConfigError, SynthesisTimeoutError]:
            try:
                raise exc_cls("test")
            except SynthesisError:
                pass  # Should be caught
            else:
                pytest.fail(f"{exc_cls.__name__} not caught by SynthesisError")

    def test_mock_synthesis_result_json_serialisable(self):
        """MockSynthesis result is fully JSON-serialisable (end-to-end)."""
        import asyncio

        from core.synthesis import MockSynthesis

        mock = MockSynthesis()
        result = asyncio.get_event_loop().run_until_complete(
            mock.run(
                questions=[{"label": "Q1"}, {"label": "Q2"}],
                responses=[
                    {"answers": {"q1": "A1", "q2": "A2"}},
                    {"answers": {"q1": "B1", "q2": "B2"}},
                ],
            )
        )
        d = result.to_dict()
        serialised = json.dumps(d)
        assert len(serialised) > 100
        parsed = json.loads(serialised)
        assert "agreements" in parsed
        assert "emergent_insights" in parsed
        assert "minority_reports" in parsed
