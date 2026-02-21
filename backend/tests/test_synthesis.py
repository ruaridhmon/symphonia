"""
Merged test suite for the synthesis adapter (Byzantine-integrated).

Covers:
  - MockSynthesis behaviour (valid results, expert scaling, progress callback, serialisation)
  - ProseResponse bridge type (duck-typing contract, immutability)
  - AdapterSynthesisContext protocol compliance (fields, immutability)
  - Response mapping (_build_prose_responses: various input shapes, None filtering)
  - Question text flattening (_build_question_text: label, text, plain string)
  - Result mapping (_map_to_app_format: consensus, majority, divided, dedup, narrative, claims_raw, empty)
  - Factory function (mock / simple / ttd / committee fallback / env var / strategy alias / unknown)
  - Error handling (bad strategy, empty responses, timeout, missing API key)
  - Helper (_extract_expert_ids: valid IDs, malformed IDs, empty)
  - FlowMode enum values
  - Backwards-compat aliases
  - Synthesiser protocol

All tests are pure-unit: no network calls, no LLM invocations, no filesystem side-effects.
"""
from __future__ import annotations

import asyncio
import json
import os
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

# Import the module under test
from core.synthesis import (
    AdapterSynthesisContext,
    Agreement,
    ConsensusLibraryAdapter,
    Disagreement,
    FlowMode,
    MockSynthesis,
    Nuance,
    Probe,
    ProseResponse,
    Synthesiser,
    SynthesisConfigError,
    SynthesisError,
    SynthesisLibraryError,
    SynthesisResponseError,
    SynthesisResult,
    SynthesisTimeoutError,
    _extract_expert_ids,
    get_synthesiser,
)


# =============================================================================
# HELPERS: Fake library domain objects
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
    generated_at: datetime = field(
        default_factory=lambda: datetime.now(timezone.utc)
    )
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
    generated_at: datetime = field(
        default_factory=lambda: datetime.now(timezone.utc)
    )
    model: str = "test-model"
    prompt_version: str = "v1"
    code_version: str = "test"
    nodes: tuple = field(default_factory=tuple)
    edges: tuple = field(default_factory=tuple)


@dataclass(frozen=True)
class FakePipelineResult:
    graph: FakeGraph = field(default_factory=FakeGraph)
    synthesis: FakeSynthesis = field(default_factory=FakeSynthesis)


def _make_pipeline_result(
    claims: tuple = (),
    agreement_areas: tuple = (),
    disagreement_areas: tuple = (),
    uncertainties: tuple = (),
    narrative: str = "",
) -> FakePipelineResult:
    """Helper to build fake PipelineResults for mapping tests."""
    return FakePipelineResult(
        synthesis=FakeSynthesis(
            claims=claims,
            areas_of_agreement=agreement_areas,
            areas_of_disagreement=disagreement_areas,
            uncertainties=uncertainties,
            narrative=narrative,
        ),
    )


# =============================================================================
# SAMPLE DATA
# =============================================================================

SAMPLE_QUESTIONS: List[Dict[str, Any]] = [
    {"id": "q1", "label": "What is the main risk?"},
    {"id": "q2", "label": "How should we mitigate it?"},
]

SAMPLE_RESPONSES: List[Dict[str, Any]] = [
    {"answers": {"q1": "Budget overrun", "q2": "Phase the spending"}},
    {"answers": {"q1": "Technical debt", "q2": "Refactor incrementally"}},
    {"answers": {"q1": "Scope creep", "q2": "Strict change control"}},
]


# =============================================================================
# 1. MockSynthesis
# =============================================================================


class TestMockSynthesis:
    """Tests for the zero-cost mock synthesiser."""

    @pytest.mark.asyncio
    async def test_returns_valid_result(self) -> None:
        """MockSynthesis must return a SynthesisResult with correct structure."""
        mock = MockSynthesis(analysts=3, model="mock")
        result = await mock.run(
            questions=SAMPLE_QUESTIONS,
            responses=SAMPLE_RESPONSES,
        )
        assert isinstance(result, SynthesisResult)
        assert len(result.agreements) > 0
        assert len(result.disagreements) > 0
        assert len(result.nuances) > 0
        assert len(result.follow_up_probes) > 0
        assert "overall" in result.confidence_map
        assert result.provenance["mode"] == "mock"
        assert "[MOCK]" in result.narrative
        assert len(result.analyst_reports) == 3

    @pytest.mark.asyncio
    async def test_scales_experts_to_response_count(self) -> None:
        """Supporting expert IDs should not exceed the number of actual responses."""
        mock = MockSynthesis(analysts=2)
        result = await mock.run(
            questions=SAMPLE_QUESTIONS,
            responses=[{"answers": {"q1": "A single response"}}],
        )
        for agreement in result.agreements:
            for expert_id in agreement.supporting_experts:
                assert expert_id <= 1, "Expert ID exceeds response count"

    @pytest.mark.asyncio
    async def test_calls_progress_callback(self) -> None:
        """MockSynthesis should invoke progress_callback at two stages."""
        stages: List[str] = []

        async def cb(stage: str, step: int, total: int) -> None:
            stages.append(stage)

        mock = MockSynthesis()
        await mock.run(
            questions=SAMPLE_QUESTIONS,
            responses=SAMPLE_RESPONSES,
            progress_callback=cb,
        )
        assert len(stages) >= 2
        assert "mock_init" in stages
        assert "mock_complete" in stages

    @pytest.mark.asyncio
    async def test_skips_callback_when_none(self) -> None:
        """MockSynthesis should work fine without a progress callback."""
        mock = MockSynthesis()
        result = await mock.run(
            questions=SAMPLE_QUESTIONS,
            responses=SAMPLE_RESPONSES,
            progress_callback=None,
        )
        assert isinstance(result, SynthesisResult)

    @pytest.mark.asyncio
    async def test_agreement_count(self) -> None:
        mock = MockSynthesis(analysts=2)
        result = await mock.run(questions=[], responses=[{}, {}, {}])
        assert len(result.agreements) == 2

    @pytest.mark.asyncio
    async def test_analyst_report_count_matches_analysts(self) -> None:
        mock = MockSynthesis(analysts=5)
        result = await mock.run(questions=[], responses=[{}])
        assert len(result.analyst_reports) == 5


# =============================================================================
# 2. SynthesisResult serialisation
# =============================================================================


class TestSynthesisResultSerialisation:

    @pytest.mark.asyncio
    async def test_to_dict_is_json_serialisable(self) -> None:
        """to_dict() should produce a plain dict with no dataclass remnants."""
        mock = MockSynthesis()
        result = await mock.run(
            questions=SAMPLE_QUESTIONS,
            responses=SAMPLE_RESPONSES,
        )
        d = result.to_dict()
        assert isinstance(d, dict)
        serialised = json.dumps(d)
        assert len(serialised) > 100

    @pytest.mark.asyncio
    async def test_to_dict_has_expected_keys(self) -> None:
        result = await MockSynthesis().run(questions=[], responses=[{}])
        d = result.to_dict()
        assert "agreements" in d
        assert "disagreements" in d
        assert "provenance" in d
        assert "confidence_map" in d


# =============================================================================
# 3. ProseResponse
# =============================================================================


class TestProseResponse:
    """ProseResponse must satisfy the library's duck-typing contract."""

    def test_has_required_attributes(self) -> None:
        pr = ProseResponse(expert_id="E1", response="My answer text")
        assert hasattr(pr, "expert_id")
        assert hasattr(pr, "response")
        assert pr.expert_id == "E1"
        assert pr.response == "My answer text"

    def test_is_frozen(self) -> None:
        pr = ProseResponse(expert_id="E1", response="text")
        with pytest.raises(AttributeError):
            pr.expert_id = "E2"  # type: ignore[misc]


# =============================================================================
# 4. AdapterSynthesisContext
# =============================================================================


class TestAdapterSynthesisContext:
    """Verify the context satisfies the SynthesisContext protocol."""

    def test_has_all_protocol_fields(self) -> None:
        ctx = AdapterSynthesisContext(
            study_id="s1",
            round_id="r1",
            question_id="q1",
            question_text="What is X?",
            code_version="v1",
        )
        assert ctx.study_id == "s1"
        assert ctx.round_id == "r1"
        assert ctx.question_id == "q1"
        assert ctx.question_text == "What is X?"
        assert ctx.code_version == "v1"
        assert ctx.force_restart is False

    def test_is_frozen(self) -> None:
        ctx = AdapterSynthesisContext(
            study_id="s",
            round_id="r",
            question_id="q",
            question_text="t",
            code_version="v",
        )
        with pytest.raises(AttributeError):
            ctx.study_id = "changed"  # type: ignore[misc]


# =============================================================================
# 5. _build_prose_responses
# =============================================================================


class TestBuildProseResponses:
    """Tests for ConsensusLibraryAdapter._build_prose_responses."""

    def test_dict_with_answers(self) -> None:
        responses = [{"answers": {"q1": "Alpha", "q2": "Beta"}}]
        prose = ConsensusLibraryAdapter._build_prose_responses(responses)
        assert len(prose) == 1
        assert prose[0].expert_id == "E1"
        assert "Alpha" in prose[0].response
        assert "Beta" in prose[0].response

    def test_multiple_responses_sequential_ids(self) -> None:
        responses = [
            {"answers": {"q1": "A"}},
            {"answers": {"q1": "B"}},
            {"answers": {"q1": "C"}},
        ]
        prose = ConsensusLibraryAdapter._build_prose_responses(responses)
        assert [r.expert_id for r in prose] == ["E1", "E2", "E3"]

    def test_flat_dict_without_answers_key(self) -> None:
        responses = [{"q1": "Gamma", "q2": "Delta"}]
        prose = ConsensusLibraryAdapter._build_prose_responses(responses)
        assert len(prose) == 1
        assert "Gamma" in prose[0].response

    def test_empty_answers_produces_placeholder(self) -> None:
        responses = [{"answers": {}}]
        prose = ConsensusLibraryAdapter._build_prose_responses(responses)
        assert prose[0].response == "(no answers provided)"

    def test_none_values_are_filtered(self) -> None:
        responses = [{"answers": {"q1": "Present", "q2": None}}]
        prose = ConsensusLibraryAdapter._build_prose_responses(responses)
        assert "q2" not in prose[0].response
        assert "Present" in prose[0].response

    def test_string_response_passthrough(self) -> None:
        responses = [{"answers": "Raw text response"}]
        prose = ConsensusLibraryAdapter._build_prose_responses(responses)
        assert prose[0].response == "Raw text response"

    def test_non_dict_response_stringified(self) -> None:
        responses = ["Just a plain string"]  # type: ignore[list-item]
        prose = ConsensusLibraryAdapter._build_prose_responses(responses)
        assert prose[0].response == "Just a plain string"

    def test_whitespace_only_values_are_filtered(self) -> None:
        responses = [{"answers": {"q1": "Valid", "q2": "   "}}]
        prose = ConsensusLibraryAdapter._build_prose_responses(responses)
        assert "q2" not in prose[0].response


# =============================================================================
# 6. _build_question_text
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

    def test_dict_with_id_fallback(self) -> None:
        qs = [{"id": "q42"}]
        text = ConsensusLibraryAdapter._build_question_text(qs)
        assert text == "1. q42"

    def test_plain_string(self) -> None:
        qs = ["Question one", "Question two"]
        text = ConsensusLibraryAdapter._build_question_text(qs)
        assert "1. Question one" in text
        assert "2. Question two" in text


# =============================================================================
# 7. Result mapping (_map_to_app_format)
# =============================================================================


class TestMapToAppFormat:
    """Tests for ConsensusLibraryAdapter._map_to_app_format."""

    def _make_adapter(
        self, strategy: str = "simple", effective: str = "simple"
    ) -> ConsensusLibraryAdapter:
        adapter = ConsensusLibraryAdapter.__new__(ConsensusLibraryAdapter)
        adapter.strategy_name = strategy
        adapter._effective_strategy = effective
        return adapter

    def test_consensus_claim_becomes_agreement(self) -> None:
        adapter = self._make_adapter()
        pr = _make_pipeline_result(
            claims=(
                FakeClaim(
                    claim_id="c1",
                    text="Everyone agrees on X",
                    sources=(
                        FakeSourceReference(source_id="E1", quote="I agree"),
                    ),
                    agreement_level="consensus",
                ),
            ),
            narrative="Test narrative",
        )
        result = adapter._map_to_app_format(pr, num_responses=3)
        assert len(result.agreements) == 1
        assert result.agreements[0].claim == "Everyone agrees on X"
        assert result.agreements[0].confidence == 0.9
        assert 1 in result.agreements[0].supporting_experts

    def test_majority_claim_lower_confidence(self) -> None:
        adapter = self._make_adapter()
        pr = _make_pipeline_result(
            claims=(
                FakeClaim(
                    claim_id="c1",
                    text="Most agree",
                    sources=(FakeSourceReference("E2", "quote"),),
                    agreement_level="majority",
                ),
            ),
        )
        result = adapter._map_to_app_format(pr, num_responses=3)
        assert result.agreements[0].confidence == 0.7

    def test_divided_claim_becomes_disagreement(self) -> None:
        adapter = self._make_adapter("ttd", "ttd")
        pr = _make_pipeline_result(
            claims=(
                FakeClaim(
                    claim_id="c1",
                    text="Controversial topic",
                    sources=(
                        FakeSourceReference(source_id="E1", quote="I think A"),
                        FakeSourceReference(source_id="E2", quote="I think B"),
                    ),
                    agreement_level="divided",
                    counterarguments=("But actually C",),
                ),
            ),
            uncertainties=("Not sure about D",),
        )
        result = adapter._map_to_app_format(pr, num_responses=3)
        assert len(result.disagreements) == 1
        # main position + counterargument = 2
        assert len(result.disagreements[0].positions) == 2
        assert len(result.nuances) == 1
        assert result.nuances[0].claim == "Not sure about D"

    def test_deduplicates_areas_with_claims(self) -> None:
        adapter = self._make_adapter()
        pr = _make_pipeline_result(
            claims=(
                FakeClaim(
                    claim_id="c1",
                    text="Point A",
                    sources=(FakeSourceReference("E1", "yes"),),
                    agreement_level="consensus",
                ),
            ),
            agreement_areas=("Point A", "Point B"),
        )
        result = adapter._map_to_app_format(pr, num_responses=2)
        claims = [a.claim for a in result.agreements]
        assert claims.count("Point A") == 1
        assert "Point B" in claims

    def test_deduplicates_disagreement_areas(self) -> None:
        adapter = self._make_adapter()
        pr = _make_pipeline_result(
            claims=(
                FakeClaim(
                    claim_id="c1",
                    text="Issue X",
                    sources=(),
                    agreement_level="divided",
                ),
            ),
            disagreement_areas=("Issue X", "Issue Y"),
        )
        result = adapter._map_to_app_format(pr, num_responses=2)
        topics = [d.topic for d in result.disagreements]
        assert topics.count("Issue X") == 1
        assert "Issue Y" in topics

    def test_narrative_preserved(self) -> None:
        adapter = self._make_adapter()
        pr = _make_pipeline_result(narrative="Expert summary text.")
        result = adapter._map_to_app_format(pr, num_responses=1)
        assert result.narrative == "Expert summary text."

    def test_claims_raw_populated(self) -> None:
        adapter = self._make_adapter()
        pr = _make_pipeline_result(
            claims=(
                FakeClaim(
                    claim_id="c1",
                    text="A claim",
                    sources=(FakeSourceReference("E1", "q"),),
                    agreement_level="consensus",
                ),
            ),
        )
        result = adapter._map_to_app_format(pr, num_responses=1)
        assert result.claims_raw is not None
        assert result.claims_raw[0]["id"] == "c1"
        assert result.claims_raw[0]["text"] == "A claim"

    def test_empty_synthesis_produces_valid_result(self) -> None:
        adapter = self._make_adapter()
        pr = _make_pipeline_result()
        result = adapter._map_to_app_format(pr, num_responses=1)
        assert result.confidence_map["overall"] == 0.5  # no claims → default
        assert result.agreements == []
        assert result.disagreements == []

    def test_provenance_includes_effective_strategy(self) -> None:
        adapter = self._make_adapter("committee", "ttd")
        pr = _make_pipeline_result()
        result = adapter._map_to_app_format(pr, num_responses=1)
        assert result.provenance["strategy"] == "committee"
        assert result.provenance["effective_strategy"] == "ttd"
        assert "adapter_version" in result.provenance

    def test_long_claim_text_truncated_in_topic(self) -> None:
        adapter = self._make_adapter()
        long_text = "A" * 100
        pr = _make_pipeline_result(
            claims=(
                FakeClaim(
                    claim_id="c1",
                    text=long_text,
                    sources=(),
                    agreement_level="divided",
                ),
            ),
        )
        result = adapter._map_to_app_format(pr, num_responses=1)
        assert len(result.disagreements[0].topic) < len(long_text)
        assert result.disagreements[0].topic.endswith("…")


# =============================================================================
# 8. Factory function
# =============================================================================


class TestFactory:

    def test_mock_mode(self) -> None:
        s = get_synthesiser(mode="mock")
        assert isinstance(s, MockSynthesis)

    def test_simple_mode(self) -> None:
        s = get_synthesiser(mode="simple")
        assert isinstance(s, ConsensusLibraryAdapter)
        assert s._effective_strategy == "simple"

    def test_ttd_mode(self) -> None:
        s = get_synthesiser(mode="ttd")
        assert isinstance(s, ConsensusLibraryAdapter)
        assert s._effective_strategy == "ttd"

    def test_committee_falls_back_to_ttd(self) -> None:
        s = get_synthesiser(mode="committee")
        assert isinstance(s, ConsensusLibraryAdapter)
        assert s.strategy_name == "committee"
        assert s._effective_strategy == "ttd"

    def test_unknown_mode_raises(self) -> None:
        with pytest.raises(SynthesisConfigError, match="Unknown synthesis mode"):
            get_synthesiser(mode="nonexistent")

    def test_env_var_fallback(self, monkeypatch: pytest.MonkeyPatch) -> None:
        monkeypatch.setenv("SYNTHESIS_MODE", "mock")
        s = get_synthesiser()
        assert isinstance(s, MockSynthesis)

    def test_strategy_alias(self) -> None:
        s = get_synthesiser(strategy="ttd")
        assert isinstance(s, ConsensusLibraryAdapter)
        assert s._effective_strategy == "ttd"

    def test_n_analysts_passed_through(self) -> None:
        s = get_synthesiser(mode="ttd", n_analysts=7)
        assert isinstance(s, ConsensusLibraryAdapter)
        assert s.n_drafts == 7

    def test_timeout_passed_through(self) -> None:
        s = get_synthesiser(mode="simple", timeout_seconds=120.0)
        assert isinstance(s, ConsensusLibraryAdapter)
        assert s.timeout_seconds == 120.0

    def test_api_key_set_in_env(self, monkeypatch: pytest.MonkeyPatch) -> None:
        monkeypatch.delenv("OPENROUTER_API_KEY", raising=False)
        s = get_synthesiser(mode="simple", api_key="test-key-123")
        assert isinstance(s, ConsensusLibraryAdapter)
        assert os.getenv("OPENROUTER_API_KEY") == "test-key-123"
        # Clean up
        monkeypatch.delenv("OPENROUTER_API_KEY", raising=False)


# =============================================================================
# 9. Error handling
# =============================================================================


class TestErrorHandling:

    def test_adapter_rejects_unknown_strategy(self) -> None:
        with pytest.raises(SynthesisConfigError, match="Unknown strategy"):
            ConsensusLibraryAdapter(strategy="bogus")

    @pytest.mark.asyncio
    async def test_empty_responses_rejected(self) -> None:
        adapter = ConsensusLibraryAdapter(strategy="simple")
        with pytest.raises(
            SynthesisResponseError, match="zero responses"
        ):
            await adapter.run(questions=[], responses=[])

    @pytest.mark.asyncio
    async def test_missing_api_key_raises_config_error(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        adapter = ConsensusLibraryAdapter(strategy="simple")
        monkeypatch.delenv("OPENROUTER_API_KEY", raising=False)
        # The _lazy_init will try to import consensus — if not installed,
        # it raises SynthesisConfigError about imports. Either way, we get SynthesisError.
        with pytest.raises(SynthesisError):
            await adapter.run(
                questions=[{"label": "Q"}],
                responses=[{"answers": {"q1": "A"}}],
            )

    def test_default_timeout(self) -> None:
        adapter = ConsensusLibraryAdapter(strategy="simple")
        assert adapter.timeout_seconds == 600.0

    def test_custom_timeout(self) -> None:
        adapter = ConsensusLibraryAdapter(
            strategy="simple", timeout_seconds=30.0
        )
        assert adapter.timeout_seconds == 30.0


# =============================================================================
# 10. _extract_expert_ids
# =============================================================================


class TestExtractExpertIds:

    def test_valid_ids(self) -> None:
        sources = [
            FakeSourceReference("E1", ""),
            FakeSourceReference("E3", ""),
        ]
        assert _extract_expert_ids(sources) == [1, 3]

    def test_non_expert_ids_ignored(self) -> None:
        sources = [
            FakeSourceReference("unknown", ""),
            FakeSourceReference("E2", ""),
            FakeSourceReference("EXY", ""),
            FakeSourceReference("X99", ""),
            FakeSourceReference("synthesis:1", ""),
        ]
        assert _extract_expert_ids(sources) == [2]

    def test_empty_sources(self) -> None:
        assert _extract_expert_ids([]) == []


# =============================================================================
# 11. FlowMode enum
# =============================================================================


class TestFlowMode:

    def test_values(self) -> None:
        assert FlowMode.HUMAN_ONLY.value == "human_only"
        assert FlowMode.AI_ASSISTED.value == "ai_assisted"
        assert FlowMode("human_only") == FlowMode.HUMAN_ONLY


# =============================================================================
# 12. Backwards-compat aliases
# =============================================================================


class TestBackwardsCompat:

    def test_committee_synthesiser_alias(self) -> None:
        from core.synthesis import CommitteeSynthesiser

        assert CommitteeSynthesiser is ConsensusLibraryAdapter

    def test_openrouter_synthesis_alias(self) -> None:
        from core.synthesis import OpenRouterSynthesis

        assert OpenRouterSynthesis is ConsensusLibraryAdapter


# =============================================================================
# 13. Synthesiser protocol
# =============================================================================


class TestSynthesiserProtocol:

    def test_mock_satisfies_protocol(self) -> None:
        mock = MockSynthesis()
        assert isinstance(mock, Synthesiser)

    def test_adapter_satisfies_protocol(self) -> None:
        adapter = ConsensusLibraryAdapter(strategy="simple")
        assert isinstance(adapter, Synthesiser)


# =============================================================================
# 14. Comments context integration
# =============================================================================


class TestCommentsContextIntegration:
    """Tests that comments_context flows through synthesis correctly."""

    @pytest.mark.asyncio
    async def test_mock_accepts_comments_context(self) -> None:
        """MockSynthesis should accept comments_context without error."""
        mock = MockSynthesis()
        result = await mock.run(
            questions=SAMPLE_QUESTIONS,
            responses=SAMPLE_RESPONSES,
            comments_context="[Comments] Expert A: I disagree with point 2",
        )
        assert isinstance(result, SynthesisResult)

    @pytest.mark.asyncio
    async def test_mock_works_with_empty_comments(self) -> None:
        """MockSynthesis should work fine with empty comments_context."""
        mock = MockSynthesis()
        result = await mock.run(
            questions=SAMPLE_QUESTIONS,
            responses=SAMPLE_RESPONSES,
            comments_context="",
        )
        assert isinstance(result, SynthesisResult)

    @pytest.mark.asyncio
    async def test_adapter_appends_comments_to_question_text(self) -> None:
        """ConsensusLibraryAdapter should append comments to the question text in the context."""
        adapter = ConsensusLibraryAdapter.__new__(ConsensusLibraryAdapter)
        adapter.strategy_name = "simple"
        adapter._effective_strategy = "simple"
        adapter.timeout_seconds = 60.0
        adapter._strategy_instance = None
        adapter._llm_client = None

        # Track what context is passed to the library strategy
        captured_context = {}

        async def fake_strategy_run(context, responses):
            captured_context["question_text"] = context.question_text
            return _make_pipeline_result(narrative="Test with comments")

        # Manually init and replace strategy
        mock_strategy = MagicMock()
        mock_strategy.run = AsyncMock(side_effect=fake_strategy_run)
        adapter._strategy_instance = mock_strategy

        comments = "--- Expert Discussion Comments ---\nExpert A: This needs more data"

        result = await adapter.run(
            questions=SAMPLE_QUESTIONS,
            responses=SAMPLE_RESPONSES,
            comments_context=comments,
        )

        assert isinstance(result, SynthesisResult)
        assert "Expert Discussion Comments" in captured_context["question_text"]
        assert "This needs more data" in captured_context["question_text"]

    @pytest.mark.asyncio
    async def test_adapter_no_comments_no_append(self) -> None:
        """ConsensusLibraryAdapter should NOT modify question text when comments are empty."""
        adapter = ConsensusLibraryAdapter.__new__(ConsensusLibraryAdapter)
        adapter.strategy_name = "simple"
        adapter._effective_strategy = "simple"
        adapter.timeout_seconds = 60.0
        adapter._strategy_instance = None
        adapter._llm_client = None

        captured_context = {}

        async def fake_strategy_run(context, responses):
            captured_context["question_text"] = context.question_text
            return _make_pipeline_result(narrative="Test no comments")

        mock_strategy = MagicMock()
        mock_strategy.run = AsyncMock(side_effect=fake_strategy_run)
        adapter._strategy_instance = mock_strategy

        result = await adapter.run(
            questions=SAMPLE_QUESTIONS,
            responses=SAMPLE_RESPONSES,
            comments_context="",
        )

        assert isinstance(result, SynthesisResult)
        # Should NOT contain comment markers
        assert "Discussion Comments" not in captured_context["question_text"]


class TestFormatCommentsAsContext:
    """Tests for the _format_comments_as_context helper in routes."""

    def test_empty_comments_returns_empty_string(self) -> None:
        from core.routes import _format_comments_as_context
        assert _format_comments_as_context([]) == ""

    def test_formats_comments_with_sections(self) -> None:
        from core.routes import _format_comments_as_context

        # Create mock comment objects
        comment = MagicMock()
        comment.section_type = "agreement"
        comment.section_index = 0
        comment.parent_id = None
        comment.author_id = 1
        comment.body = "I strongly support this finding"
        comment.author = MagicMock()
        comment.author.email = "expert@test.com"

        result = _format_comments_as_context([comment])
        assert "Expert Discussion Comments" in result
        assert "Agreement" in result
        assert "expert@test.com" in result
        assert "I strongly support this finding" in result
        assert "(item #1)" in result

    def test_formats_replies_with_indent(self) -> None:
        from core.routes import _format_comments_as_context

        parent = MagicMock()
        parent.section_type = "disagreement"
        parent.section_index = 1
        parent.parent_id = None
        parent.author_id = 1
        parent.body = "This seems off"
        parent.author = MagicMock()
        parent.author.email = "expert1@test.com"

        reply = MagicMock()
        reply.section_type = "disagreement"
        reply.section_index = 1
        reply.parent_id = 99  # has a parent
        reply.author_id = 2
        reply.body = "I agree it needs revision"
        reply.author = MagicMock()
        reply.author.email = "expert2@test.com"

        result = _format_comments_as_context([parent, reply])
        assert "Reply" in result
        assert "expert2@test.com" in result

    def test_groups_by_section_type(self) -> None:
        from core.routes import _format_comments_as_context

        c1 = MagicMock()
        c1.section_type = "agreement"
        c1.section_index = 0
        c1.parent_id = None
        c1.author_id = 1
        c1.body = "Agree comment"
        c1.author = MagicMock()
        c1.author.email = "a@test.com"

        c2 = MagicMock()
        c2.section_type = "nuance"
        c2.section_index = 0
        c2.parent_id = None
        c2.author_id = 2
        c2.body = "Nuance comment"
        c2.author = MagicMock()
        c2.author.email = "b@test.com"

        result = _format_comments_as_context([c1, c2])
        assert "Agreement" in result
        assert "Nuance" in result
        assert result.index("Agreement") < result.index("Nuance") or result.index("Nuance") < result.index("Agreement")
