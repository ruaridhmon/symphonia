"""
Tests for the Worker A synthesis adapter (synthesis_worker_a.py).

These tests exercise:
  - MockSynthesis behaviour
  - ProseResponse bridge type
  - ConsensusLibraryAdapter result mapping (via a fake library result)
  - Factory function (get_synthesiser)
  - Error-handling paths
  - AdapterContext protocol compliance
  - Async correctness
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

import pytest

# Import the module under test
from core.synthesis_worker_a import (
    AdapterContext,
    ConsensusLibraryAdapter,
    FlowMode,
    MockSynthesis,
    ProseResponse,
    SynthesisConfigError,
    SynthesisResult,
    get_synthesiser,
)


# ============================================================================
# HELPERS: Fake library domain objects
# ============================================================================


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


# ============================================================================
# SAMPLE DATA
# ============================================================================

SAMPLE_QUESTIONS: List[Dict[str, Any]] = [
    {"id": "q1", "label": "What is the main risk?"},
    {"id": "q2", "label": "How should we mitigate it?"},
]

SAMPLE_RESPONSES: List[Dict[str, Any]] = [
    {"answers": {"q1": "Budget overrun", "q2": "Phase the spending"}},
    {"answers": {"q1": "Technical debt", "q2": "Refactor incrementally"}},
    {"answers": {"q1": "Scope creep", "q2": "Strict change control"}},
]


# ============================================================================
# TEST 1: MockSynthesis returns well-formed results
# ============================================================================


@pytest.mark.asyncio
async def test_mock_synthesis_returns_valid_result():
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
    assert result.narrative.startswith("[MOCK]")
    assert len(result.analyst_reports) == 3


@pytest.mark.asyncio
async def test_mock_synthesis_scales_experts_to_response_count():
    """Supporting expert IDs should not exceed the number of actual responses."""
    mock = MockSynthesis(analysts=2)
    result = await mock.run(
        questions=SAMPLE_QUESTIONS,
        responses=[{"answers": {"q1": "A single response"}}],
    )

    for agreement in result.agreements:
        for expert_id in agreement.supporting_experts:
            assert expert_id <= 1, "Expert ID exceeds response count"


# ============================================================================
# TEST 2: MockSynthesis invokes progress callback
# ============================================================================


@pytest.mark.asyncio
async def test_mock_synthesis_calls_progress_callback():
    """MockSynthesis should invoke progress_callback at least twice."""
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


# ============================================================================
# TEST 3: SynthesisResult.to_dict() is JSON-serialisable
# ============================================================================


@pytest.mark.asyncio
async def test_synthesis_result_to_dict_serialisable():
    """to_dict() should produce a plain dict with no dataclass remnants."""
    import json

    mock = MockSynthesis()
    result = await mock.run(
        questions=SAMPLE_QUESTIONS,
        responses=SAMPLE_RESPONSES,
    )

    d = result.to_dict()
    assert isinstance(d, dict)
    # Should not throw — proves JSON-serialisability
    serialised = json.dumps(d)
    assert len(serialised) > 100


# ============================================================================
# TEST 4: ProseResponse satisfies library duck-typing contract
# ============================================================================


def test_prose_response_has_required_attributes():
    """ProseResponse must have 'expert_id' and 'response' attrs for duck typing."""
    pr = ProseResponse(expert_id="E1", response="My answer text")
    assert hasattr(pr, "expert_id")
    assert hasattr(pr, "response")
    assert pr.expert_id == "E1"
    assert pr.response == "My answer text"


def test_prose_response_is_frozen():
    """ProseResponse should be immutable (frozen dataclass)."""
    pr = ProseResponse(expert_id="E1", response="text")
    with pytest.raises(AttributeError):
        pr.expert_id = "E2"  # type: ignore[misc]


# ============================================================================
# TEST 5: AdapterContext satisfies protocol
# ============================================================================


def test_adapter_context_has_all_protocol_fields():
    """AdapterContext must expose all fields required by SynthesisContext protocol."""
    ctx = AdapterContext(
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


# ============================================================================
# TEST 6: ConsensusLibraryAdapter._map_to_app_format
# ============================================================================


def test_map_to_app_format_consensus_claims():
    """Claims with 'consensus' agreement_level should become Agreements."""
    adapter = ConsensusLibraryAdapter.__new__(ConsensusLibraryAdapter)
    adapter.strategy_name = "simple"
    adapter._effective_strategy = "simple"

    fake_result = FakePipelineResult(
        synthesis=FakeSynthesis(
            claims=(
                FakeClaim(
                    claim_id="c1",
                    text="Everyone agrees on X",
                    sources=(FakeSourceReference(source_id="E1", quote="I agree"),),
                    agreement_level="consensus",
                ),
            ),
            areas_of_agreement=(),
            areas_of_disagreement=(),
            uncertainties=(),
            narrative="Test narrative",
        ),
    )

    result = adapter._map_to_app_format(fake_result, num_responses=3)

    assert len(result.agreements) == 1
    assert result.agreements[0].claim == "Everyone agrees on X"
    assert result.agreements[0].confidence == 0.9
    assert 1 in result.agreements[0].supporting_experts


def test_map_to_app_format_divided_claims_become_disagreements():
    """Claims with 'divided' agreement_level should become Disagreements."""
    adapter = ConsensusLibraryAdapter.__new__(ConsensusLibraryAdapter)
    adapter.strategy_name = "ttd"
    adapter._effective_strategy = "ttd"

    fake_result = FakePipelineResult(
        synthesis=FakeSynthesis(
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
            areas_of_agreement=(),
            areas_of_disagreement=(),
            uncertainties=("Not sure about D",),
        ),
    )

    result = adapter._map_to_app_format(fake_result, num_responses=3)

    assert len(result.disagreements) == 1
    assert len(result.disagreements[0].positions) == 2  # main + counterargument
    assert len(result.nuances) == 1
    assert result.nuances[0].claim == "Not sure about D"


def test_map_to_app_format_deduplicates_areas():
    """Agreements from claims and areas_of_agreement should not duplicate."""
    adapter = ConsensusLibraryAdapter.__new__(ConsensusLibraryAdapter)
    adapter.strategy_name = "simple"
    adapter._effective_strategy = "simple"

    fake_result = FakePipelineResult(
        synthesis=FakeSynthesis(
            claims=(
                FakeClaim(
                    claim_id="c1",
                    text="Point A",
                    sources=(FakeSourceReference(source_id="E1", quote="yes"),),
                    agreement_level="consensus",
                ),
            ),
            areas_of_agreement=("Point A", "Point B"),  # "Point A" overlaps with claim
            areas_of_disagreement=(),
            uncertainties=(),
        ),
    )

    result = adapter._map_to_app_format(fake_result, num_responses=2)

    # Should have 2 agreements: "Point A" (from claim) and "Point B" (from area)
    agreement_claims = [a.claim for a in result.agreements]
    assert agreement_claims.count("Point A") == 1
    assert "Point B" in agreement_claims


# ============================================================================
# TEST 7: Factory function — get_synthesiser
# ============================================================================


def test_get_synthesiser_mock_mode():
    """get_synthesiser(mode='mock') should return MockSynthesis."""
    s = get_synthesiser(mode="mock")
    assert isinstance(s, MockSynthesis)


def test_get_synthesiser_simple_mode():
    """get_synthesiser(mode='simple') should return ConsensusLibraryAdapter."""
    s = get_synthesiser(mode="simple")
    assert isinstance(s, ConsensusLibraryAdapter)
    assert s._effective_strategy == "simple"


def test_get_synthesiser_ttd_mode():
    """get_synthesiser(mode='ttd') should return ConsensusLibraryAdapter."""
    s = get_synthesiser(mode="ttd")
    assert isinstance(s, ConsensusLibraryAdapter)
    assert s._effective_strategy == "ttd"


def test_get_synthesiser_committee_falls_back_to_ttd():
    """get_synthesiser(mode='committee') should fall back to TTD."""
    s = get_synthesiser(mode="committee")
    assert isinstance(s, ConsensusLibraryAdapter)
    assert s.strategy_name == "committee"  # original requested
    assert s._effective_strategy == "ttd"  # actual strategy


def test_get_synthesiser_invalid_mode_raises():
    """get_synthesiser with an unknown mode should raise SynthesisConfigError."""
    with pytest.raises(SynthesisConfigError, match="Unknown synthesis mode"):
        get_synthesiser(mode="nonexistent")


def test_get_synthesiser_reads_env_var(monkeypatch: pytest.MonkeyPatch):
    """get_synthesiser should fall back to SYNTHESIS_MODE env var."""
    monkeypatch.setenv("SYNTHESIS_MODE", "mock")
    s = get_synthesiser()
    assert isinstance(s, MockSynthesis)


# ============================================================================
# TEST 8: ConsensusLibraryAdapter rejects invalid strategies at construction
# ============================================================================


def test_adapter_rejects_unknown_strategy():
    """Constructor should raise SynthesisConfigError for bogus strategy names."""
    with pytest.raises(SynthesisConfigError, match="Unknown strategy"):
        ConsensusLibraryAdapter(strategy="bogus")


# ============================================================================
# TEST 9: _build_prose_responses handles various input shapes
# ============================================================================


def test_build_prose_responses_from_dict_with_answers():
    """Responses with 'answers' sub-dict should be formatted as Q/A pairs."""
    responses = [{"answers": {"q1": "Alpha", "q2": "Beta"}}]
    prose = ConsensusLibraryAdapter._build_prose_responses([], responses)
    assert len(prose) == 1
    assert prose[0].expert_id == "E1"
    assert "Alpha" in prose[0].response
    assert "Beta" in prose[0].response


def test_build_prose_responses_from_flat_dict():
    """Responses without 'answers' key should treat the dict itself as answers."""
    responses = [{"q1": "Gamma", "q2": "Delta"}]
    prose = ConsensusLibraryAdapter._build_prose_responses([], responses)
    assert len(prose) == 1
    assert "Gamma" in prose[0].response


def test_build_prose_responses_from_string():
    """Non-dict responses should be stringified."""
    responses = ["Just a plain string"]  # type: ignore[list-item]
    prose = ConsensusLibraryAdapter._build_prose_responses([], responses)
    assert prose[0].response == "Just a plain string"


def test_build_prose_responses_empty_answers():
    """Empty answers dict should produce a placeholder."""
    responses = [{"answers": {}}]
    prose = ConsensusLibraryAdapter._build_prose_responses([], responses)
    assert prose[0].response == "(no answers)"


# ============================================================================
# TEST 10: _extract_expert_ids handles various formats
# ============================================================================


def test_extract_expert_ids_normal():
    """Should extract integer IDs from 'E1', 'E2' format."""
    sources = [
        FakeSourceReference(source_id="E1", quote=""),
        FakeSourceReference(source_id="E3", quote=""),
    ]
    ids = ConsensusLibraryAdapter._extract_expert_ids(sources)
    assert ids == [1, 3]


def test_extract_expert_ids_skips_malformed():
    """Should skip source_ids that aren't 'E<digit>' format."""
    sources = [
        FakeSourceReference(source_id="unknown", quote=""),
        FakeSourceReference(source_id="E2", quote=""),
        FakeSourceReference(source_id="EXY", quote=""),
    ]
    ids = ConsensusLibraryAdapter._extract_expert_ids(sources)
    assert ids == [2]


# ============================================================================
# TEST 11: FlowMode enum
# ============================================================================


def test_flow_mode_values():
    """FlowMode should have the two expected values."""
    assert FlowMode.HUMAN_ONLY.value == "human_only"
    assert FlowMode.AI_ASSISTED.value == "ai_assisted"
    assert FlowMode("human_only") == FlowMode.HUMAN_ONLY


# ============================================================================
# TEST 12: Backwards-compat aliases
# ============================================================================


def test_backwards_compat_aliases():
    """CommitteeSynthesiser and OpenRouterSynthesis should alias the adapter."""
    from core.synthesis_worker_a import CommitteeSynthesiser, OpenRouterSynthesis

    assert CommitteeSynthesiser is ConsensusLibraryAdapter
    assert OpenRouterSynthesis is ConsensusLibraryAdapter
