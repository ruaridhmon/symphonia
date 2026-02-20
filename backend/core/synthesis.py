"""
Synthesis adapter for Axiotic consensus library.

Provides a unified interface to the consensus library's synthesis strategies:
- simple: SinglePromptStrategy (fast, one-shot)
- ttd: DiffusionStrategy (iterative refinement with fitness evaluation)
- committee: CommitteeStrategy (multi-agent, not yet implemented)
- mock: MockSynthesis (no API calls, for UX testing)

The adapter maps between the app's data structures and the library's domain models.
"""
from __future__ import annotations

import asyncio
import os
from dataclasses import dataclass, asdict
from enum import Enum
from pathlib import Path
from typing import Any, Dict, List, Sequence

# =============================================================================
# APP-LEVEL DATA STRUCTURES (unchanged from original)
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
    severity: str


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
    agreements: List[Agreement]
    disagreements: List[Disagreement]
    nuances: List[Nuance]
    confidence_map: Dict[str, float]
    follow_up_probes: List[Probe]
    provenance: Dict[str, Any]
    analyst_reports: List[Dict[str, Any]]
    meta_synthesis_reasoning: str
    
    # Additional fields from library
    narrative: str = ""
    claims_raw: List[Dict[str, Any]] | None = None
    areas_of_agreement: List[str] | None = None
    areas_of_disagreement: List[str] | None = None
    uncertainties: List[str] | None = None

    def to_dict(self) -> Dict[str, Any]:
        """Convert to JSON-serializable dict."""
        return asdict(self)


# =============================================================================
# MOCK SYNTHESIS (no API calls)
# =============================================================================

class MockSynthesis:
    """Returns pre-baked synthesis results for UX testing without API costs."""

    def __init__(self, analysts: int = 3, model: str = "mock"):
        self.analysts = analysts
        self.model = model

    async def run(
        self,
        questions: List[Dict[str, Any]],
        responses: List[Dict[str, Any]],
        model: str | None = None,
        mode: FlowMode = FlowMode.HUMAN_ONLY,
        progress_callback=None,
    ) -> SynthesisResult:
        num_responses = len(responses)

        agreements = [
            Agreement(
                claim="Participants agree on the importance of structured communication",
                supporting_experts=list(range(1, min(num_responses + 1, 4))),
                confidence=0.85,
                evidence_summary="Multiple responses emphasized clear documentation",
            ),
            Agreement(
                claim="There is consensus on prioritizing user experience",
                supporting_experts=list(range(1, min(num_responses + 1, 3))),
                confidence=0.92,
                evidence_summary="Responses consistently mentioned UX as key",
            ),
        ]

        disagreements = [
            Disagreement(
                topic="Implementation timeline",
                positions=[
                    {"position": "Aggressive 3-month rollout", "experts": [1], "evidence": "Market timing critical"},
                    {"position": "Cautious 6-month approach", "experts": [2, 3] if num_responses > 2 else [2], "evidence": "Quality over speed"},
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
                {"index": i, "payload": {"mode": "mock", "summary": f"Mock analyst {i+1} report"}}
                for i in range(self.analysts)
            ],
            meta_synthesis_reasoning="[MOCK MODE] Simulated synthesis data for UX testing.",
            narrative="[MOCK] This is a placeholder narrative for testing purposes.",
        )


# =============================================================================
# LIBRARY ADAPTER
# =============================================================================

class ConsensusLibraryAdapter:
    """
    Adapts the Axiotic consensus library to the app's interface.
    
    Wraps SinglePromptStrategy or DiffusionStrategy and maps outputs
    to the app's SynthesisResult format.
    """

    def __init__(
        self,
        strategy: str = "simple",
        model: str = "anthropic/claude-sonnet-4",
        n_drafts: int = 3,
        n_denoise_steps: int = 2,
    ):
        """
        Args:
            strategy: "simple" or "ttd"
            model: OpenRouter model identifier
            n_drafts: Number of parallel drafts for TTD
            n_denoise_steps: Number of denoising iterations for TTD
        """
        self.strategy_name = strategy
        self.model = model
        self.n_drafts = n_drafts
        self.n_denoise_steps = n_denoise_steps
        self._strategy = None
        self._llm_client = None

    def _lazy_init(self):
        """Lazy initialization to avoid import costs until needed."""
        if self._strategy is not None:
            return

        from consensus.config import LLMConfig
        from consensus.llm.openrouter import OpenRouterClient
        from consensus.summarise.strategies import SinglePromptStrategy, DiffusionStrategy
        from consensus.diffusion.runner import TTDConfig
        
        api_key = os.getenv("OPENROUTER_API_KEY")
        if not api_key:
            raise ValueError("OPENROUTER_API_KEY environment variable required")

        config = LLMConfig(
            openrouter_api_key=api_key,
            model=self.model,
        )
        self._llm_client = OpenRouterClient(config)

        # Find prompts directory in the installed package
        import consensus
        package_dir = Path(consensus.__file__).parent
        prompts_dir = package_dir.parent / "prompts"
        
        # Fallback: check common locations
        if not prompts_dir.exists():
            # Try relative to the symphonia repo if installed in dev mode
            prompts_dir = Path(__file__).parent.parent.parent.parent / "symphonia" / "prompts"
        
        if not prompts_dir.exists():
            raise FileNotFoundError(
                f"Could not find prompts directory. Checked: {prompts_dir}"
            )

        if self.strategy_name == "simple":
            self._strategy = SinglePromptStrategy(
                llm_client=self._llm_client,
                prompts_dir=prompts_dir,
            )
        elif self.strategy_name == "ttd":
            ttd_config = TTDConfig(
                n_trajectories=self.n_drafts,
                n_denoise_steps=self.n_denoise_steps,
            )
            artefacts_dir = Path(__file__).parent.parent / "artefacts"
            artefacts_dir.mkdir(exist_ok=True)
            
            self._strategy = DiffusionStrategy(
                llm_client=self._llm_client,
                prompts_dir=prompts_dir,
                ttd_config=ttd_config,
                artefacts_dir=artefacts_dir,
            )
        else:
            raise ValueError(f"Unknown strategy: {self.strategy_name}")

    async def run(
        self,
        questions: List[Dict[str, Any]],
        responses: List[Dict[str, Any]],
        model: str | None = None,
        mode: FlowMode = FlowMode.HUMAN_ONLY,
        progress_callback=None,
    ) -> SynthesisResult:
        """
        Run synthesis using the consensus library.
        
        Args:
            questions: List of question dicts with 'text' or 'label' keys
            responses: List of response dicts (answers from experts)
            model: Override model (optional)
            mode: Flow mode (currently unused by library)
            progress_callback: Progress callback (currently unused)
            
        Returns:
            SynthesisResult mapped from library output
        """
        self._lazy_init()

        # Build context for library
        from consensus.domain.models import ExpertResponse
        
        # Convert app responses to library format
        expert_responses: List[ExpertResponse] = []
        for i, resp in enumerate(responses):
            # Handle both flat answers and nested structure
            if isinstance(resp, dict):
                answers_text = "\n".join(
                    f"Q: {k}\nA: {v}" for k, v in resp.items() if v
                )
            else:
                answers_text = str(resp)
            
            expert_responses.append(ExpertResponse(
                expert_id=f"E{i+1}",
                expert_name=f"Expert {i+1}",
                response_text=answers_text,
            ))

        # Build question text
        question_text = "\n".join(
            q.get("label") or q.get("text") or str(q)
            for q in questions
        )

        # Create minimal context
        class MinimalContext:
            study_id = "runtime"
            round_id = "1"
            question_id = "q1"
            question_text = question_text
            code_version = "adapter-v1"
            force_restart = False

        # Run the strategy
        result = await self._strategy.run(
            context=MinimalContext(),
            responses=expert_responses,
        )

        # Map library output to app format
        return self._map_to_app_format(result, len(responses))

    def _map_to_app_format(self, result, num_responses: int) -> SynthesisResult:
        """Map library PipelineResult to app SynthesisResult."""
        synthesis = result.synthesis

        # Map claims to agreements/disagreements based on agreement_level
        agreements = []
        disagreements = []
        
        for claim in synthesis.claims:
            source_ids = [int(s.source_id.replace("E", "")) for s in claim.sources if s.source_id.startswith("E")]
            
            if claim.agreement_level in ("consensus", "majority"):
                agreements.append(Agreement(
                    claim=claim.text,
                    supporting_experts=source_ids or list(range(1, num_responses + 1)),
                    confidence=0.9 if claim.agreement_level == "consensus" else 0.7,
                    evidence_summary="; ".join(s.quote for s in claim.sources if s.quote),
                ))
            else:
                # Divided or minority -> disagreement
                positions = [{"position": claim.text, "experts": source_ids, "evidence": "From synthesis"}]
                if claim.counterarguments:
                    positions.append({
                        "position": claim.counterarguments[0],
                        "experts": [],
                        "evidence": "Counterargument identified",
                    })
                disagreements.append(Disagreement(
                    topic=claim.text[:50] + "..." if len(claim.text) > 50 else claim.text,
                    positions=positions,
                    severity="moderate",
                ))

        # Map areas directly
        for area in synthesis.areas_of_agreement:
            if not any(a.claim == area for a in agreements):
                agreements.append(Agreement(
                    claim=area,
                    supporting_experts=list(range(1, num_responses + 1)),
                    confidence=0.8,
                    evidence_summary="Identified as area of agreement",
                ))

        for area in synthesis.areas_of_disagreement:
            if not any(d.topic == area for d in disagreements):
                disagreements.append(Disagreement(
                    topic=area,
                    positions=[{"position": area, "experts": [], "evidence": "Identified as area of disagreement"}],
                    severity="moderate",
                ))

        # Map uncertainties to nuances
        nuances = [
            Nuance(
                claim=u,
                context="Identified uncertainty",
                relevant_experts=list(range(1, min(3, num_responses + 1))),
            )
            for u in synthesis.uncertainties
        ]

        return SynthesisResult(
            agreements=agreements,
            disagreements=disagreements,
            nuances=nuances,
            confidence_map={"overall": 0.75},
            follow_up_probes=[],
            provenance={
                "strategy": self.strategy_name,
                "model": synthesis.model,
                "prompt_version": synthesis.prompt_version,
            },
            analyst_reports=[],
            meta_synthesis_reasoning=f"Generated via {self.strategy_name} strategy",
            narrative=synthesis.narrative,
            claims_raw=[
                {
                    "id": c.claim_id,
                    "text": c.text,
                    "agreement_level": c.agreement_level,
                    "sources": [{"id": s.source_id, "quote": s.quote} for s in c.sources],
                    "counterarguments": list(c.counterarguments),
                }
                for c in synthesis.claims
            ],
            areas_of_agreement=list(synthesis.areas_of_agreement),
            areas_of_disagreement=list(synthesis.areas_of_disagreement),
            uncertainties=list(synthesis.uncertainties),
        )


# =============================================================================
# FACTORY FUNCTION
# =============================================================================

def get_synthesiser(
    api_key: str | None = None,
    n_analysts: int = 3,
    mode: str | None = None,
    strategy: str | None = None,
    model: str = "anthropic/claude-sonnet-4",
    **kwargs,
) -> MockSynthesis | ConsensusLibraryAdapter:
    """
    Factory function to get the appropriate synthesiser.
    
    Args:
        api_key: OpenRouter API key (reads from env if not provided)
        n_analysts: Number of analysts/drafts
        mode: Synthesis mode - "mock", "simple", "ttd", "committee"
               Also reads from SYNTHESIS_MODE env var
        strategy: Alias for mode (for backwards compat)
        model: OpenRouter model identifier
        **kwargs: Additional args passed to adapter
        
    Returns:
        Appropriate synthesiser instance
        
    Modes:
        mock: No API calls, fake results for UX testing
        simple: SinglePromptStrategy - fast one-shot synthesis
        ttd: DiffusionStrategy - iterative refinement (recommended)
        committee: CommitteeStrategy - not yet implemented, falls back to ttd
    """
    # Determine mode
    effective_mode = mode or strategy or os.getenv("SYNTHESIS_MODE", "simple").lower()
    
    if effective_mode == "mock":
        print("🎭 Using MOCK synthesis mode (no API calls)")
        return MockSynthesis(analysts=n_analysts, model="mock")
    
    if effective_mode == "committee":
        print("⚠️  Committee strategy not yet implemented, falling back to TTD")
        effective_mode = "ttd"
    
    if effective_mode in ("simple", "ttd"):
        print(f"🔬 Using {effective_mode.upper()} synthesis strategy")
        return ConsensusLibraryAdapter(
            strategy=effective_mode,
            model=model,
            n_drafts=n_analysts,
            **kwargs,
        )
    
    raise ValueError(f"Unknown synthesis mode: {effective_mode}")


# =============================================================================
# BACKWARDS COMPATIBILITY
# =============================================================================

# Alias for old code that imports CommitteeSynthesiser
CommitteeSynthesiser = ConsensusLibraryAdapter
OpenRouterSynthesis = ConsensusLibraryAdapter
