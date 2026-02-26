"""
Tests for the synthesis adapter (Worker B implementation).

Covers:
- MockSynthesis deterministic output
- ProseResponse bridge objects
- AdapterSynthesisContext protocol conformance
- Response mapping (app dicts → ProseResponse)
- Question text flattening
- Result mapping (library PipelineResult → SynthesisResult)
- Factory function routing (mock / simple / ttd / committee fallback / unknown)
- Error propagation (missing API key, bad strategy, empty responses)
- SynthesisResult serialisation (.to_dict())

All tests are pure-unit: no network, no LLM calls, no filesystem side-effects.
"""

from __future__ import annotations

import asyncio
import os
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

# Import the module under test
from core.synthesis_worker_b import (
    AdapterSynthesisContext,
    Agreement,
    ConfigurationError,
    ConsensusLibraryAdapter,
    Disagreement,
    FlowMode,
    LibraryError,
    MockSynthesis,
    Nuance,
    Probe,
    ProseResponse,
    ResponseMappingError,
    SynthesisError,
    SynthesisResult,
    _extract_expert_ids,
    get_synthesiser,
)


# =============================================================================
# FIXTURES: Fake library domain models (to avoid importing the real library)
# =============================================================================


@dataclass(frozen=True)
class FakeSourceReference:
    source_id: str
    quote: str
    confidence: Optional[str] = None


@dataclass(frozen=True)
class FakeClaim:
    claim_id: str
    text: str
    sources: Tuple[FakeSourceReference, ...]
    agreement_level: str  # "consensus" | "majority" | "divided" | "minority"
    counterarguments: Tuple[str, ...] = field(default_factory=tuple)


@dataclass(frozen=True)
class FakeSynthesis:
    schema_version: str = "1.0"
    study_id: str = "test"
    round_id: str = "1"
    question_id: str = "q1"
    generated_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    model: str = "test-model"
    prompt_version: str = "v1"
    code_version: str = "test"
    claims: Tuple[FakeClaim, ...] = field(default_factory=tuple)
    areas_of_agreement: Tuple[str, ...] = field(default_factory=tuple)
    areas_of_disagreement: Tuple[str, ...] = field(default_factory=tuple)
    uncertainties: Tuple[str, ...] = field(default_factory=tuple)
    narrative: str = ""


@dataclass(frozen=True)
class FakeGraph:
    schema_version: str = "1.0"
    study_id: str = "test"
    round_id: str = "1"
    question_id: str = "q1"
    generated_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    model: str = "test-model"
    prompt_version: str = "v1"
    code_version: str = "test"
    nodes: tuple = field(default_factory=tuple)
    edges: tuple = field(default_factory=tuple)


@dataclass(frozen=True)
class FakePipelineResult:
    graph: FakeGraph = field(default_factory=FakeGraph)
    synthesis: FakeSynthesis = field(default_factory=FakeSynthesis)


# =============================================================================
# 1. MockSynthesis
# =============================================================================


class TestMockSynthesis:
    """Tests for the zero-cost mock synthesiser."""

    @pytest.mark.asyncio
    async def test_returns_synthesis_result(self) -> None:
        mock = MockSynthesis(analysts=3)
        result = await mock.run(
            questions=[{"label": "What matters?"}],
            responses=[{"answers": {"q1": "A lot"}}, {"answers": {"q1": "Not much"}}],
        )
        assert isinstance(result, SynthesisResult)

    @pytest.mark.asyncio
    async def test_agreement_count(self) -> None:
        mock = MockSynthesis(analysts=2)
        result = await mock.run(questions=[], responses=[{}, {}, {}])
        assert len(result.agreements) == 2

    @pytest.mark.asyncio
    async def test_provenance_is_mock(self) -> None:
        mock = MockSynthesis()
        result = await mock.run(questions=[], responses=[{}])
        assert result.provenance["mode"] == "mock"

    @pytest.mark.asyncio
    async def test_narrative_is_mock(self) -> None:
        result = await MockSynthesis().run(questions=[], responses=[{}])
        assert "[MOCK]" in result.narrative

    @pytest.mark.asyncio
    async def test_progress_callback_is_invoked(self) -> None:
        cb = AsyncMock()
        await MockSynthesis().run(questions=[], responses=[{}], progress_callback=cb)
        cb.assert_awaited_once_with("mock_synthesis", 1, 1)

    @pytest.mark.asyncio
    async def test_to_dict_serialisable(self) -> None:
        result = await MockSynthesis().run(questions=[], responses=[{}])
        d = result.to_dict()
        assert isinstance(d, dict)
        assert "agreements" in d
        assert "provenance" in d


# =============================================================================
# 2. ProseResponse
# =============================================================================


class TestProseResponse:
    """ProseResponse must satisfy the library's duck-typing contract."""

    def test_has_required_attributes(self) -> None:
        pr = ProseResponse(expert_id="E1", response="My thoughts…")
        assert hasattr(pr, "expert_id")
        assert hasattr(pr, "response")
        assert pr.expert_id == "E1"
        assert pr.response == "My thoughts…"

    def test_is_frozen(self) -> None:
        pr = ProseResponse(expert_id="E1", response="text")
        with pytest.raises(AttributeError):
            pr.expert_id = "E2"  # type: ignore[misc]


# =============================================================================
# 3. AdapterSynthesisContext
# =============================================================================


class TestAdapterSynthesisContext:
    """Verify the context satisfies the SynthesisContext protocol."""

    def test_protocol_fields(self) -> None:
        ctx = AdapterSynthesisContext(
            study_id="s1",
            round_id="r1",
            question_id="q1",
            question_text="What?",
            code_version="abc123",
        )
        assert ctx.study_id == "s1"
        assert ctx.force_restart is False

    def test_frozen(self) -> None:
        ctx = AdapterSynthesisContext(
            study_id="s", round_id="r", question_id="q",
            question_text="t", code_version="v",
        )
        with pytest.raises(AttributeError):
            ctx.study_id = "changed"  # type: ignore[misc]


# =============================================================================
# 4. Response mapping (app dicts → ProseResponse)
# =============================================================================


class TestBuildProseResponses:
    """Tests for ConsensusLibraryAdapter._build_prose_responses."""

    def test_basic_answers_dict(self) -> None:
        responses = [{"answers": {"q1": "Yes", "q2": "No"}}]
        result = ConsensusLibraryAdapter._build_prose_responses(responses)
        assert len(result) == 1
        assert "Q: q1\nA: Yes" in result[0].response
        assert result[0].expert_id == "E1"

    def test_multiple_responses_get_sequential_ids(self) -> None:
        responses = [{"answers": {"q1": "A"}}, {"answers": {"q1": "B"}}, {"answers": {"q1": "C"}}]
        result = ConsensusLibraryAdapter._build_prose_responses(responses)
        assert [r.expert_id for r in result] == ["E1", "E2", "E3"]

    def test_flat_dict_without_answers_key(self) -> None:
        """If the dict has no 'answers' key, treat the whole dict as answers."""
        responses = [{"q1": "Direct answer"}]
        result = ConsensusLibraryAdapter._build_prose_responses(responses)
        assert "Direct answer" in result[0].response

    def test_empty_answers_produce_placeholder(self) -> None:
        responses = [{"answers": {}}]
        result = ConsensusLibraryAdapter._build_prose_responses(responses)
        assert result[0].response == "(no answers provided)"

    def test_none_values_are_filtered(self) -> None:
        responses = [{"answers": {"q1": "Present", "q2": None}}]
        result = ConsensusLibraryAdapter._build_prose_responses(responses)
        assert "q2" not in result[0].response

    def test_string_response_passthrough(self) -> None:
        responses = [{"answers": "Raw text response"}]
        result = ConsensusLibraryAdapter._build_prose_responses(responses)
        assert result[0].response == "Raw text response"


# =============================================================================
# 5. Question text flattening
# =============================================================================


class TestBuildQuestionText:

    def test_dict_with_label(self) -> None:
        qs = [{"label": "What matters?", "id": "q1"}]
        text = ConsensusLibraryAdapter._build_question_text(qs)
        assert text == "1. What matters?"

    def test_dict_with_text_fallback(self) -> None:
        qs = [{"text": "Fallback text"}]
        text = ConsensusLibraryAdapter._build_question_text(qs)
        assert text == "1. Fallback text"

    def test_plain_string(self) -> None:
        qs = ["Question one", "Question two"]
        text = ConsensusLibraryAdapter._build_question_text(qs)
        assert "1. Question one" in text
        assert "2. Question two" in text


# =============================================================================
# 6. Result mapping (PipelineResult → SynthesisResult)
# =============================================================================


class TestMapToAppFormat:

    def _make_pipeline_result(
        self,
        claims: tuple = (),
        agreement_areas: tuple = (),
        disagreement_areas: tuple = (),
        uncertainties: tuple = (),
        narrative: str = "",
    ) -> FakePipelineResult:
        return FakePipelineResult(
            synthesis=FakeSynthesis(
                claims=claims,
                areas_of_agreement=agreement_areas,
                areas_of_disagreement=disagreement_areas,
                uncertainties=uncertainties,
                narrative=narrative,
            ),
        )

    def test_consensus_claim_becomes_agreement(self) -> None:
        claim = FakeClaim(
            claim_id="c1",
            text="All agree",
            sources=(FakeSourceReference("E1", "quote1"),),
            agreement_level="consensus",
        )
        pr = self._make_pipeline_result(claims=(claim,))
        result = ConsensusLibraryAdapter._map_to_app_format(pr, num_responses=3, strategy_name="simple")
        assert len(result.agreements) == 1
        assert result.agreements[0].confidence == 0.9

    def test_majority_claim_becomes_agreement_lower_confidence(self) -> None:
        claim = FakeClaim(
            claim_id="c1",
            text="Most agree",
            sources=(FakeSourceReference("E2", "quote"),),
            agreement_level="majority",
        )
        pr = self._make_pipeline_result(claims=(claim,))
        result = ConsensusLibraryAdapter._map_to_app_format(pr, num_responses=3, strategy_name="simple")
        assert result.agreements[0].confidence == 0.7

    def test_divided_claim_becomes_disagreement(self) -> None:
        claim = FakeClaim(
            claim_id="c1",
            text="Views split",
            sources=(FakeSourceReference("E1", "q"),),
            agreement_level="divided",
            counterarguments=("But also…",),
        )
        pr = self._make_pipeline_result(claims=(claim,))
        result = ConsensusLibraryAdapter._map_to_app_format(pr, num_responses=2, strategy_name="ttd")
        assert len(result.disagreements) == 1
        assert len(result.disagreements[0].positions) == 2  # original + counter

    def test_uncertainty_becomes_nuance(self) -> None:
        pr = self._make_pipeline_result(uncertainties=("Unclear timeline",))
        result = ConsensusLibraryAdapter._map_to_app_format(pr, num_responses=5, strategy_name="simple")
        assert len(result.nuances) == 1
        assert result.nuances[0].claim == "Unclear timeline"

    def test_areas_deduplicated_with_claims(self) -> None:
        claim = FakeClaim(
            claim_id="c1",
            text="Shared concern",
            sources=(),
            agreement_level="consensus",
        )
        pr = self._make_pipeline_result(
            claims=(claim,),
            agreement_areas=("Shared concern", "New area"),
        )
        result = ConsensusLibraryAdapter._map_to_app_format(pr, num_responses=3, strategy_name="simple")
        # "Shared concern" from claim + "New area" from areas = 2 total (not 3)
        assert len(result.agreements) == 2

    def test_narrative_preserved(self) -> None:
        pr = self._make_pipeline_result(narrative="Expert summary text.")
        result = ConsensusLibraryAdapter._map_to_app_format(pr, num_responses=1, strategy_name="simple")
        assert result.narrative == "Expert summary text."

    def test_claims_raw_populated(self) -> None:
        claim = FakeClaim(
            claim_id="c1", text="A claim",
            sources=(FakeSourceReference("E1", "q"),),
            agreement_level="consensus",
        )
        pr = self._make_pipeline_result(claims=(claim,))
        result = ConsensusLibraryAdapter._map_to_app_format(pr, num_responses=1, strategy_name="simple")
        assert result.claims_raw is not None
        assert result.claims_raw[0]["id"] == "c1"

    def test_empty_synthesis_produces_valid_result(self) -> None:
        pr = self._make_pipeline_result()
        result = ConsensusLibraryAdapter._map_to_app_format(pr, num_responses=1, strategy_name="simple")
        assert result.confidence_map["overall"] == 0.5  # no claims → default


# =============================================================================
# 7. Factory function
# =============================================================================


class TestFactory:

    def test_mock_mode(self) -> None:
        s = get_synthesiser(mode="mock")
        assert isinstance(s, MockSynthesis)

    def test_simple_mode(self) -> None:
        s = get_synthesiser(mode="simple")
        assert isinstance(s, ConsensusLibraryAdapter)
        assert s.strategy_name == "simple"

    def test_ttd_mode(self) -> None:
        s = get_synthesiser(mode="ttd")
        assert isinstance(s, ConsensusLibraryAdapter)
        assert s.strategy_name == "ttd"

    def test_committee_falls_back_to_ttd(self) -> None:
        s = get_synthesiser(mode="committee")
        assert isinstance(s, ConsensusLibraryAdapter)
        assert s.strategy_name == "ttd"

    def test_unknown_mode_raises(self) -> None:
        with pytest.raises(ConfigurationError, match="Unknown synthesis mode"):
            get_synthesiser(mode="quantum")

    def test_env_var_fallback(self) -> None:
        with patch.dict(os.environ, {"SYNTHESIS_MODE": "mock"}):
            s = get_synthesiser()
            assert isinstance(s, MockSynthesis)

    def test_strategy_alias(self) -> None:
        s = get_synthesiser(strategy="ttd")
        assert isinstance(s, ConsensusLibraryAdapter)
        assert s.strategy_name == "ttd"

    def test_n_analysts_passed_through(self) -> None:
        s = get_synthesiser(mode="ttd", n_analysts=7)
        assert isinstance(s, ConsensusLibraryAdapter)
        assert s.n_drafts == 7


# =============================================================================
# 8. Error propagation
# =============================================================================


class TestErrorPropagation:

    def test_unsupported_strategy_at_construction(self) -> None:
        with pytest.raises(ConfigurationError, match="Strategy must be"):
            ConsensusLibraryAdapter(strategy="bogus")

    @pytest.mark.asyncio
    async def test_empty_responses_rejected(self) -> None:
        adapter = ConsensusLibraryAdapter(strategy="simple")
        with pytest.raises(ResponseMappingError, match="zero responses"):
            await adapter.run(questions=[], responses=[])

    @pytest.mark.asyncio
    async def test_missing_api_key_raises_config_error(self) -> None:
        adapter = ConsensusLibraryAdapter(strategy="simple")
        with patch.dict(os.environ, {}, clear=True):
            # Remove OPENROUTER_API_KEY from env
            env_without_key = {k: v for k, v in os.environ.items() if k != "OPENROUTER_API_KEY"}
            with patch.dict(os.environ, env_without_key, clear=True):
                with pytest.raises((ConfigurationError, SynthesisError)):
                    await adapter.run(
                        questions=[{"label": "Q"}],
                        responses=[{"answers": {"q1": "A"}}],
                    )


# =============================================================================
# 9. Helper: _extract_expert_ids
# =============================================================================


class TestExtractExpertIds:

    def test_valid_ids(self) -> None:
        sources = [FakeSourceReference("E1", ""), FakeSourceReference("E3", "")]
        assert _extract_expert_ids(sources) == [1, 3]

    def test_non_expert_ids_ignored(self) -> None:
        sources = [FakeSourceReference("X99", ""), FakeSourceReference("synthesis:1", "")]
        assert _extract_expert_ids(sources) == []

    def test_empty_sources(self) -> None:
        assert _extract_expert_ids([]) == []


# =============================================================================
# 10. Backwards-compat aliases
# =============================================================================


class TestBackwardsCompat:

    def test_committee_synthesiser_alias(self) -> None:
        from core.synthesis_worker_b import CommitteeSynthesiser
        assert CommitteeSynthesiser is ConsensusLibraryAdapter

    def test_openrouter_synthesis_alias(self) -> None:
        from core.synthesis_worker_b import OpenRouterSynthesis
        assert OpenRouterSynthesis is ConsensusLibraryAdapter
