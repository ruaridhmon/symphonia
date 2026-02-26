"""
Synthesis adapter for axiotic-ai/consensus library (Worker B implementation).

Provides a unified async interface to the consensus library's synthesis strategies:
- simple: SinglePromptStrategy (fast, one-shot LLM synthesis)
- ttd: DiffusionStrategy (iterative Test-Time Diffusion with fitness evaluation)
- committee: CommitteeStrategy (not yet in library — falls back to TTD with warning)
- mock: MockSynthesis (zero API calls, deterministic fixtures for UX testing)

The adapter handles:
- Converting app-level dicts ↔ library domain models
- Lazy initialisation of LLM clients / heavy imports
- Structured error propagation with SynthesisError hierarchy
- Async/await correctness throughout
- Progress callbacks for WebSocket streaming

SPDX-License-Identifier: CC-BY-4.0 (consensus library)
"""

from __future__ import annotations

import asyncio
import logging
import os
from dataclasses import asdict, dataclass, field
from enum import Enum
from pathlib import Path
from typing import Any, Callable, Coroutine, Dict, List, Optional, Sequence

logger = logging.getLogger(__name__)


# =============================================================================
# ERRORS
# =============================================================================


class SynthesisError(Exception):
    """Base error for all synthesis-adapter failures."""


class ConfigurationError(SynthesisError):
    """Raised when adapter configuration is invalid (missing key, bad strategy, etc.)."""


class LibraryError(SynthesisError):
    """Wraps exceptions originating inside the consensus library."""

    def __init__(self, message: str, cause: Exception | None = None) -> None:
        super().__init__(message)
        self.__cause__ = cause


class ResponseMappingError(SynthesisError):
    """Raised when app responses cannot be mapped to library domain models."""


# =============================================================================
# APP-LEVEL DATA STRUCTURES
# =============================================================================


class FlowMode(str, Enum):
    HUMAN_ONLY = "human_only"
    AI_ASSISTED = "ai_assisted"


@dataclass
class Agreement:
    claim: str
    supporting_experts: List[int]
    confidence: float
    evidence_summary: str


@dataclass
class Disagreement:
    topic: str
    positions: List[Dict[str, Any]]
    severity: str  # "low" | "moderate" | "high"


@dataclass
class Nuance:
    claim: str
    context: str
    relevant_experts: List[int]


@dataclass
class Probe:
    question: str
    target_experts: List[int]
    rationale: str


@dataclass
class SynthesisResult:
    """Unified result returned by every synthesiser variant."""

    agreements: List[Agreement]
    disagreements: List[Disagreement]
    nuances: List[Nuance]
    confidence_map: Dict[str, float]
    follow_up_probes: List[Probe]
    provenance: Dict[str, Any]
    analyst_reports: List[Dict[str, Any]]
    meta_synthesis_reasoning: str

    # Extended fields populated by library strategies
    narrative: str = ""
    claims_raw: Optional[List[Dict[str, Any]]] = None
    areas_of_agreement: Optional[List[str]] = None
    areas_of_disagreement: Optional[List[str]] = None
    uncertainties: Optional[List[str]] = None

    def to_dict(self) -> Dict[str, Any]:
        """Serialise to a JSON-safe dict (recursing into nested dataclasses)."""
        return asdict(self)


# =============================================================================
# PROSE RESPONSE BRIDGE
# =============================================================================


@dataclass(frozen=True)
class ProseResponse:
    """Lightweight bridge object that satisfies the consensus library's
    duck-typed ``ProseResponse`` contract (``expert_id`` + ``response``).

    The library checks ``hasattr(obj, 'response')`` to decide between
    structured ``ExpertResponse`` and prose-mode processing.  Using the
    domain ``ExpertResponse`` here would require fabricating claims/evidence
    tuples from raw text, which is lossy and fragile.  A thin prose wrapper
    lets the library's own extraction pipeline do the heavy lifting.
    """

    expert_id: str
    response: str  # full prose text


# =============================================================================
# SYNTHESIS CONTEXT
# =============================================================================


@dataclass(frozen=True)
class AdapterSynthesisContext:
    """Satisfies the ``SynthesisContext`` protocol expected by library strategies.

    Fields mirror the protocol defined in ``consensus.summarise.strategies``.
    """

    study_id: str
    round_id: str
    question_id: str
    question_text: str
    code_version: str
    force_restart: bool = False


# =============================================================================
# PROGRESS CALLBACK TYPE
# =============================================================================

ProgressCallback = Callable[[str, int, int], Coroutine[Any, Any, None]]


# =============================================================================
# MOCK SYNTHESIS
# =============================================================================


class MockSynthesis:
    """Deterministic fixture data — zero API calls, instant return."""

    def __init__(self, analysts: int = 3, model: str = "mock") -> None:
        self.analysts = analysts
        self.model = model

    async def run(
        self,
        questions: List[Dict[str, Any]],
        responses: List[Dict[str, Any]],
        model: Optional[str] = None,
        mode: FlowMode = FlowMode.HUMAN_ONLY,
        progress_callback: Optional[ProgressCallback] = None,
    ) -> SynthesisResult:
        n = len(responses)

        if progress_callback:
            await progress_callback("mock_synthesis", 1, 1)

        agreements = [
            Agreement(
                claim="Participants agree on the importance of structured communication",
                supporting_experts=list(range(1, min(n + 1, 4))),
                confidence=0.85,
                evidence_summary="Multiple responses emphasised clear documentation",
            ),
            Agreement(
                claim="There is consensus on prioritising user experience",
                supporting_experts=list(range(1, min(n + 1, 3))),
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
                        "experts": [2, 3] if n > 2 else [2],
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

        return SynthesisResult(
            agreements=agreements,
            disagreements=disagreements,
            nuances=nuances,
            confidence_map={"overall": 0.78, "methodology": 0.85, "conclusions": 0.72},
            follow_up_probes=probes,
            provenance={"mode": "mock", "analysts": self.analysts},
            analyst_reports=[
                {"index": i, "payload": {"mode": "mock", "summary": f"Mock analyst {i + 1} report"}}
                for i in range(self.analysts)
            ],
            meta_synthesis_reasoning="[MOCK MODE] Simulated synthesis data for UX testing.",
            narrative="[MOCK] Placeholder narrative for testing purposes.",
        )


# =============================================================================
# LIBRARY ADAPTER
# =============================================================================


class ConsensusLibraryAdapter:
    """Adapts the axiotic-ai/consensus library to the app's interface.

    Supports ``simple`` (SinglePromptStrategy) and ``ttd`` (DiffusionStrategy).
    All heavy imports are deferred to first use via ``_lazy_init()``.
    """

    SUPPORTED_STRATEGIES = ("simple", "ttd")

    def __init__(
        self,
        strategy: str = "simple",
        model: str = "anthropic/claude-sonnet-4",
        n_drafts: int = 3,
        n_denoise_steps: int = 2,
    ) -> None:
        if strategy not in self.SUPPORTED_STRATEGIES:
            raise ConfigurationError(
                f"Strategy must be one of {self.SUPPORTED_STRATEGIES}, got '{strategy}'"
            )
        self.strategy_name: str = strategy
        self.model: str = model
        self.n_drafts: int = n_drafts
        self.n_denoise_steps: int = n_denoise_steps
        self._strategy: Any = None  # Lazy — set in _lazy_init
        self._llm_client: Any = None

    # ------------------------------------------------------------------
    # Lazy initialisation
    # ------------------------------------------------------------------

    def _resolve_prompts_dir(self) -> Path:
        """Locate the prompts directory, trying several common locations."""
        import consensus as _pkg

        candidates: list[Path] = []

        # 1. Sibling to the installed package root
        pkg_parent = Path(_pkg.__file__).parent.parent
        candidates.append(pkg_parent / "prompts")

        # 2. Relative to this repo's backend/  (dev install)
        candidates.append(Path(__file__).resolve().parent.parent.parent / "symphonia" / "prompts")

        # 3. Environment override
        env_prompts = os.getenv("CONSENSUS_PROMPTS_DIR")
        if env_prompts:
            candidates.insert(0, Path(env_prompts))

        for p in candidates:
            if p.is_dir():
                logger.debug("Resolved prompts_dir → %s", p)
                return p

        searched = ", ".join(str(c) for c in candidates)
        raise ConfigurationError(f"Could not find prompts directory. Searched: {searched}")

    def _lazy_init(self) -> None:
        """Initialise strategy & LLM client on first use."""
        if self._strategy is not None:
            return

        api_key = os.getenv("OPENROUTER_API_KEY")
        if not api_key:
            raise ConfigurationError("OPENROUTER_API_KEY environment variable is required")

        try:
            from consensus.config import LLMConfig
            from consensus.llm.openrouter import OpenRouterClient
            from consensus.summarise.strategies import (
                DiffusionStrategy,
                SinglePromptStrategy,
            )
        except ImportError as exc:
            raise ConfigurationError(
                "Failed to import consensus library — is it installed?"
            ) from exc

        config = LLMConfig(openrouter_api_key=api_key, model=self.model)
        self._llm_client = OpenRouterClient(config)

        prompts_dir = self._resolve_prompts_dir()

        if self.strategy_name == "simple":
            self._strategy = SinglePromptStrategy(
                llm_client=self._llm_client,
                prompts_dir=prompts_dir,
            )
        elif self.strategy_name == "ttd":
            from consensus.diffusion.runner import TTDConfig

            ttd_config = TTDConfig(
                n_trajectories=self.n_drafts,
                n_denoise_steps=self.n_denoise_steps,
            )
            artefacts_dir = Path(__file__).resolve().parent.parent / "artefacts"
            artefacts_dir.mkdir(parents=True, exist_ok=True)

            self._strategy = DiffusionStrategy(
                llm_client=self._llm_client,
                prompts_dir=prompts_dir,
                ttd_config=ttd_config,
                artefacts_dir=artefacts_dir,
            )

        logger.info(
            "Initialised %s strategy (model=%s, drafts=%d)",
            self.strategy_name,
            self.model,
            self.n_drafts,
        )

    # ------------------------------------------------------------------
    # Response conversion
    # ------------------------------------------------------------------

    @staticmethod
    def _build_prose_responses(
        responses: List[Dict[str, Any]],
    ) -> List[ProseResponse]:
        """Convert app-level response dicts to ProseResponse objects.

        Each dict is expected to carry an ``answers`` sub-dict (keyed by
        question id) and optionally an ``email`` field.  We concatenate
        all Q/A pairs into a single prose block and let the library's
        extraction pipeline decompose it.

        Raises:
            ResponseMappingError: If a response dict cannot be converted.
        """
        prose_responses: List[ProseResponse] = []
        for idx, resp in enumerate(responses):
            expert_id = f"E{idx + 1}"
            try:
                if isinstance(resp, dict):
                    answers = resp.get("answers", resp)
                    if isinstance(answers, dict):
                        lines = [
                            f"Q: {key}\nA: {val}"
                            for key, val in answers.items()
                            if val is not None and str(val).strip()
                        ]
                        text = "\n\n".join(lines) if lines else "(no answers provided)"
                    elif isinstance(answers, str):
                        text = answers
                    else:
                        text = str(answers)
                else:
                    text = str(resp)

                prose_responses.append(ProseResponse(expert_id=expert_id, response=text))
            except Exception as exc:
                raise ResponseMappingError(
                    f"Could not convert response at index {idx}: {exc}"
                ) from exc

        return prose_responses

    @staticmethod
    def _build_question_text(questions: List[Dict[str, Any]]) -> str:
        """Flatten question objects to a numbered text block."""
        parts: list[str] = []
        for i, q in enumerate(questions, 1):
            if isinstance(q, dict):
                label = q.get("label") or q.get("text") or q.get("id", str(q))
            else:
                label = str(q)
            parts.append(f"{i}. {label}")
        return "\n".join(parts)

    # ------------------------------------------------------------------
    # Result mapping
    # ------------------------------------------------------------------

    @staticmethod
    def _map_to_app_format(
        result: Any,  # PipelineResult from library
        num_responses: int,
        strategy_name: str,
    ) -> SynthesisResult:
        """Map a library ``PipelineResult`` to the app's ``SynthesisResult``."""
        synthesis = result.synthesis

        agreements: List[Agreement] = []
        disagreements: List[Disagreement] = []

        # --- claims → agreements / disagreements ---
        for claim in synthesis.claims:
            source_ids = _extract_expert_ids(claim.sources)

            if claim.agreement_level in ("consensus", "majority"):
                confidence = 0.9 if claim.agreement_level == "consensus" else 0.7
                agreements.append(
                    Agreement(
                        claim=claim.text,
                        supporting_experts=source_ids or list(range(1, num_responses + 1)),
                        confidence=confidence,
                        evidence_summary="; ".join(
                            s.quote for s in claim.sources if s.quote
                        )
                        or "See source material",
                    )
                )
            else:
                positions: List[Dict[str, Any]] = [
                    {"position": claim.text, "experts": source_ids, "evidence": "From synthesis"},
                ]
                for counter in claim.counterarguments:
                    positions.append(
                        {"position": counter, "experts": [], "evidence": "Counterargument identified"}
                    )
                topic = claim.text[:80] + "…" if len(claim.text) > 80 else claim.text
                disagreements.append(
                    Disagreement(topic=topic, positions=positions, severity="moderate")
                )

        # --- areas of agreement / disagreement (deduplicated) ---
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

        # --- uncertainties → nuances ---
        nuances = [
            Nuance(
                claim=u,
                context="Identified uncertainty",
                relevant_experts=list(range(1, min(3, num_responses + 1))),
            )
            for u in synthesis.uncertainties
        ]

        # --- confidence map ---
        n_agree = len(agreements)
        n_disagree = len(disagreements)
        total = n_agree + n_disagree
        overall_confidence = n_agree / total if total else 0.5
        confidence_map: Dict[str, float] = {
            "overall": round(overall_confidence, 3),
            "agreement_ratio": round(n_agree / total, 3) if total else 0.5,
        }

        return SynthesisResult(
            agreements=agreements,
            disagreements=disagreements,
            nuances=nuances,
            confidence_map=confidence_map,
            follow_up_probes=[],
            provenance={
                "strategy": strategy_name,
                "model": synthesis.model,
                "prompt_version": synthesis.prompt_version,
                "code_version": synthesis.code_version,
            },
            analyst_reports=[],
            meta_synthesis_reasoning=f"Generated via {strategy_name} strategy",
            narrative=synthesis.narrative,
            claims_raw=[
                {
                    "id": c.claim_id,
                    "text": c.text,
                    "agreement_level": c.agreement_level,
                    "sources": [
                        {"id": s.source_id, "quote": s.quote} for s in c.sources
                    ],
                    "counterarguments": list(c.counterarguments),
                }
                for c in synthesis.claims
            ],
            areas_of_agreement=list(synthesis.areas_of_agreement),
            areas_of_disagreement=list(synthesis.areas_of_disagreement),
            uncertainties=list(synthesis.uncertainties),
        )

    # ------------------------------------------------------------------
    # Main entry point
    # ------------------------------------------------------------------

    async def run(
        self,
        questions: List[Dict[str, Any]],
        responses: List[Dict[str, Any]],
        model: Optional[str] = None,
        mode: FlowMode = FlowMode.HUMAN_ONLY,
        progress_callback: Optional[ProgressCallback] = None,
    ) -> SynthesisResult:
        """Run synthesis using the configured consensus-library strategy.

        Args:
            questions: Question dicts (must have 'label', 'text', or 'id').
            responses: Response dicts (each with 'answers' sub-dict).
            model: Override model identifier (unused by library adapter — set at init).
            mode: Flow mode (reserved for future AI-assisted flow).
            progress_callback: ``async (stage, step, total) -> None`` for streaming updates.

        Returns:
            ``SynthesisResult`` mapped from the library's ``PipelineResult``.

        Raises:
            ConfigurationError: On missing API key / bad strategy / missing prompts.
            ResponseMappingError: If responses cannot be converted.
            LibraryError: On any failure inside the consensus library.
        """
        if not responses:
            raise ResponseMappingError("Cannot synthesise zero responses")

        # Initialise on first call
        try:
            self._lazy_init()
        except SynthesisError:
            raise  # Already wrapped
        except Exception as exc:
            raise ConfigurationError(f"Adapter initialisation failed: {exc}") from exc

        # Convert app data → library domain
        prose_responses = self._build_prose_responses(responses)
        question_text = self._build_question_text(questions)

        context = AdapterSynthesisContext(
            study_id="runtime",
            round_id="1",
            question_id="q1",
            question_text=question_text,
            code_version="adapter-v2-worker-b",
        )

        if progress_callback:
            await progress_callback("preparing", 0, 3)

        # Call the library strategy
        try:
            result = await self._strategy.run(
                context=context,
                responses=prose_responses,
            )
        except NotImplementedError as exc:
            raise LibraryError(
                "The selected strategy is not yet implemented in the consensus library",
                cause=exc,
            ) from exc
        except Exception as exc:
            logger.exception("Consensus library strategy raised an exception")
            raise LibraryError(
                f"Synthesis strategy '{self.strategy_name}' failed: {exc}",
                cause=exc,
            ) from exc

        if progress_callback:
            await progress_callback("mapping_results", 2, 3)

        # Map to app format
        try:
            app_result = self._map_to_app_format(
                result,
                num_responses=len(responses),
                strategy_name=self.strategy_name,
            )
        except Exception as exc:
            raise LibraryError(
                f"Failed to map library result to app format: {exc}",
                cause=exc,
            ) from exc

        if progress_callback:
            await progress_callback("complete", 3, 3)

        return app_result


# =============================================================================
# HELPERS
# =============================================================================


def _extract_expert_ids(sources: Sequence[Any]) -> List[int]:
    """Pull integer expert ids from source references (e.g. "E3" → 3)."""
    ids: list[int] = []
    for src in sources:
        sid = getattr(src, "source_id", "")
        if isinstance(sid, str) and sid.startswith("E") and sid[1:].isdigit():
            ids.append(int(sid[1:]))
    return ids


# =============================================================================
# FACTORY
# =============================================================================


def get_synthesiser(
    api_key: Optional[str] = None,
    n_analysts: int = 3,
    mode: Optional[str] = None,
    strategy: Optional[str] = None,
    model: str = "anthropic/claude-sonnet-4",
    **kwargs: Any,
) -> MockSynthesis | ConsensusLibraryAdapter:
    """Factory function returning the appropriate synthesiser.

    Resolution order for the effective mode:
        1. Explicit ``mode`` argument
        2. Explicit ``strategy`` argument (back-compat alias)
        3. ``SYNTHESIS_MODE`` environment variable
        4. Default → ``"simple"``

    Modes:
        mock     — No API calls; returns deterministic fixtures.
        simple   — SinglePromptStrategy (fast one-shot).
        ttd      — DiffusionStrategy (iterative refinement, recommended).
        committee — Not yet in library; falls back to TTD with logged warning.

    Raises:
        ConfigurationError: On unknown mode.
    """
    effective = (mode or strategy or os.getenv("SYNTHESIS_MODE", "simple")).lower().strip()

    # --- mock ---
    if effective == "mock":
        logger.info("🎭 Using MOCK synthesis mode (no API calls)")
        return MockSynthesis(analysts=n_analysts, model="mock")

    # --- committee → ttd fallback ---
    if effective == "committee":
        logger.warning(
            "⚠️  CommitteeStrategy is not yet implemented in the consensus library — "
            "falling back to TTD (DiffusionStrategy)"
        )
        effective = "ttd"

    # --- simple / ttd ---
    if effective in ConsensusLibraryAdapter.SUPPORTED_STRATEGIES:
        logger.info("🔬 Using %s synthesis strategy (model=%s)", effective.upper(), model)
        return ConsensusLibraryAdapter(
            strategy=effective,
            model=model,
            n_drafts=n_analysts,
            **kwargs,
        )

    raise ConfigurationError(f"Unknown synthesis mode: '{effective}'")


# =============================================================================
# BACKWARDS COMPATIBILITY ALIASES
# =============================================================================

CommitteeSynthesiser = ConsensusLibraryAdapter
OpenRouterSynthesis = ConsensusLibraryAdapter
