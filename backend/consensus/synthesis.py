"""Committee-based synthesis engine for Symphonia.

Implements a multi-analyst committee approach to expert response synthesis:
1. N independent LLM analysts each review all expert responses
2. Each analyst extracts agreements, disagreements, nuances, and gaps
3. A meta-synthesiser merges all analyst outputs into a final structured synthesis
4. Optionally generates follow-up probe questions (ai_assisted mode)

The committee approach reduces single-model bias and surfaces genuine ambiguity
where analysts disagree — a diagnostic signal, not noise.
"""

from __future__ import annotations

import asyncio
import json
import logging
import re
from dataclasses import asdict, dataclass, field
from enum import Enum
from typing import Any

from openai import AsyncOpenAI

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Data classes
# ---------------------------------------------------------------------------

class FlowMode(str, Enum):
    """Operating mode for the Delphi follow-up phase."""
    HUMAN_ONLY = "human_only"
    AI_ASSISTED = "ai_assisted"


@dataclass
class Agreement:
    """A point of consensus among experts.

    Attributes:
        claim: The consensus claim in plain language.
        supporting_experts: Indices of experts who support this claim.
        confidence: 0-1 score reflecting analyst consensus strength.
        evidence_summary: Brief summary of the supporting evidence.
    """
    claim: str
    supporting_experts: list[int]
    confidence: float
    evidence_summary: str


@dataclass
class Disagreement:
    """A point of divergence among experts.

    Attributes:
        topic: The subject of disagreement.
        positions: List of dicts, each with 'position', 'experts', 'evidence'.
        severity: One of 'minor', 'significant', 'fundamental'.
    """
    topic: str
    positions: list[dict]
    severity: str  # "minor" | "significant" | "fundamental"


@dataclass
class Nuance:
    """A nuanced point, caveat, or contextual qualification.

    Attributes:
        claim: The nuanced observation.
        context: Why this nuance matters.
        relevant_experts: Indices of experts who raised or relate to this point.
    """
    claim: str
    context: str
    relevant_experts: list[int]


@dataclass
class Probe:
    """A follow-up question to sharpen the synthesis.

    Attributes:
        question: The probe question text.
        target_experts: Indices of experts who should answer.
        rationale: Why this probe matters for convergence.
    """
    question: str
    target_experts: list[int]
    rationale: str


@dataclass
class SynthesisResult:
    """Complete output of a committee synthesis run.

    Attributes:
        agreements: Confirmed areas of consensus.
        disagreements: Areas where experts diverge.
        nuances: Contextual qualifications and caveats.
        confidence_map: Per-question confidence distribution.
        follow_up_probes: AI-generated probes (only if ai_assisted).
        provenance: Mapping of which expert said what.
        analyst_reports: Raw analyst outputs for full transparency.
        meta_synthesis_reasoning: The meta-synthesiser's reasoning chain.
    """
    agreements: list[Agreement] = field(default_factory=list)
    disagreements: list[Disagreement] = field(default_factory=list)
    nuances: list[Nuance] = field(default_factory=list)
    confidence_map: dict = field(default_factory=dict)
    follow_up_probes: list[Probe] = field(default_factory=list)
    provenance: dict = field(default_factory=dict)
    analyst_reports: list[dict] = field(default_factory=list)
    meta_synthesis_reasoning: str = ""

    def to_dict(self) -> dict:
        """Serialise the result to a plain dict (JSON-safe)."""
        return {
            "agreements": [asdict(a) for a in self.agreements],
            "disagreements": [asdict(d) for d in self.disagreements],
            "nuances": [asdict(n) for n in self.nuances],
            "confidence_map": self.confidence_map,
            "follow_up_probes": [asdict(p) for p in self.follow_up_probes],
            "provenance": self.provenance,
            "analyst_reports": self.analyst_reports,
            "meta_synthesis_reasoning": self.meta_synthesis_reasoning,
        }


# ---------------------------------------------------------------------------
# JSON parsing helpers
# ---------------------------------------------------------------------------

def _strip_markdown_json(text: str) -> str:
    """Strip markdown code fences from LLM output.

    LLMs frequently wrap JSON in ```json ... ``` blocks.  This strips those
    wrappers so ``json.loads`` can parse the content.

    Args:
        text: Raw LLM output string.

    Returns:
        The unwrapped JSON string.
    """
    text = text.strip()
    # Handle ```json ... ``` or ``` ... ```
    match = re.match(r"^```(?:json)?\s*\n?(.*?)\n?\s*```$", text, re.DOTALL)
    if match:
        return match.group(1).strip()
    return text


def _safe_parse_json(text: str) -> dict | None:
    """Attempt to parse JSON from potentially messy LLM output.

    Tries direct parse first, then strips markdown fences, then attempts to
    find the first JSON object in the string.

    Args:
        text: Raw LLM output.

    Returns:
        Parsed dict, or None if parsing fails entirely.
    """
    if not text:
        return None

    # Attempt 1: direct parse
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    # Attempt 2: strip markdown wrappers
    stripped = _strip_markdown_json(text)
    try:
        return json.loads(stripped)
    except json.JSONDecodeError:
        pass

    # Attempt 3: find the first { ... } block (greedy)
    match = re.search(r"\{.*\}", text, re.DOTALL)
    if match:
        try:
            return json.loads(match.group(0))
        except json.JSONDecodeError:
            pass

    logger.warning("Failed to parse JSON from LLM output: %.200s…", text)
    return None


# ---------------------------------------------------------------------------
# Prompt templates
# ---------------------------------------------------------------------------

ANALYST_SYSTEM_PROMPT = """\
You are an independent analyst reviewing expert responses to a structured survey.

Your job is to identify:
- **Agreements**: Points where multiple experts converge.
- **Disagreements**: Points where experts diverge, with each position clearly stated.
- **Nuances**: Edge cases, caveats, contextual qualifications that aren't simple agree/disagree.
- **Gaps**: Important topics or perspectives that no expert addressed but probably should have.

RULES:
- You must NOT take a position yourself. You organise and reconcile ONLY.
- Reference experts by their index number (0-based).
- Be thorough — capture every substantive point, not just the obvious ones.
- If experts use different terminology for the same concept, unify it.

Output ONLY valid JSON (no markdown fences, no commentary) matching this schema:
{
  "agreements": [
    {
      "claim": "string — the consensus claim",
      "supporting_experts": [0, 1, 2],
      "confidence": 0.85,
      "evidence_summary": "string — brief evidence summary"
    }
  ],
  "disagreements": [
    {
      "topic": "string — what they disagree about",
      "positions": [
        {"position": "string", "experts": [0], "evidence": "string"},
        {"position": "string", "experts": [1, 2], "evidence": "string"}
      ],
      "severity": "minor | significant | fundamental"
    }
  ],
  "nuances": [
    {
      "claim": "string — the nuanced observation",
      "context": "string — why this matters",
      "relevant_experts": [1]
    }
  ],
  "gaps": [
    {
      "topic": "string — what's missing",
      "why_it_matters": "string"
    }
  ]
}"""


META_SYNTHESISER_SYSTEM_PROMPT = """\
You are a meta-synthesiser. You have received {n} independent analyst reports that each \
reviewed the same set of expert responses to a structured survey.

Your job is to merge these analyst reports into a single, authoritative synthesis:

1. **Where analysts agree** → Confirmed finding. High confidence.
2. **Where analysts disagree** → Genuine ambiguity in the data. Report both sides. Do NOT pick one.
3. **Nuances** → Merge and deduplicate. Preserve anything substantive.
4. **Gaps** → Union of all identified gaps.

For each agreement, compute a confidence score (0.0–1.0) based on:
- How many analysts identified it (N/N = highest)
- How many experts support it
- Strength of evidence cited

Also produce a per-question confidence distribution: for each question, what is the \
overall confidence level that expert consensus exists.

Output ONLY valid JSON (no markdown fences, no commentary) matching this schema:
{{
  "agreements": [
    {{
      "claim": "string",
      "supporting_experts": [0, 1],
      "confidence": 0.9,
      "evidence_summary": "string"
    }}
  ],
  "disagreements": [
    {{
      "topic": "string",
      "positions": [
        {{"position": "string", "experts": [0], "evidence": "string"}},
        {{"position": "string", "experts": [1, 2], "evidence": "string"}}
      ],
      "severity": "minor | significant | fundamental"
    }}
  ],
  "nuances": [
    {{
      "claim": "string",
      "context": "string",
      "relevant_experts": [1]
    }}
  ],
  "confidence_map": {{
    "q1": 0.85,
    "q2": 0.60
  }},
  "reasoning": "string — your reasoning process for merging these reports"
}}"""


PROBE_SYSTEM_PROMPT = """\
You are a follow-up question generator for a Delphi expert consensus process.

You have received a synthesis of expert responses. Based on this synthesis, generate \
targeted follow-up probe questions that would:

1. **Sharpen unclear disagreements** — Ask specific experts to clarify or defend positions \
where the synthesis identifies ambiguity.
2. **Strengthen weak alignments** — Where agreement exists but confidence is low, ask for \
more evidence or more precise formulations.
3. **Fill identified gaps** — Ask about topics or perspectives that no expert addressed.

For each probe, specify:
- The exact question text
- Which experts (by index) should answer (target the relevant ones, not everyone)
- Why this probe matters for reaching convergence

Generate 3-7 probes. Prioritise quality over quantity.

Output ONLY valid JSON (no markdown fences, no commentary) matching this schema:
{
  "probes": [
    {
      "question": "string",
      "target_experts": [0, 2],
      "rationale": "string"
    }
  ]
}"""


# ---------------------------------------------------------------------------
# Committee Synthesiser
# ---------------------------------------------------------------------------

class CommitteeSynthesiser:
    """N independent LLM analysts + meta-synthesiser for expert consensus.

    Uses the OpenAI client library configured for OpenRouter.  All calls are
    async for concurrent analyst fan-out.

    Args:
        api_key: OpenRouter API key.
        base_url: OpenRouter (or compatible) base URL.
        n_analysts: Number of independent analyst passes (default 3).
    """

    def __init__(
        self,
        api_key: str,
        base_url: str = "https://openrouter.ai/api/v1",
        n_analysts: int = 3,
    ) -> None:
        self._client = AsyncOpenAI(api_key=api_key, base_url=base_url)
        self._n_analysts = n_analysts

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    async def run(
        self,
        questions: list[dict | str],
        responses: list[dict],
        model: str = "anthropic/claude-sonnet-4-5",
        mode: FlowMode = FlowMode.HUMAN_ONLY,
        progress_callback: Any | None = None,
    ) -> SynthesisResult:
        """Run a full committee synthesis.

        Args:
            questions: List of question texts or question dicts with 'text' key.
            responses: List of response dicts, each with 'answers' and optionally
                'email' for provenance tracking.
            model: LLM model identifier (OpenRouter format).
            mode: FlowMode — controls whether follow-up probes are generated.
            progress_callback: Optional async callable(stage: str, step: int, total: int)
                for streaming progress updates.

        Returns:
            A fully populated SynthesisResult.
        """
        total_steps = self._n_analysts + 1 + (1 if mode == FlowMode.AI_ASSISTED else 0)

        # Step 0: Build context
        context = self._format_context(questions, responses)
        provenance = self._build_provenance(questions, responses)

        # Step 1: Fan out to N analysts in parallel
        analyst_tasks = [
            self._run_analyst(i, context, model)
            for i in range(self._n_analysts)
        ]
        analyst_results = await asyncio.gather(*analyst_tasks, return_exceptions=True)

        # Collect successful results, skip failures
        analyst_reports: list[dict] = []
        for i, result in enumerate(analyst_results):
            step = i + 1
            if isinstance(result, Exception):
                logger.error("Analyst %d failed: %s", i, result)
            elif result is not None:
                analyst_reports.append(result)
            else:
                logger.warning("Analyst %d returned None (parse failure)", i)

            if progress_callback:
                await progress_callback(
                    f"analyst_{i}_complete", step, total_steps,
                )

        if not analyst_reports:
            logger.error("All analysts failed — returning empty synthesis")
            return SynthesisResult(provenance=provenance, analyst_reports=[])

        # Step 2: Meta-synthesis
        meta_result = await self._run_meta_synthesis(
            analyst_reports, questions, model,
        )
        meta_step = self._n_analysts + 1
        if progress_callback:
            await progress_callback("meta_synthesis_complete", meta_step, total_steps)

        # Step 3: Build result
        result = self._build_result(meta_result, analyst_reports, provenance)

        # Step 4: If ai_assisted, generate follow-up probes
        if mode == FlowMode.AI_ASSISTED:
            probes = await self._generate_probes(result, model)
            result.follow_up_probes = probes
            if progress_callback:
                await progress_callback(
                    "probes_complete", meta_step + 1, total_steps,
                )

        return result

    # ------------------------------------------------------------------
    # Context formatting
    # ------------------------------------------------------------------

    def _format_context(
        self,
        questions: list[dict | str],
        responses: list[dict],
    ) -> str:
        """Format questions and responses into a structured text block.

        Args:
            questions: List of question texts or dicts.
            responses: List of response dicts.

        Returns:
            Formatted context string for analyst prompts.
        """
        lines: list[str] = []

        # Questions section
        lines.append("=== QUESTIONS ===")
        for i, q in enumerate(questions):
            q_text = q if isinstance(q, str) else q.get("text", str(q))
            lines.append(f"Q{i + 1}: {q_text}")
        lines.append("")

        # Responses section
        lines.append("=== EXPERT RESPONSES ===")
        for idx, resp in enumerate(responses):
            lines.append(f"\n--- Expert {idx} ---")
            email = resp.get("email", f"Expert {idx}")
            lines.append(f"Identifier: {email}")

            answers = resp.get("answers", {})
            for key, value in answers.items():
                # Match question key (q1, q2, etc.) to question text
                q_num = key.replace("q", "") if key.startswith("q") else key
                try:
                    q_idx = int(q_num) - 1
                    q_text = questions[q_idx] if q_idx < len(questions) else key
                    if isinstance(q_text, dict):
                        q_text = q_text.get("text", str(q_text))
                except (ValueError, IndexError):
                    q_text = key

                lines.append(f"  Q: {q_text}")
                lines.append(f"  A: {value}")
            lines.append("")

        return "\n".join(lines)

    def _build_provenance(
        self,
        questions: list[dict | str],
        responses: list[dict],
    ) -> dict:
        """Build a provenance map: which expert said what.

        Args:
            questions: List of question texts or dicts.
            responses: List of response dicts.

        Returns:
            Dict mapping expert indices to their response summaries.
        """
        provenance: dict[str, Any] = {}
        for idx, resp in enumerate(responses):
            expert_key = f"expert_{idx}"
            email = resp.get("email", f"Expert {idx}")
            provenance[expert_key] = {
                "email": email,
                "answers": resp.get("answers", {}),
            }
        return provenance

    # ------------------------------------------------------------------
    # Analyst pass
    # ------------------------------------------------------------------

    async def _run_analyst(
        self,
        analyst_idx: int,
        context: str,
        model: str,
    ) -> dict | None:
        """Run a single independent analyst pass.

        Args:
            analyst_idx: Index of this analyst (for logging).
            context: Formatted expert response context.
            model: LLM model identifier.

        Returns:
            Parsed analyst report dict, or None on failure.
        """
        user_prompt = (
            f"Analyse the following expert responses. You are Analyst #{analyst_idx}.\n\n"
            f"{context}"
        )

        try:
            completion = await self._client.chat.completions.create(
                model=model,
                messages=[
                    {"role": "system", "content": ANALYST_SYSTEM_PROMPT},
                    {"role": "user", "content": user_prompt},
                ],
                temperature=0.3 + (analyst_idx * 0.1),  # slight temp variation
                max_tokens=4096,
            )

            raw = completion.choices[0].message.content
            parsed = _safe_parse_json(raw)
            if parsed is None:
                logger.warning(
                    "Analyst %d: failed to parse JSON output", analyst_idx,
                )
                return None

            parsed["_analyst_idx"] = analyst_idx
            parsed["_raw_output"] = raw
            return parsed

        except Exception as exc:
            logger.error("Analyst %d LLM call failed: %s", analyst_idx, exc)
            raise

    # ------------------------------------------------------------------
    # Meta-synthesis
    # ------------------------------------------------------------------

    async def _run_meta_synthesis(
        self,
        analyst_reports: list[dict],
        questions: list[dict | str],
        model: str,
    ) -> dict:
        """Run the meta-synthesiser over all analyst reports.

        Args:
            analyst_reports: List of analyst report dicts.
            questions: Original questions (for question key mapping).
            model: LLM model identifier.

        Returns:
            Parsed meta-synthesis dict.
        """
        # Build question key list for confidence map
        q_keys = []
        for i, q in enumerate(questions):
            q_text = q if isinstance(q, str) else q.get("text", str(q))
            q_keys.append(f"q{i + 1}")

        # Format analyst reports for the meta-synthesiser
        reports_text = ""
        for i, report in enumerate(analyst_reports):
            # Remove internal metadata before showing to meta-synthesiser
            clean = {k: v for k, v in report.items() if not k.startswith("_")}
            reports_text += f"\n=== ANALYST {i} REPORT ===\n"
            reports_text += json.dumps(clean, indent=2)
            reports_text += "\n"

        system = META_SYNTHESISER_SYSTEM_PROMPT.format(n=len(analyst_reports))

        user_prompt = (
            f"Here are {len(analyst_reports)} independent analyst reports.\n"
            f"The questions were keyed as: {', '.join(q_keys)}\n\n"
            f"{reports_text}\n\n"
            f"Produce the merged synthesis now."
        )

        try:
            completion = await self._client.chat.completions.create(
                model=model,
                messages=[
                    {"role": "system", "content": system},
                    {"role": "user", "content": user_prompt},
                ],
                temperature=0.2,
                max_tokens=4096,
            )

            raw = completion.choices[0].message.content
            parsed = _safe_parse_json(raw)
            if parsed is None:
                logger.error("Meta-synthesis: failed to parse JSON output")
                return {
                    "agreements": [],
                    "disagreements": [],
                    "nuances": [],
                    "confidence_map": {},
                    "reasoning": "Meta-synthesis JSON parsing failed.",
                }
            return parsed

        except Exception as exc:
            logger.error("Meta-synthesis LLM call failed: %s", exc)
            return {
                "agreements": [],
                "disagreements": [],
                "nuances": [],
                "confidence_map": {},
                "reasoning": f"Meta-synthesis call failed: {exc}",
            }

    # ------------------------------------------------------------------
    # Follow-up probe generation
    # ------------------------------------------------------------------

    async def _generate_probes(
        self,
        result: SynthesisResult,
        model: str,
    ) -> list[Probe]:
        """Generate targeted follow-up probe questions.

        Only called in ai_assisted mode.

        Args:
            result: The current synthesis result.
            model: LLM model identifier.

        Returns:
            List of Probe objects.
        """
        synthesis_summary = json.dumps(
            {
                "agreements": [asdict(a) for a in result.agreements],
                "disagreements": [asdict(d) for d in result.disagreements],
                "nuances": [asdict(n) for n in result.nuances],
                "confidence_map": result.confidence_map,
            },
            indent=2,
        )

        user_prompt = (
            "Based on this synthesis, generate follow-up probe questions:\n\n"
            f"{synthesis_summary}"
        )

        try:
            completion = await self._client.chat.completions.create(
                model=model,
                messages=[
                    {"role": "system", "content": PROBE_SYSTEM_PROMPT},
                    {"role": "user", "content": user_prompt},
                ],
                temperature=0.4,
                max_tokens=2048,
            )

            raw = completion.choices[0].message.content
            parsed = _safe_parse_json(raw)
            if parsed is None:
                logger.warning("Probe generation: failed to parse JSON")
                return []

            probes: list[Probe] = []
            for p in parsed.get("probes", []):
                probes.append(Probe(
                    question=p.get("question", ""),
                    target_experts=p.get("target_experts", []),
                    rationale=p.get("rationale", ""),
                ))
            return probes

        except Exception as exc:
            logger.error("Probe generation failed: %s", exc)
            return []

    # ------------------------------------------------------------------
    # Result assembly
    # ------------------------------------------------------------------

    def _build_result(
        self,
        meta: dict,
        analyst_reports: list[dict],
        provenance: dict,
    ) -> SynthesisResult:
        """Assemble the final SynthesisResult from meta-synthesis output.

        Args:
            meta: Parsed meta-synthesiser output dict.
            analyst_reports: Raw analyst reports for transparency.
            provenance: Expert provenance map.

        Returns:
            Populated SynthesisResult.
        """
        # Parse agreements
        agreements: list[Agreement] = []
        for a in meta.get("agreements", []):
            agreements.append(Agreement(
                claim=a.get("claim", ""),
                supporting_experts=a.get("supporting_experts", []),
                confidence=float(a.get("confidence", 0.5)),
                evidence_summary=a.get("evidence_summary", ""),
            ))

        # Parse disagreements
        disagreements: list[Disagreement] = []
        for d in meta.get("disagreements", []):
            disagreements.append(Disagreement(
                topic=d.get("topic", ""),
                positions=d.get("positions", []),
                severity=d.get("severity", "significant"),
            ))

        # Parse nuances
        nuances: list[Nuance] = []
        for n in meta.get("nuances", []):
            nuances.append(Nuance(
                claim=n.get("claim", ""),
                context=n.get("context", ""),
                relevant_experts=n.get("relevant_experts", []),
            ))

        # Clean analyst reports (remove raw output to reduce storage)
        clean_reports = []
        for r in analyst_reports:
            clean = {k: v for k, v in r.items() if k != "_raw_output"}
            clean_reports.append(clean)

        return SynthesisResult(
            agreements=agreements,
            disagreements=disagreements,
            nuances=nuances,
            confidence_map=meta.get("confidence_map", {}),
            follow_up_probes=[],  # populated later if ai_assisted
            provenance=provenance,
            analyst_reports=clean_reports,
            meta_synthesis_reasoning=meta.get("reasoning", ""),
        )
