"""
Synthesis adapter for Axiotic consensus library.

Provides a unified, type-safe async interface to the consensus library's
synthesis strategies with proper error handling, timeout protection, and
progress callbacks for WebSocket streaming.

Strategies:
  - simple:    SinglePromptStrategy (fast, one-shot)
  - ttd:       DiffusionStrategy (iterative refinement with fitness evaluation)
  - committee: CommitteeStrategy (multi-agent; falls back to TTD with warning)
  - mock:      MockSynthesis (no API calls, for UX testing)

The adapter maps between the app's data structures and the library's domain
models, using a lightweight ProseResponse bridge type that satisfies the
library's duck-typed contract without depending on the frozen ExpertResponse
domain model (which expects structured claims/evidence tuples).

Byzantine-integrated from two independent implementations.
"""
from __future__ import annotations

import asyncio
import logging
import os
from dataclasses import asdict, dataclass, field
from enum import Enum
from pathlib import Path
from typing import (
    Any,
    Callable,
    Coroutine,
    Dict,
    List,
    Optional,
    Protocol,
    Sequence,
    Union,
    runtime_checkable,
)

logger = logging.getLogger(__name__)


# =============================================================================
# CUSTOM EXCEPTIONS
# =============================================================================


class SynthesisError(Exception):
    """Base exception for all synthesis adapter errors."""


class SynthesisConfigError(SynthesisError):
    """Raised for invalid configuration (missing keys, bad mode, etc.)."""


class SynthesisLibraryError(SynthesisError):
    """Raised when the consensus library itself errors during a run."""


class SynthesisTimeoutError(SynthesisError):
    """Raised when synthesis exceeds the configured timeout."""


class SynthesisResponseError(SynthesisError):
    """Raised when app responses cannot be mapped to library domain models."""


# =============================================================================
# APP-LEVEL DATA STRUCTURES
# =============================================================================


class FlowMode(str, Enum):
    """Delphi flow mode — determines whether AI-generated follow-ups are included."""

    HUMAN_ONLY = "human_only"
    AI_ASSISTED = "ai_assisted"


@dataclass
class EmergentInsight:
    """An insight that emerged from combining multiple expert perspectives."""

    insight: str
    contributing_experts: List[int]  # Experts whose inputs combined
    emergence_type: str  # "cross-pollination" | "synthesis" | "implicit"
    explanation: str  # Why this is emergent (what gap it fills)


@dataclass
class Agreement:
    """A point of consensus among experts."""

    claim: str
    supporting_experts: List[int]
    confidence: float
    evidence_summary: str


@dataclass
class Disagreement:
    """A point of divergence among experts."""

    topic: str
    positions: List[Dict[str, Any]]
    severity: str  # "low" | "moderate" | "high"


@dataclass
class Nuance:
    """A contextual qualification or uncertainty around a claim."""

    claim: str
    context: str
    relevant_experts: List[int]


@dataclass
class Probe:
    """A follow-up question generated to resolve ambiguity."""

    question: str
    target_experts: List[int]
    rationale: str


@dataclass
class SynthesisResult:
    """
    The unified result object returned by all synthesis strategies.

    Fields are compatible with the route handler's serialisation and
    WebSocket broadcasting logic in routes.py.
    """

    agreements: List[Agreement]
    disagreements: List[Disagreement]
    nuances: List[Nuance]
    confidence_map: Dict[str, float]
    follow_up_probes: List[Probe]
    provenance: Dict[str, Any]
    analyst_reports: List[Dict[str, Any]]
    meta_synthesis_reasoning: str

    # Extended fields populated when using library strategies
    narrative: str = ""
    claims_raw: Optional[List[Dict[str, Any]]] = None
    areas_of_agreement: Optional[List[str]] = None
    areas_of_disagreement: Optional[List[str]] = None
    uncertainties: Optional[List[str]] = None
    emergent_insights: List[EmergentInsight] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        """Convert to JSON-serialisable dict, handling nested dataclasses."""
        return asdict(self)


# =============================================================================
# PROGRESS CALLBACK TYPE
# =============================================================================

ProgressCallback = Optional[
    Callable[[str, int, int], Coroutine[Any, Any, None]]
]


# =============================================================================
# SYNTHESISER PROTOCOL (for duck-typing against routes.py)
# =============================================================================


@runtime_checkable
class Synthesiser(Protocol):
    """Protocol that all synthesiser implementations must satisfy."""

    async def run(
        self,
        questions: List[Dict[str, Any]],
        responses: List[Dict[str, Any]],
        model: Optional[str] = None,
        mode: FlowMode = FlowMode.HUMAN_ONLY,
        progress_callback: ProgressCallback = None,
    ) -> SynthesisResult: ...


# =============================================================================
# BRIDGE TYPE: ProseResponse
# =============================================================================


@dataclass(frozen=True)
class ProseResponse:
    """
    Lightweight bridge between the app's dict-based responses and the
    consensus library's duck-typed response expectations.

    The library checks ``hasattr(response, "response")`` and
    ``hasattr(response, "expert_id")`` to detect prose-mode input.
    This class satisfies that contract without depending on the frozen
    ``ExpertResponse`` domain model which expects structured claims/evidence.
    """

    expert_id: str
    response: str  # full text of the expert's answers


# =============================================================================
# SYNTHESIS CONTEXT (satisfies library's SynthesisContext protocol)
# =============================================================================


@dataclass(frozen=True)
class AdapterSynthesisContext:
    """
    Satisfies the ``SynthesisContext`` protocol expected by the library's
    strategy ``run()`` methods.  All attributes are explicitly typed.
    """

    study_id: str
    round_id: str
    question_id: str
    question_text: str
    code_version: str
    force_restart: bool = False


# =============================================================================
# MOCK SYNTHESIS
# =============================================================================


class MockSynthesis:
    """Returns pre-baked synthesis results for UX testing without API costs."""

    def __init__(self, analysts: int = 3, model: str = "mock") -> None:
        self.analysts = analysts
        self.model = model

    async def run(
        self,
        questions: List[Dict[str, Any]],
        responses: List[Dict[str, Any]],
        model: Optional[str] = None,
        mode: FlowMode = FlowMode.HUMAN_ONLY,
        progress_callback: ProgressCallback = None,
    ) -> SynthesisResult:
        num_responses = len(responses)

        if progress_callback:
            await progress_callback("mock_init", 1, 2)

        agreements = [
            Agreement(
                claim="Participants agree on the importance of structured communication",
                supporting_experts=list(range(1, min(num_responses + 1, 4))),
                confidence=0.85,
                evidence_summary="Multiple responses emphasised clear documentation",
            ),
            Agreement(
                claim="There is consensus on prioritising user experience",
                supporting_experts=list(range(1, min(num_responses + 1, 3))),
                confidence=0.92,
                evidence_summary="Responses consistently mentioned UX as key",
            ),
        ]

        disagreements = [
            Disagreement(
                topic="Implementation timeline",
                positions=[
                    {
                        "position": "Aggressive 3-month rollout",
                        "experts": [1],
                        "evidence": "Market timing critical",
                    },
                    {
                        "position": "Cautious 6-month approach",
                        "experts": [2, 3] if num_responses > 2 else [2],
                        "evidence": "Quality over speed",
                    },
                ],
                severity="moderate",
            ),
        ]

        nuances = [
            Nuance(
                claim="Resource allocation depends on Q2 budget approval",
                context="Several experts conditioned their recommendations on pending decisions",
                relevant_experts=[1, 2],
            ),
        ]

        probes = [
            Probe(
                question="Can you elaborate on the specific risks of the aggressive timeline?",
                target_experts=[1],
                rationale="Clarify trade-offs between speed and quality",
            ),
        ]

        emergent_insights = [
            EmergentInsight(
                insight="The tension between aggressive timeline and quality standards suggests a phased rollout approach that neither expert proposed independently",
                contributing_experts=[1, 2],
                emergence_type="cross-pollination",
                explanation="Expert 1 pushed for speed, Expert 2 for quality — combining both reveals a middle path neither articulated",
            ),
            EmergentInsight(
                insight="Documentation standards and UX priorities are more deeply connected than any single response suggested",
                contributing_experts=[1, 2, 3] if num_responses > 2 else [1, 2],
                emergence_type="synthesis",
                explanation="Multiple experts mentioned both topics separately, but the synthesis reveals they're aspects of the same underlying concern",
            ),
        ]

        if progress_callback:
            await progress_callback("mock_complete", 2, 2)

        return SynthesisResult(
            agreements=agreements,
            disagreements=disagreements,
            nuances=nuances,
            confidence_map={
                "overall": 0.78,
                "methodology": 0.85,
                "conclusions": 0.72,
            },
            follow_up_probes=probes,
            provenance={"mode": "mock", "analysts": self.analysts},
            analyst_reports=[
                {
                    "index": i,
                    "payload": {
                        "mode": "mock",
                        "summary": f"Mock analyst {i + 1} report",
                    },
                }
                for i in range(self.analysts)
            ],
            meta_synthesis_reasoning="[MOCK MODE] Simulated synthesis data for UX testing.",
            narrative="[MOCK] Placeholder narrative for testing purposes.",
            emergent_insights=emergent_insights,
        )


# =============================================================================
# LIBRARY ADAPTER
# =============================================================================


class ConsensusLibraryAdapter:
    """
    Adapts the Axiotic consensus library to the app's interface.

    Key features:
      1. Uses ``ProseResponse`` bridge type instead of the domain ``ExpertResponse``
         which expects structured claims/evidence tuples.
      2. Uses the correct ``TTDConfig`` field name (``n_initial_drafts``).
      3. Properly implements committee fallback with logging.
      4. Wraps library calls in try/except with typed exceptions.
      5. Supports progress callbacks for WebSocket updates.
      6. Configurable timeout to prevent runaway synthesis.
      7. Empty response guard for early error reporting.
    """

    SUPPORTED_STRATEGIES = ("simple", "ttd", "committee")

    def __init__(
        self,
        strategy: str = "simple",
        model: str = "anthropic/claude-sonnet-4",
        n_drafts: int = 3,
        n_denoise_steps: int = 2,
        timeout_seconds: float = 600.0,
    ) -> None:
        """
        Args:
            strategy: "simple", "ttd", or "committee" (committee → TTD fallback).
            model: OpenRouter model identifier.
            n_drafts: Number of parallel drafts for TTD.
            n_denoise_steps: Number of denoising iterations for TTD.
            timeout_seconds: Maximum wall-clock time for a single synthesis run.
        """
        if strategy not in self.SUPPORTED_STRATEGIES:
            raise SynthesisConfigError(
                f"Unknown strategy '{strategy}'. "
                f"Must be one of {self.SUPPORTED_STRATEGIES}."
            )

        # If committee requested, log and degrade to TTD
        if strategy == "committee":
            logger.warning(
                "CommitteeStrategy is not yet implemented in the consensus library. "
                "Falling back to TTD (DiffusionStrategy)."
            )
            self._effective_strategy = "ttd"
        else:
            self._effective_strategy = strategy

        self.strategy_name = strategy  # preserve original for provenance
        self.model = model
        self.n_drafts = n_drafts
        self.n_denoise_steps = n_denoise_steps
        self.timeout_seconds = timeout_seconds

        # Lazily initialised
        self._strategy_instance: Any = None
        self._llm_client: Any = None

    # ------------------------------------------------------------------ init

    def _lazy_init(self) -> None:
        """Lazy-initialise the library strategy (import + construct)."""
        if self._strategy_instance is not None:
            return

        try:
            from consensus.config import LLMConfig
            from consensus.llm.openrouter import OpenRouterClient
            from consensus.summarise.strategies import (
                SinglePromptStrategy,
                DiffusionStrategy,
            )
            from consensus.diffusion.runner import TTDConfig
        except ImportError as exc:
            raise SynthesisConfigError(
                f"Failed to import consensus library. Is it installed? {exc}"
            ) from exc

        api_key = os.getenv("OPENROUTER_API_KEY")
        if not api_key:
            raise SynthesisConfigError(
                "OPENROUTER_API_KEY environment variable is required for "
                f"'{self._effective_strategy}' strategy."
            )

        config = LLMConfig(
            openrouter_api_key=api_key,
            model=self.model,
        )
        self._llm_client = OpenRouterClient(config)

        prompts_dir = self._resolve_prompts_dir()

        if self._effective_strategy == "simple":
            self._strategy_instance = SinglePromptStrategy(
                llm_client=self._llm_client,
                prompts_dir=prompts_dir,
            )
        elif self._effective_strategy == "ttd":
            ttd_config = TTDConfig(
                n_initial_drafts=self.n_drafts,
                n_denoise_steps=self.n_denoise_steps,
            )
            artefacts_dir = (
                Path(__file__).resolve().parent.parent / "artefacts"
            )
            artefacts_dir.mkdir(parents=True, exist_ok=True)

            self._strategy_instance = DiffusionStrategy(
                llm_client=self._llm_client,
                prompts_dir=prompts_dir,
                ttd_config=ttd_config,
                artefacts_dir=artefacts_dir,
            )

        logger.info(
            "Initialised %s strategy (model=%s, drafts=%d)",
            self._effective_strategy,
            self.model,
            self.n_drafts,
        )

    @staticmethod
    def _resolve_prompts_dir() -> Path:
        """Locate the consensus library's prompts directory."""
        candidates: list[Path] = []

        # 0. Environment override (highest priority)
        env_prompts = os.getenv("CONSENSUS_PROMPTS_DIR")
        if env_prompts:
            candidates.append(Path(env_prompts))

        try:
            import consensus

            package_dir = Path(consensus.__file__).resolve().parent
            # 1. Sibling to the package's src directory
            candidates.append(package_dir.parent / "prompts")
        except (ImportError, AttributeError) as exc:
            raise SynthesisConfigError(
                f"Cannot locate consensus package directory: {exc}"
            ) from exc

        # 2. Fallback: adjacent symphonia repo (dev-mode install)
        candidates.append(
            Path(__file__).resolve().parent.parent.parent.parent
            / "symphonia"
            / "prompts"
        )

        for p in candidates:
            if p.is_dir():
                logger.debug("Resolved prompts_dir → %s", p)
                return p

        searched = ", ".join(str(c) for c in candidates)
        raise SynthesisConfigError(
            f"Could not find prompts directory. Searched: {searched}"
        )

    # --------------------------------------------------------- response prep

    @staticmethod
    def _build_prose_responses(
        responses: List[Dict[str, Any]],
    ) -> List[ProseResponse]:
        """
        Convert app-layer response dicts into ``ProseResponse`` objects
        that satisfy the library's duck-typed contract.

        Raises:
            SynthesisResponseError: If a response dict cannot be converted.
        """
        result: List[ProseResponse] = []
        for idx, resp in enumerate(responses):
            expert_id = f"E{idx + 1}"
            try:
                if isinstance(resp, dict):
                    answers = resp.get("answers", resp)
                    if isinstance(answers, dict):
                        lines: List[str] = [
                            f"Q: {key}\nA: {val}"
                            for key, val in answers.items()
                            if val is not None and str(val).strip()
                        ]
                        text = (
                            "\n\n".join(lines) if lines else "(no answers provided)"
                        )
                    elif isinstance(answers, str):
                        text = answers
                    else:
                        text = str(answers)
                else:
                    text = str(resp)

                result.append(ProseResponse(expert_id=expert_id, response=text))
            except Exception as exc:
                raise SynthesisResponseError(
                    f"Could not convert response at index {idx}: {exc}"
                ) from exc

        return result

    @staticmethod
    def _build_question_text(questions: List[Dict[str, Any]]) -> str:
        """Flatten question dicts into a numbered prompt string."""
        parts: List[str] = []
        for i, q in enumerate(questions, 1):
            if isinstance(q, dict):
                text = (
                    q.get("label") or q.get("text") or q.get("id") or str(q)
                )
            else:
                text = str(q)
            parts.append(f"{i}. {text}")
        return "\n".join(parts)

    # ----------------------------------------------------------- main entry

    async def run(
        self,
        questions: List[Dict[str, Any]],
        responses: List[Dict[str, Any]],
        model: Optional[str] = None,
        mode: FlowMode = FlowMode.HUMAN_ONLY,
        progress_callback: ProgressCallback = None,
    ) -> SynthesisResult:
        """
        Run synthesis using the consensus library.

        Raises:
            SynthesisResponseError: If responses are empty or cannot be mapped.
            SynthesisConfigError: Bad configuration (missing key, no prompts, etc.)
            SynthesisLibraryError: The library itself raised during synthesis.
            SynthesisTimeoutError: Synthesis exceeded ``timeout_seconds``.
        """
        if not responses:
            raise SynthesisResponseError("Cannot synthesise zero responses")

        # Initialise on first call
        try:
            self._lazy_init()
        except SynthesisError:
            raise  # Already wrapped
        except Exception as exc:
            raise SynthesisConfigError(
                f"Adapter initialisation failed: {exc}"
            ) from exc

        if progress_callback:
            await progress_callback("preparing", 1, 4)

        prose_responses = self._build_prose_responses(responses)
        question_text = self._build_question_text(questions)

        context = AdapterSynthesisContext(
            study_id="runtime",
            round_id="1",
            question_id="q1",
            question_text=question_text,
            code_version="adapter-v2",
        )

        if progress_callback:
            await progress_callback("synthesising", 2, 4)

        # Run library strategy with timeout guard
        try:
            library_result = await asyncio.wait_for(
                self._strategy_instance.run(
                    context=context,
                    responses=prose_responses,
                ),
                timeout=self.timeout_seconds,
            )
        except asyncio.TimeoutError:
            raise SynthesisTimeoutError(
                f"Synthesis timed out after {self.timeout_seconds}s "
                f"(strategy={self._effective_strategy})"
            )
        except NotImplementedError as exc:
            raise SynthesisLibraryError(
                f"Strategy '{self._effective_strategy}' raised "
                f"NotImplementedError: {exc}"
            ) from exc
        except Exception as exc:
            logger.exception("Consensus library error during synthesis")
            raise SynthesisLibraryError(
                f"Consensus library error: {type(exc).__name__}: {exc}"
            ) from exc

        if progress_callback:
            await progress_callback("mapping_results", 3, 4)

        # Map to app format
        try:
            result = self._map_to_app_format(library_result, len(responses))
        except Exception as exc:
            raise SynthesisLibraryError(
                f"Failed to map library result to app format: {exc}"
            ) from exc

        if progress_callback:
            await progress_callback("complete", 4, 4)

        return result

    # --------------------------------------------------------- result mapping

    def _map_to_app_format(
        self, result: Any, num_responses: int
    ) -> SynthesisResult:
        """
        Map a library ``PipelineResult`` to the app's ``SynthesisResult``.

        Handles the frozen-tuple domain models from the library and converts
        them to mutable app-layer dataclasses.
        """
        synthesis = result.synthesis

        agreements: List[Agreement] = []
        disagreements: List[Disagreement] = []

        # --- Claims → Agreements / Disagreements ---
        for claim in synthesis.claims:
            source_ids = _extract_expert_ids(claim.sources)

            if claim.agreement_level in ("consensus", "majority"):
                confidence = (
                    0.9 if claim.agreement_level == "consensus" else 0.7
                )
                evidence = "; ".join(
                    s.quote for s in claim.sources if s.quote
                )
                agreements.append(
                    Agreement(
                        claim=claim.text,
                        supporting_experts=source_ids
                        or list(range(1, num_responses + 1)),
                        confidence=confidence,
                        evidence_summary=evidence
                        or "Synthesised from expert responses",
                    )
                )
            else:
                # "divided" or "minority" → disagreement
                positions: List[Dict[str, Any]] = [
                    {
                        "position": claim.text,
                        "experts": source_ids,
                        "evidence": "; ".join(
                            s.quote for s in claim.sources if s.quote
                        )
                        or "From synthesis",
                    }
                ]
                for ca in claim.counterarguments:
                    positions.append(
                        {
                            "position": ca,
                            "experts": [],
                            "evidence": "Counterargument identified in synthesis",
                        }
                    )
                topic = (
                    claim.text[:80] + "…"
                    if len(claim.text) > 80
                    else claim.text
                )
                disagreements.append(
                    Disagreement(
                        topic=topic,
                        positions=positions,
                        severity="moderate",
                    )
                )

        # --- Areas of agreement (deduplicated) ---
        existing_agreement_claims = {a.claim for a in agreements}
        for area in synthesis.areas_of_agreement:
            if area not in existing_agreement_claims:
                agreements.append(
                    Agreement(
                        claim=area,
                        supporting_experts=list(range(1, num_responses + 1)),
                        confidence=0.8,
                        evidence_summary="Identified as area of agreement",
                    )
                )

        # --- Areas of disagreement (deduplicated) ---
        existing_disagreement_topics = {d.topic for d in disagreements}
        for area in synthesis.areas_of_disagreement:
            if area not in existing_disagreement_topics:
                disagreements.append(
                    Disagreement(
                        topic=area,
                        positions=[
                            {
                                "position": area,
                                "experts": [],
                                "evidence": "Identified as area of disagreement",
                            }
                        ],
                        severity="moderate",
                    )
                )

        # --- Uncertainties → Nuances ---
        nuances: List[Nuance] = [
            Nuance(
                claim=u,
                context="Identified as an explicit uncertainty",
                relevant_experts=list(range(1, min(3, num_responses + 1))),
            )
            for u in synthesis.uncertainties
        ]

        # --- Confidence map (computed from claims) ---
        num_claims = len(synthesis.claims)
        if num_claims > 0:
            consensus_ratio = (
                sum(
                    1
                    for c in synthesis.claims
                    if c.agreement_level in ("consensus", "majority")
                )
                / num_claims
            )
        else:
            consensus_ratio = 0.5

        n_agree = len(agreements)
        n_disagree = len(disagreements)
        total = n_agree + n_disagree

        confidence_map: Dict[str, float] = {
            "overall": round(consensus_ratio, 3),
            "agreement_ratio": round(n_agree / total, 3) if total else 0.5,
            "n_claims": float(num_claims),
            "n_agreements": float(n_agree),
            "n_disagreements": float(n_disagree),
        }

        # --- Emergent insights ---
        # Collect expert ids that appear on opposite sides of disagreements
        disagreement_experts: Dict[int, set] = {}  # expert_id → set of disagreement indices
        for d_idx, d in enumerate(disagreements):
            for pos in d.positions:
                for eid in pos.get("experts", []):
                    if isinstance(eid, int):
                        disagreement_experts.setdefault(eid, set()).add(d_idx)

        emergent_insights: List[EmergentInsight] = []
        for claim in synthesis.claims:
            source_ids = _extract_expert_ids(claim.sources)
            if len(source_ids) < 2:
                continue

            # Check if contributing experts appear on different sides of any disagreement
            involved_disagreements: set = set()
            for eid in source_ids:
                involved_disagreements.update(disagreement_experts.get(eid, set()))

            is_cross_pollination = False
            for d_idx in involved_disagreements:
                if d_idx < len(disagreements):
                    d = disagreements[d_idx]
                    sides_with_experts = [
                        set(pos.get("experts", []))
                        for pos in d.positions
                    ]
                    source_set = set(source_ids)
                    sides_hit = sum(
                        1 for side in sides_with_experts
                        if side & source_set
                    )
                    if sides_hit >= 2:
                        is_cross_pollination = True
                        break

            if is_cross_pollination:
                emergent_insights.append(
                    EmergentInsight(
                        insight=claim.text,
                        contributing_experts=source_ids,
                        emergence_type="cross-pollination",
                        explanation=(
                            f"This insight draws from experts on opposing sides of a disagreement, "
                            f"suggesting a perspective that transcends individual positions"
                        ),
                    )
                )
            elif claim.agreement_level in ("consensus", "majority") and len(source_ids) >= 2:
                # Multi-expert agreement that synthesises across sources
                emergent_insights.append(
                    EmergentInsight(
                        insight=claim.text,
                        contributing_experts=source_ids,
                        emergence_type="synthesis",
                        explanation=(
                            f"Combined from {len(source_ids)} expert perspectives into a unified claim"
                        ),
                    )
                )

        return SynthesisResult(
            agreements=agreements,
            disagreements=disagreements,
            nuances=nuances,
            confidence_map=confidence_map,
            follow_up_probes=[],  # Library doesn't produce probes directly
            provenance={
                "strategy": self.strategy_name,
                "effective_strategy": self._effective_strategy,
                "model": synthesis.model,
                "prompt_version": synthesis.prompt_version,
                "code_version": synthesis.code_version,
                "adapter_version": "v2-integrated",
            },
            analyst_reports=[],
            meta_synthesis_reasoning=(
                f"Generated via {self._effective_strategy} strategy "
                f"(requested: {self.strategy_name})"
            ),
            narrative=synthesis.narrative,
            claims_raw=[
                {
                    "id": c.claim_id,
                    "text": c.text,
                    "agreement_level": c.agreement_level,
                    "sources": [
                        {"id": s.source_id, "quote": s.quote}
                        for s in c.sources
                    ],
                    "counterarguments": list(c.counterarguments),
                }
                for c in synthesis.claims
            ],
            areas_of_agreement=list(synthesis.areas_of_agreement),
            areas_of_disagreement=list(synthesis.areas_of_disagreement),
            uncertainties=list(synthesis.uncertainties),
            emergent_insights=emergent_insights,
        )


# =============================================================================
# HELPERS
# =============================================================================


def _extract_expert_ids(sources: Sequence[Any]) -> List[int]:
    """
    Extract integer expert indices from source references.

    Handles source_id format "E1", "E2", etc. and gracefully
    skips unparseable IDs.
    """
    ids: List[int] = []
    for s in sources:
        sid: str = getattr(s, "source_id", "")
        if isinstance(sid, str) and sid.startswith("E") and sid[1:].isdigit():
            ids.append(int(sid[1:]))
    return ids


# =============================================================================
# FACTORY FUNCTION
# =============================================================================


def get_synthesiser(
    api_key: Optional[str] = None,
    n_analysts: int = 3,
    mode: Optional[str] = None,
    strategy: Optional[str] = None,
    model: str = "anthropic/claude-sonnet-4",
    timeout_seconds: float = 600.0,
    **kwargs: Any,
) -> Union[MockSynthesis, ConsensusLibraryAdapter]:
    """
    Factory function to get the appropriate synthesiser.

    Args:
        api_key: OpenRouter API key (also reads ``OPENROUTER_API_KEY`` env var).
        n_analysts: Number of analysts/drafts.
        mode: Synthesis mode — "mock", "simple", "ttd", "committee".
              Also reads ``SYNTHESIS_MODE`` env var as fallback.
        strategy: Alias for ``mode`` (backwards compat).
        model: OpenRouter model identifier.
        timeout_seconds: Maximum wall-clock time per synthesis run.
        **kwargs: Additional keyword args forwarded to ConsensusLibraryAdapter.

    Returns:
        A synthesiser instance satisfying the ``Synthesiser`` protocol.

    Raises:
        SynthesisConfigError: If the mode is unrecognised.

    Modes:
        mock:      No API calls — fake results for UX testing.
        simple:    SinglePromptStrategy — fast one-shot synthesis.
        ttd:       DiffusionStrategy — iterative refinement (recommended).
        committee: Logs warning and falls back to TTD (not yet implemented
                   in the consensus library).
    """
    effective_mode = (
        mode
        or strategy
        or os.getenv("SYNTHESIS_MODE", "simple").strip().lower()
    )

    if effective_mode == "mock":
        logger.info("🎭 Using MOCK synthesis mode (no API calls)")
        return MockSynthesis(analysts=n_analysts, model="mock")

    if effective_mode in ("simple", "ttd", "committee"):
        logger.info(
            "🔬 Using %s synthesis strategy (model=%s)",
            effective_mode.upper(),
            model,
        )
        # Ensure the API key is available in the environment for lazy init
        if api_key and not os.getenv("OPENROUTER_API_KEY"):
            os.environ["OPENROUTER_API_KEY"] = api_key
        return ConsensusLibraryAdapter(
            strategy=effective_mode,
            model=model,
            n_drafts=n_analysts,
            timeout_seconds=timeout_seconds,
            **kwargs,
        )

    raise SynthesisConfigError(
        f"Unknown synthesis mode: '{effective_mode}'. "
        f"Valid modes: mock, simple, ttd, committee."
    )


# =============================================================================
# BACKWARDS COMPATIBILITY
# =============================================================================

CommitteeSynthesiser = ConsensusLibraryAdapter
OpenRouterSynthesis = ConsensusLibraryAdapter
