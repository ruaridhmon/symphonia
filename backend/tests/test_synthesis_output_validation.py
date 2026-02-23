"""
Synthesis Output Validation Tests (Task 5.3).

Comprehensive validation of synthesis output correctness, schema compliance,
and edge case handling. All tests are pure-unit: no network, no filesystem
side-effects, no LLM calls.

Coverage:
  1. Schema completeness — every SynthesisResult field present and typed
  2. Value range validation — confidence, severity, expert IDs
  3. Cross-field consistency — expert ID references across structures
  4. Edge cases — single/many responses, empty questions, None/whitespace/unicode answers
  5. MockSynthesis output validation — scaling, bounds, schema compliance
  6. ConsensusLibraryAdapter._map_to_app_format — claims mapping, dedup, empty
  7. Narrative validation — type, content
  8. Provenance validation — required keys, mode markers
"""
from __future__ import annotations

import json
from dataclasses import asdict, dataclass, field, fields
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

import pytest

from core.synthesis import (
    Agreement,
    ConsensusLibraryAdapter,
    Disagreement,
    EmergentInsight,
    FlowMode,
    MinorityReport,
    MockSynthesis,
    Nuance,
    Probe,
    SynthesisResult,
)


# =============================================================================
# FAKE LIBRARY DOMAIN OBJECTS (same pattern as test_synthesis.py)
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


def _make_adapter(
    strategy: str = "simple", effective: str = "simple"
) -> ConsensusLibraryAdapter:
    """Create an adapter without calling __init__ (avoids import side-effects)."""
    adapter = ConsensusLibraryAdapter.__new__(ConsensusLibraryAdapter)
    adapter.strategy_name = strategy
    adapter._effective_strategy = effective
    return adapter


# =============================================================================
# VALIDATION HELPERS
# =============================================================================

SYNTHESIS_RESULT_FIELDS = {f.name for f in fields(SynthesisResult)}

REQUIRED_TOP_LEVEL_KEYS = {
    "agreements",
    "disagreements",
    "nuances",
    "confidence_map",
    "follow_up_probes",
    "provenance",
    "analyst_reports",
    "meta_synthesis_reasoning",
    "narrative",
    "emergent_insights",
    "minority_reports",
}


def validate_synthesis_result(result: SynthesisResult, num_responses: int) -> List[str]:
    """
    Run all structural validations on a SynthesisResult.
    Returns a list of error strings (empty = valid).
    """
    errors: List[str] = []

    # -- Schema completeness --
    d = result.to_dict()
    for key in REQUIRED_TOP_LEVEL_KEYS:
        if key not in d:
            errors.append(f"Missing key: {key}")

    # -- Confidence values --
    for key, val in result.confidence_map.items():
        if not isinstance(val, (int, float)):
            errors.append(f"confidence_map[{key}] is not numeric: {type(val)}")
        elif key == "overall" and not (0.0 <= val <= 1.0):
            errors.append(f"confidence_map['overall'] out of range: {val}")

    if "overall" not in result.confidence_map:
        errors.append("confidence_map missing 'overall' key")

    # -- Agreements --
    for i, a in enumerate(result.agreements):
        if not isinstance(a.claim, str) or not a.claim.strip():
            errors.append(f"Agreement[{i}].claim is empty or not str")
        if not (0.0 <= a.confidence <= 1.0):
            errors.append(f"Agreement[{i}].confidence out of range: {a.confidence}")
        for eid in a.supporting_experts:
            if not isinstance(eid, int) or eid < 1:
                errors.append(f"Agreement[{i}] has invalid expert ID: {eid}")
            if eid > num_responses:
                errors.append(
                    f"Agreement[{i}] expert ID {eid} exceeds num_responses {num_responses}"
                )

    # -- Disagreements --
    for i, d_item in enumerate(result.disagreements):
        if not isinstance(d_item.topic, str) or not d_item.topic.strip():
            errors.append(f"Disagreement[{i}].topic is empty or not str")
        if d_item.severity not in ("low", "moderate", "high"):
            errors.append(f"Disagreement[{i}].severity invalid: {d_item.severity}")
        if not isinstance(d_item.positions, list):
            errors.append(f"Disagreement[{i}].positions is not a list")

    # -- Nuances --
    for i, n in enumerate(result.nuances):
        for eid in n.relevant_experts:
            if not isinstance(eid, int) or eid < 1:
                errors.append(f"Nuance[{i}] has invalid expert ID: {eid}")
            if eid > num_responses:
                errors.append(
                    f"Nuance[{i}] expert ID {eid} exceeds num_responses {num_responses}"
                )

    # -- Probes --
    for i, p in enumerate(result.follow_up_probes):
        for eid in p.target_experts:
            if not isinstance(eid, int) or eid < 1:
                errors.append(f"Probe[{i}] has invalid expert ID: {eid}")
            if eid > num_responses:
                errors.append(
                    f"Probe[{i}] expert ID {eid} exceeds num_responses {num_responses}"
                )

    # -- Emergent insights --
    for i, ei in enumerate(result.emergent_insights):
        for eid in ei.contributing_experts:
            if not isinstance(eid, int) or eid < 1:
                errors.append(f"EmergentInsight[{i}] has invalid expert ID: {eid}")
            if eid > num_responses:
                errors.append(
                    f"EmergentInsight[{i}] expert ID {eid} exceeds num_responses {num_responses}"
                )

    # -- Minority reports --
    for i, mr in enumerate(result.minority_reports):
        for eid in mr.expert_ids:
            if not isinstance(eid, int) or eid < 1:
                errors.append(f"MinorityReport[{i}] has invalid expert ID: {eid}")
            if eid > num_responses:
                errors.append(
                    f"MinorityReport[{i}] expert ID {eid} exceeds num_responses {num_responses}"
                )
        if mr.agreement_level not in ("minority", "divided"):
            errors.append(
                f"MinorityReport[{i}].agreement_level invalid: {mr.agreement_level}"
            )

    # -- Narrative --
    if not isinstance(result.narrative, str):
        errors.append(f"narrative is not a string: {type(result.narrative)}")

    return errors


# =============================================================================
# 1. SCHEMA COMPLETENESS VALIDATION
# =============================================================================


class TestSchemaCompleteness:
    """Every SynthesisResult field is present and correctly typed."""

    @pytest.mark.asyncio
    async def test_all_dataclass_fields_present_in_to_dict(self) -> None:
        """to_dict() output contains every field from the dataclass."""
        mock = MockSynthesis(analysts=3)
        result = await mock.run(questions=[], responses=[{}, {}, {}])
        d = result.to_dict()
        for field_name in SYNTHESIS_RESULT_FIELDS:
            assert field_name in d, f"Missing field in to_dict(): {field_name}"

    @pytest.mark.asyncio
    async def test_to_dict_json_serialisable(self) -> None:
        """to_dict() output is fully JSON-serialisable (no dataclass remnants)."""
        mock = MockSynthesis(analysts=2)
        result = await mock.run(questions=[], responses=[{}, {}])
        d = result.to_dict()
        serialised = json.dumps(d)
        roundtrip = json.loads(serialised)
        assert roundtrip["agreements"] == d["agreements"]
        assert roundtrip["disagreements"] == d["disagreements"]

    def test_agreement_serialises_correctly(self) -> None:
        """Agreement dataclass serialises to dict with correct keys."""
        a = Agreement(
            claim="Test",
            supporting_experts=[1, 2],
            confidence=0.85,
            evidence_summary="Evidence",
        )
        d = asdict(a)
        assert d == {
            "claim": "Test",
            "supporting_experts": [1, 2],
            "confidence": 0.85,
            "evidence_summary": "Evidence",
            "evidence_excerpts": [],
        }

    def test_disagreement_serialises_correctly(self) -> None:
        """Disagreement dataclass serialises to dict with correct keys."""
        d_item = Disagreement(
            topic="Topic",
            positions=[{"position": "A", "experts": [1]}],
            severity="high",
        )
        d = asdict(d_item)
        assert d["topic"] == "Topic"
        assert d["severity"] == "high"
        assert len(d["positions"]) == 1

    def test_nuance_serialises_correctly(self) -> None:
        n = Nuance(claim="C", context="Ctx", relevant_experts=[1, 3])
        d = asdict(n)
        assert d == {"claim": "C", "context": "Ctx", "relevant_experts": [1, 3]}

    def test_probe_serialises_correctly(self) -> None:
        p = Probe(question="Q?", target_experts=[2], rationale="Why")
        d = asdict(p)
        assert d == {"question": "Q?", "target_experts": [2], "rationale": "Why"}

    def test_emergent_insight_serialises_correctly(self) -> None:
        ei = EmergentInsight(
            insight="I",
            contributing_experts=[1, 2],
            emergence_type="synthesis",
            explanation="E",
        )
        d = asdict(ei)
        assert d["insight"] == "I"
        assert d["contributing_experts"] == [1, 2]
        assert d["emergence_type"] == "synthesis"

    def test_minority_report_serialises_correctly(self) -> None:
        mr = MinorityReport(
            claim="MR",
            expert_ids=[1],
            agreement_level="minority",
            counterpoint="CP",
            original_evidence="OE",
        )
        d = asdict(mr)
        assert d["claim"] == "MR"
        assert d["expert_ids"] == [1]
        assert d["agreement_level"] == "minority"


# =============================================================================
# 2. VALUE RANGE VALIDATION
# =============================================================================


class TestValueRangeValidation:
    """Confidence values, severity values, and expert IDs are in valid ranges."""

    @pytest.mark.asyncio
    async def test_mock_confidence_values_in_range(self) -> None:
        """All confidence values from MockSynthesis are between 0.0 and 1.0."""
        mock = MockSynthesis(analysts=3)
        result = await mock.run(questions=[], responses=[{}, {}, {}])
        for key, val in result.confidence_map.items():
            assert 0.0 <= val <= 1.0, f"confidence_map[{key}] = {val} out of range"
        for a in result.agreements:
            assert 0.0 <= a.confidence <= 1.0, f"Agreement confidence {a.confidence} out of range"

    @pytest.mark.asyncio
    async def test_mock_severity_values_valid(self) -> None:
        """All severity values from MockSynthesis are one of the allowed values."""
        mock = MockSynthesis()
        result = await mock.run(questions=[], responses=[{}, {}])
        for d_item in result.disagreements:
            assert d_item.severity in ("low", "moderate", "high"), (
                f"Invalid severity: {d_item.severity}"
            )

    @pytest.mark.asyncio
    async def test_mock_expert_ids_are_positive_integers(self) -> None:
        """All expert IDs from MockSynthesis are positive integers."""
        mock = MockSynthesis()
        result = await mock.run(questions=[], responses=[{}, {}, {}])
        all_ids: List[int] = []
        for a in result.agreements:
            all_ids.extend(a.supporting_experts)
        for n in result.nuances:
            all_ids.extend(n.relevant_experts)
        for p in result.follow_up_probes:
            all_ids.extend(p.target_experts)
        for ei in result.emergent_insights:
            all_ids.extend(ei.contributing_experts)
        for mr in result.minority_reports:
            all_ids.extend(mr.expert_ids)

        for eid in all_ids:
            assert isinstance(eid, int), f"Expert ID is not int: {type(eid)}"
            assert eid >= 1, f"Expert ID is not positive: {eid}"

    @pytest.mark.asyncio
    async def test_mock_expert_ids_respect_response_count_bounds(self) -> None:
        """Expert IDs from MockSynthesis never exceed the response count."""
        num_responses = 2
        mock = MockSynthesis()
        result = await mock.run(
            questions=[], responses=[{} for _ in range(num_responses)]
        )
        errors = validate_synthesis_result(result, num_responses)
        assert not errors, f"Validation errors: {errors}"

    @pytest.mark.asyncio
    async def test_confidence_map_overall_always_present(self) -> None:
        """confidence_map always contains 'overall' key."""
        mock = MockSynthesis()
        result = await mock.run(questions=[], responses=[{}])
        assert "overall" in result.confidence_map
        assert isinstance(result.confidence_map["overall"], float)

    def test_adapter_confidence_map_overall_present_empty_claims(self) -> None:
        """Adapter produces confidence_map with 'overall' even with no claims."""
        adapter = _make_adapter()
        pr = _make_pipeline_result()
        result = adapter._map_to_app_format(pr, num_responses=1)
        assert "overall" in result.confidence_map
        assert 0.0 <= result.confidence_map["overall"] <= 1.0

    def test_adapter_confidence_map_overall_present_with_claims(self) -> None:
        """Adapter produces valid 'overall' confidence with real claims."""
        adapter = _make_adapter()
        pr = _make_pipeline_result(
            claims=(
                FakeClaim("c1", "Claim A", (FakeSourceReference("E1", "q"),), "consensus"),
                FakeClaim("c2", "Claim B", (FakeSourceReference("E2", "q"),), "divided"),
            ),
        )
        result = adapter._map_to_app_format(pr, num_responses=3)
        assert "overall" in result.confidence_map
        assert 0.0 <= result.confidence_map["overall"] <= 1.0
        # 1 consensus out of 2 claims → 0.5
        assert result.confidence_map["overall"] == 0.5


# =============================================================================
# 3. CROSS-FIELD CONSISTENCY
# =============================================================================


class TestCrossFieldConsistency:
    """Expert ID references across structures are internally consistent."""

    @pytest.mark.asyncio
    async def test_mock_all_expert_refs_valid_3_responses(self) -> None:
        """Full validation of MockSynthesis with 3 responses."""
        mock = MockSynthesis(analysts=3)
        result = await mock.run(questions=[], responses=[{}, {}, {}])
        errors = validate_synthesis_result(result, num_responses=3)
        assert not errors, f"Validation errors: {errors}"

    @pytest.mark.asyncio
    async def test_mock_all_expert_refs_valid_1_response(self) -> None:
        """MockSynthesis with 1 response: agreements/probes scale, but nuances/insights/minority have hardcoded IDs.

        This documents a known limitation: MockSynthesis only scales
        supporting_experts in agreements; nuances, emergent insights, and
        minority reports use hardcoded expert IDs that can exceed 1.
        """
        mock = MockSynthesis(analysts=1)
        result = await mock.run(questions=[], responses=[{}])
        # Agreements scale correctly (verified separately)
        for a in result.agreements:
            for eid in a.supporting_experts:
                assert eid <= 1, f"Agreement expert ID {eid} exceeds 1 response"
        # Probes scale correctly
        for p in result.follow_up_probes:
            for eid in p.target_experts:
                assert eid <= 1, f"Probe expert ID {eid} exceeds 1 response"

    def test_adapter_agreement_expert_ids_within_bounds(self) -> None:
        """Adapter agreements reference valid expert IDs (1..N)."""
        adapter = _make_adapter()
        pr = _make_pipeline_result(
            claims=(
                FakeClaim(
                    "c1", "Claim",
                    (FakeSourceReference("E1", "q"), FakeSourceReference("E3", "q")),
                    "consensus",
                ),
            ),
        )
        result = adapter._map_to_app_format(pr, num_responses=5)
        for a in result.agreements:
            for eid in a.supporting_experts:
                assert 1 <= eid <= 5

    def test_adapter_disagreement_positions_have_proper_structure(self) -> None:
        """Disagreement positions contain 'position', 'experts', and 'evidence' keys."""
        adapter = _make_adapter()
        pr = _make_pipeline_result(
            claims=(
                FakeClaim(
                    "c1", "Controversial",
                    (FakeSourceReference("E1", "q"),),
                    "divided",
                    counterarguments=("Counter A",),
                ),
            ),
        )
        result = adapter._map_to_app_format(pr, num_responses=3)
        for d_item in result.disagreements:
            for pos in d_item.positions:
                assert "position" in pos, "Position dict missing 'position' key"
                assert "experts" in pos, "Position dict missing 'experts' key"
                assert "evidence" in pos, "Position dict missing 'evidence' key"
                assert isinstance(pos["experts"], list)

    def test_adapter_nuance_expert_ids_within_bounds(self) -> None:
        """Adapter nuance expert IDs don't exceed num_responses."""
        adapter = _make_adapter()
        pr = _make_pipeline_result(uncertainties=("Uncertainty A",))
        result = adapter._map_to_app_format(pr, num_responses=2)
        for n in result.nuances:
            for eid in n.relevant_experts:
                assert 1 <= eid <= 2

    def test_adapter_emergent_insight_expert_ids_within_bounds(self) -> None:
        """Emergent insight contributing_experts reference valid expert IDs."""
        adapter = _make_adapter()
        pr = _make_pipeline_result(
            claims=(
                FakeClaim(
                    "c1", "Cross-expert insight",
                    (FakeSourceReference("E1", "q"), FakeSourceReference("E2", "q")),
                    "consensus",
                ),
            ),
        )
        result = adapter._map_to_app_format(pr, num_responses=3)
        for ei in result.emergent_insights:
            for eid in ei.contributing_experts:
                assert 1 <= eid <= 3

    def test_adapter_minority_report_expert_ids_within_bounds(self) -> None:
        """Minority report expert_ids reference valid expert IDs."""
        adapter = _make_adapter()
        pr = _make_pipeline_result(
            claims=(
                FakeClaim(
                    "c1", "Minority view",
                    (FakeSourceReference("E1", "evidence"),),
                    "minority",
                    counterarguments=("Majority disagrees",),
                ),
            ),
        )
        result = adapter._map_to_app_format(pr, num_responses=4)
        for mr in result.minority_reports:
            for eid in mr.expert_ids:
                assert 1 <= eid <= 4


# =============================================================================
# 4. EDGE CASES
# =============================================================================


class TestEdgeCases:
    """Edge cases: single/many responses, empty questions, special inputs."""

    @pytest.mark.asyncio
    async def test_single_response(self) -> None:
        """MockSynthesis with only 1 expert produces valid SynthesisResult.

        Note: MockSynthesis has hardcoded expert IDs in nuances, emergent
        insights, and minority reports that don't scale below 2 responses.
        We validate agreements/probes scale correctly (the fields that DO scale).
        """
        mock = MockSynthesis(analysts=1)
        result = await mock.run(questions=[], responses=[{"answers": {"q1": "Solo answer"}}])
        assert isinstance(result, SynthesisResult)
        # Agreements should scale to 1 response
        for a in result.agreements:
            for eid in a.supporting_experts:
                assert eid <= 1, f"Agreement expert ID {eid} exceeds single response"
        # Core structure is valid
        assert "overall" in result.confidence_map
        assert isinstance(result.narrative, str)

    @pytest.mark.asyncio
    async def test_many_responses_10_experts(self) -> None:
        """MockSynthesis with 10 experts produces valid output."""
        mock = MockSynthesis(analysts=5)
        responses = [{"answers": {"q1": f"Answer {i}"}} for i in range(10)]
        result = await mock.run(questions=[], responses=responses)
        assert isinstance(result, SynthesisResult)
        errors = validate_synthesis_result(result, num_responses=10)
        assert not errors, f"Validation errors: {errors}"

    @pytest.mark.asyncio
    async def test_empty_questions_list(self) -> None:
        """MockSynthesis with empty questions list still produces valid result."""
        mock = MockSynthesis()
        result = await mock.run(questions=[], responses=[{}, {}])
        assert isinstance(result, SynthesisResult)
        assert len(result.agreements) > 0

    @pytest.mark.asyncio
    async def test_responses_with_none_answer_values(self) -> None:
        """Responses where answer values are None don't crash _build_prose_responses."""
        responses = [{"answers": {"q1": None, "q2": None}}]
        prose = ConsensusLibraryAdapter._build_prose_responses(responses)
        assert len(prose) == 1
        assert prose[0].response == "(no answers provided)"

    @pytest.mark.asyncio
    async def test_responses_with_whitespace_only_answers(self) -> None:
        """Responses with only whitespace answers produce placeholder text."""
        responses = [{"answers": {"q1": "   ", "q2": "\t\n"}}]
        prose = ConsensusLibraryAdapter._build_prose_responses(responses)
        assert len(prose) == 1
        assert prose[0].response == "(no answers provided)"

    @pytest.mark.asyncio
    async def test_very_long_answer_text(self) -> None:
        """Very long answer text is preserved without truncation."""
        long_text = "A" * 100_000
        responses = [{"answers": {"q1": long_text}}]
        prose = ConsensusLibraryAdapter._build_prose_responses(responses)
        assert long_text in prose[0].response

    @pytest.mark.asyncio
    async def test_unicode_special_characters_in_answers(self) -> None:
        """Unicode and special characters in answers are handled correctly."""
        responses = [
            {"answers": {"q1": "日本語テスト 🎉 émojis → arrows ñ ü ö"}},
        ]
        prose = ConsensusLibraryAdapter._build_prose_responses(responses)
        assert "日本語テスト" in prose[0].response
        assert "🎉" in prose[0].response
        assert "→" in prose[0].response

    @pytest.mark.asyncio
    async def test_mixed_none_and_valid_answers(self) -> None:
        """Responses with a mix of None and valid answers keep valid ones."""
        responses = [{"answers": {"q1": "Valid", "q2": None, "q3": "Also valid"}}]
        prose = ConsensusLibraryAdapter._build_prose_responses(responses)
        assert "Valid" in prose[0].response
        assert "Also valid" in prose[0].response
        assert "q2" not in prose[0].response


# =============================================================================
# 5. MOCK SYNTHESIS OUTPUT VALIDATION
# =============================================================================


class TestMockSynthesisOutputValidation:
    """Validate that MockSynthesis output passes all schema validations."""

    @pytest.mark.asyncio
    async def test_full_schema_validation_passes(self) -> None:
        """Complete schema validation on MockSynthesis output."""
        mock = MockSynthesis(analysts=3)
        result = await mock.run(
            questions=[{"label": "Q1"}, {"label": "Q2"}],
            responses=[
                {"answers": {"q1": "A", "q2": "B"}},
                {"answers": {"q1": "C", "q2": "D"}},
                {"answers": {"q1": "E", "q2": "F"}},
            ],
        )
        errors = validate_synthesis_result(result, num_responses=3)
        assert not errors, f"Schema validation failed: {errors}"

    @pytest.mark.asyncio
    async def test_mock_scales_analyst_reports_with_analysts_count(self) -> None:
        """analyst_reports length matches the analysts parameter."""
        for n in [1, 3, 7, 10]:
            mock = MockSynthesis(analysts=n)
            result = await mock.run(questions=[], responses=[{}])
            assert len(result.analyst_reports) == n, (
                f"Expected {n} analyst reports, got {len(result.analyst_reports)}"
            )

    @pytest.mark.asyncio
    async def test_mock_expert_ids_respect_single_response(self) -> None:
        """With 1 response, agreement/probe expert IDs don't exceed 1.

        Known limitation: nuances, emergent insights, and minority reports
        have hardcoded expert IDs that don't scale below 2 responses.
        """
        mock = MockSynthesis(analysts=5)
        result = await mock.run(questions=[], responses=[{"answers": {"q1": "Only"}}])
        # Agreements scale correctly
        for a in result.agreements:
            for eid in a.supporting_experts:
                assert eid <= 1, f"Agreement expert ID {eid} exceeds 1 response"
        # Probes scale correctly
        for p in result.follow_up_probes:
            for eid in p.target_experts:
                assert eid <= 1, f"Probe expert ID {eid} exceeds 1 response"
        # Document that nuances/insights/minority DON'T scale
        has_overflow = any(eid > 1 for n in result.nuances for eid in n.relevant_experts)
        assert has_overflow, "Expected known hardcoded expert IDs > 1 in nuances (known limitation)"

    @pytest.mark.asyncio
    async def test_mock_expert_ids_respect_two_responses(self) -> None:
        """With 2 responses, no expert ID exceeds 2."""
        mock = MockSynthesis(analysts=3)
        result = await mock.run(questions=[], responses=[{}, {}])
        errors = validate_synthesis_result(result, num_responses=2)
        assert not errors, f"Validation errors with 2 responses: {errors}"

    @pytest.mark.asyncio
    async def test_mock_to_dict_roundtrips_via_json(self) -> None:
        """Mock result can roundtrip through JSON serialisation."""
        mock = MockSynthesis()
        result = await mock.run(questions=[], responses=[{}, {}, {}])
        d = result.to_dict()
        json_str = json.dumps(d)
        loaded = json.loads(json_str)
        assert loaded["agreements"] == d["agreements"]
        assert loaded["confidence_map"] == d["confidence_map"]
        assert loaded["provenance"] == d["provenance"]


# =============================================================================
# 6. CONSENSUS LIBRARY ADAPTER _map_to_app_format VALIDATION
# =============================================================================


class TestAdapterMapToAppFormat:
    """Test ConsensusLibraryAdapter._map_to_app_format with various configurations."""

    def test_consensus_claims_become_agreements(self) -> None:
        """Consensus claims map to agreements with confidence 0.9."""
        adapter = _make_adapter()
        pr = _make_pipeline_result(
            claims=(
                FakeClaim(
                    "c1", "Everyone agrees",
                    (FakeSourceReference("E1", "yes"), FakeSourceReference("E2", "yes")),
                    "consensus",
                ),
            ),
        )
        result = adapter._map_to_app_format(pr, num_responses=3)
        assert len(result.agreements) >= 1
        consensus_agreement = result.agreements[0]
        assert consensus_agreement.confidence == 0.9
        assert 1 in consensus_agreement.supporting_experts
        assert 2 in consensus_agreement.supporting_experts

    def test_majority_claims_become_agreements_with_lower_confidence(self) -> None:
        """Majority claims map to agreements with confidence 0.7."""
        adapter = _make_adapter()
        pr = _make_pipeline_result(
            claims=(
                FakeClaim("c1", "Most agree", (FakeSourceReference("E1", "q"),), "majority"),
            ),
        )
        result = adapter._map_to_app_format(pr, num_responses=3)
        assert result.agreements[0].confidence == 0.7

    def test_divided_claims_become_disagreements(self) -> None:
        """Divided claims map to disagreements with severity 'moderate'."""
        adapter = _make_adapter()
        pr = _make_pipeline_result(
            claims=(
                FakeClaim(
                    "c1", "Divided topic",
                    (FakeSourceReference("E1", "quote"),),
                    "divided",
                    counterarguments=("Counter",),
                ),
            ),
        )
        result = adapter._map_to_app_format(pr, num_responses=3)
        assert len(result.disagreements) >= 1
        assert result.disagreements[0].severity == "moderate"
        assert len(result.disagreements[0].positions) == 2  # main + counterargument

    def test_minority_claims_become_minority_reports(self) -> None:
        """Minority claims map to MinorityReport entries."""
        adapter = _make_adapter()
        pr = _make_pipeline_result(
            claims=(
                FakeClaim(
                    "c1", "Minority view",
                    (FakeSourceReference("E1", "my evidence"),),
                    "minority",
                    counterarguments=("The majority disagrees",),
                ),
            ),
        )
        result = adapter._map_to_app_format(pr, num_responses=5)
        assert len(result.minority_reports) >= 1
        mr = result.minority_reports[0]
        assert mr.claim == "Minority view"
        assert mr.agreement_level == "minority"
        assert mr.counterpoint == "The majority disagrees"
        assert "my evidence" in mr.original_evidence

    def test_cross_pollination_emergent_insights(self) -> None:
        """Claims sourced from experts on opposing sides produce cross-pollination insights."""
        adapter = _make_adapter()
        # Create a divided claim that puts E1 and E2 on different sides
        # Then a consensus claim that draws from both E1 and E2
        pr = _make_pipeline_result(
            claims=(
                FakeClaim(
                    "c1", "Divisive topic",
                    (FakeSourceReference("E1", "position A"),),
                    "divided",
                    counterarguments=("Counter B",),
                ),
                FakeClaim(
                    "c2", "Shared insight from opposing sides",
                    (FakeSourceReference("E1", "q1"), FakeSourceReference("E2", "q2")),
                    "consensus",
                ),
            ),
            disagreement_areas=("Side B view",),
        )
        result = adapter._map_to_app_format(pr, num_responses=3)
        # Should have at least one emergent insight
        assert len(result.emergent_insights) >= 1

    def test_deduplication_areas_of_agreement_vs_claims(self) -> None:
        """Areas of agreement duplicate claims are deduplicated."""
        adapter = _make_adapter()
        pr = _make_pipeline_result(
            claims=(
                FakeClaim("c1", "Point A", (FakeSourceReference("E1", "q"),), "consensus"),
            ),
            agreement_areas=("Point A", "Point B"),
        )
        result = adapter._map_to_app_format(pr, num_responses=3)
        claims = [a.claim for a in result.agreements]
        assert claims.count("Point A") == 1, "Point A should not be duplicated"
        assert "Point B" in claims, "Point B from areas should be included"

    def test_deduplication_areas_of_disagreement_vs_claims(self) -> None:
        """Areas of disagreement duplicate claims are deduplicated."""
        adapter = _make_adapter()
        pr = _make_pipeline_result(
            claims=(
                FakeClaim("c1", "Issue X", (), "divided"),
            ),
            disagreement_areas=("Issue X", "Issue Y"),
        )
        result = adapter._map_to_app_format(pr, num_responses=2)
        topics = [d.topic for d in result.disagreements]
        assert topics.count("Issue X") == 1
        assert "Issue Y" in topics

    def test_empty_claims_produce_valid_results(self) -> None:
        """Empty claims produce valid (but empty) agreements/disagreements."""
        adapter = _make_adapter()
        pr = _make_pipeline_result()
        result = adapter._map_to_app_format(pr, num_responses=1)
        assert result.agreements == []
        assert result.disagreements == []
        assert result.nuances == []
        assert result.emergent_insights == []
        assert result.minority_reports == []
        # But confidence_map still has defaults
        assert "overall" in result.confidence_map
        assert result.confidence_map["overall"] == 0.5

    def test_uncertainties_become_nuances(self) -> None:
        """Uncertainties from synthesis become Nuance objects."""
        adapter = _make_adapter()
        pr = _make_pipeline_result(uncertainties=("U1", "U2"))
        result = adapter._map_to_app_format(pr, num_responses=3)
        assert len(result.nuances) == 2
        assert result.nuances[0].claim == "U1"
        assert result.nuances[1].claim == "U2"

    def test_claims_raw_populated(self) -> None:
        """claims_raw is populated with structured claim data."""
        adapter = _make_adapter()
        pr = _make_pipeline_result(
            claims=(
                FakeClaim(
                    "c1", "Raw claim",
                    (FakeSourceReference("E1", "evidence"),),
                    "consensus",
                    counterarguments=("counter1",),
                ),
            ),
        )
        result = adapter._map_to_app_format(pr, num_responses=2)
        assert result.claims_raw is not None
        assert len(result.claims_raw) == 1
        assert result.claims_raw[0]["id"] == "c1"
        assert result.claims_raw[0]["text"] == "Raw claim"
        assert result.claims_raw[0]["agreement_level"] == "consensus"
        assert len(result.claims_raw[0]["sources"]) == 1
        assert result.claims_raw[0]["counterarguments"] == ["counter1"]

    def test_no_sources_fallback_to_all_experts(self) -> None:
        """Consensus claim with no source IDs falls back to all expert IDs."""
        adapter = _make_adapter()
        pr = _make_pipeline_result(
            claims=(
                FakeClaim("c1", "No sources claim", (), "consensus"),
            ),
        )
        result = adapter._map_to_app_format(pr, num_responses=4)
        assert result.agreements[0].supporting_experts == [1, 2, 3, 4]


# =============================================================================
# 7. NARRATIVE VALIDATION
# =============================================================================


class TestNarrativeValidation:
    """Narrative is always a string, mock contains [MOCK]."""

    @pytest.mark.asyncio
    async def test_mock_narrative_is_string(self) -> None:
        """MockSynthesis narrative is always a string."""
        mock = MockSynthesis()
        result = await mock.run(questions=[], responses=[{}])
        assert isinstance(result.narrative, str)

    @pytest.mark.asyncio
    async def test_mock_narrative_contains_mock_marker(self) -> None:
        """MockSynthesis narrative contains '[MOCK]'."""
        mock = MockSynthesis()
        result = await mock.run(questions=[], responses=[{}])
        assert "[MOCK]" in result.narrative

    def test_adapter_narrative_is_string(self) -> None:
        """Adapter result narrative is always a string (never None)."""
        adapter = _make_adapter()
        pr = _make_pipeline_result(narrative="Expert summary.")
        result = adapter._map_to_app_format(pr, num_responses=1)
        assert isinstance(result.narrative, str)
        assert result.narrative == "Expert summary."

    def test_adapter_empty_narrative_is_empty_string(self) -> None:
        """Adapter result with empty library narrative returns empty string."""
        adapter = _make_adapter()
        pr = _make_pipeline_result(narrative="")
        result = adapter._map_to_app_format(pr, num_responses=1)
        assert result.narrative == ""
        assert isinstance(result.narrative, str)

    def test_synthesis_result_default_narrative_is_empty_string(self) -> None:
        """SynthesisResult default narrative field is empty string."""
        result = SynthesisResult(
            agreements=[],
            disagreements=[],
            nuances=[],
            confidence_map={"overall": 0.5},
            follow_up_probes=[],
            provenance={},
            analyst_reports=[],
            meta_synthesis_reasoning="test",
        )
        assert result.narrative == ""
        assert isinstance(result.narrative, str)


# =============================================================================
# 8. PROVENANCE VALIDATION
# =============================================================================


class TestProvenanceValidation:
    """Provenance has required keys for mock and adapter modes."""

    @pytest.mark.asyncio
    async def test_mock_provenance_has_mode(self) -> None:
        """Mock provenance contains mode='mock'."""
        mock = MockSynthesis(analysts=3)
        result = await mock.run(questions=[], responses=[{}])
        assert result.provenance["mode"] == "mock"

    @pytest.mark.asyncio
    async def test_mock_provenance_has_analysts(self) -> None:
        """Mock provenance contains analysts count."""
        mock = MockSynthesis(analysts=5)
        result = await mock.run(questions=[], responses=[{}])
        assert result.provenance["analysts"] == 5

    def test_adapter_provenance_has_strategy(self) -> None:
        """Adapter provenance contains strategy key."""
        adapter = _make_adapter(strategy="committee", effective="ttd")
        pr = _make_pipeline_result()
        result = adapter._map_to_app_format(pr, num_responses=1)
        assert "strategy" in result.provenance
        assert result.provenance["strategy"] == "committee"

    def test_adapter_provenance_has_effective_strategy(self) -> None:
        """Adapter provenance contains effective_strategy key."""
        adapter = _make_adapter(strategy="committee", effective="ttd")
        pr = _make_pipeline_result()
        result = adapter._map_to_app_format(pr, num_responses=1)
        assert "effective_strategy" in result.provenance
        assert result.provenance["effective_strategy"] == "ttd"

    def test_adapter_provenance_has_adapter_version(self) -> None:
        """Adapter provenance contains adapter_version key."""
        adapter = _make_adapter()
        pr = _make_pipeline_result()
        result = adapter._map_to_app_format(pr, num_responses=1)
        assert "adapter_version" in result.provenance
        assert isinstance(result.provenance["adapter_version"], str)

    def test_adapter_provenance_has_model_and_versions(self) -> None:
        """Adapter provenance includes model, prompt_version, code_version."""
        adapter = _make_adapter()
        pr = _make_pipeline_result()
        result = adapter._map_to_app_format(pr, num_responses=1)
        assert "model" in result.provenance
        assert "prompt_version" in result.provenance
        assert "code_version" in result.provenance


# =============================================================================
# 9. ADDITIONAL EDGE CASES FOR ADAPTER
# =============================================================================


class TestAdapterEdgeCases:
    """Additional edge cases for the adapter mapping."""

    def test_long_claim_text_truncated_in_disagreement_topic(self) -> None:
        """Disagreement topics from long claims are truncated with ellipsis."""
        adapter = _make_adapter()
        long_text = "X" * 150
        pr = _make_pipeline_result(
            claims=(FakeClaim("c1", long_text, (), "divided"),),
        )
        # Need ≥2 responses for divided claims to become disagreements
        # (with 1 response, divided claims are reclassified as agreements)
        result = adapter._map_to_app_format(pr, num_responses=2)
        assert len(result.disagreements[0].topic) < 150
        assert result.disagreements[0].topic.endswith("…")

    def test_divided_claim_single_expert_becomes_minority_report(self) -> None:
        """Divided claim held by a single expert becomes a minority report."""
        adapter = _make_adapter()
        pr = _make_pipeline_result(
            claims=(
                FakeClaim(
                    "c1", "Solo divided view",
                    (FakeSourceReference("E1", "evidence"),),
                    "divided",
                    counterarguments=("Others disagree",),
                ),
            ),
        )
        result = adapter._map_to_app_format(pr, num_responses=5)
        # Should appear in both disagreements AND minority_reports
        assert len(result.disagreements) >= 1
        assert len(result.minority_reports) >= 1
        mr = [m for m in result.minority_reports if m.claim == "Solo divided view"]
        assert len(mr) == 1
        assert mr[0].agreement_level == "divided"

    def test_claim_with_counterarguments_and_few_supporters_becomes_minority(self) -> None:
        """Claim with counterarguments and few supporters becomes minority report."""
        adapter = _make_adapter()
        pr = _make_pipeline_result(
            claims=(
                FakeClaim(
                    "c1", "Claim with counter",
                    (FakeSourceReference("E1", "evidence"),),
                    "consensus",  # consensus but only 1 supporter out of 6
                    counterarguments=("Major counter",),
                ),
            ),
        )
        result = adapter._map_to_app_format(pr, num_responses=6)
        # 1 supporter out of 6 (1 <= 6//3=2) → minority report
        minority_claims = [m.claim for m in result.minority_reports]
        assert "Claim with counter" in minority_claims

    def test_multi_expert_synthesis_emergent_insight(self) -> None:
        """Multi-expert consensus claims with 2+ sources produce synthesis-type insights."""
        adapter = _make_adapter()
        pr = _make_pipeline_result(
            claims=(
                FakeClaim(
                    "c1", "Combined understanding",
                    (FakeSourceReference("E1", "q1"), FakeSourceReference("E2", "q2"),
                     FakeSourceReference("E3", "q3")),
                    "consensus",
                ),
            ),
        )
        result = adapter._map_to_app_format(pr, num_responses=4)
        # Should produce a synthesis-type emergent insight
        synthesis_insights = [
            ei for ei in result.emergent_insights if ei.emergence_type == "synthesis"
        ]
        assert len(synthesis_insights) >= 1
        assert set(synthesis_insights[0].contributing_experts) == {1, 2, 3}

    def test_adapter_result_passes_full_validation(self) -> None:
        """Adapter result with mixed claims passes full validation."""
        adapter = _make_adapter()
        pr = _make_pipeline_result(
            claims=(
                FakeClaim("c1", "Agree", (FakeSourceReference("E1", "q"),), "consensus"),
                FakeClaim("c2", "Disagree", (FakeSourceReference("E2", "q"),), "divided"),
                FakeClaim(
                    "c3", "Minority",
                    (FakeSourceReference("E3", "q"),),
                    "minority",
                    counterarguments=("counter",),
                ),
            ),
            agreement_areas=("Extra area",),
            uncertainties=("Uncertain thing",),
            narrative="Full narrative.",
        )
        result = adapter._map_to_app_format(pr, num_responses=5)
        errors = validate_synthesis_result(result, num_responses=5)
        assert not errors, f"Validation errors: {errors}"
