from dataclasses import dataclass
from enum import Enum
from typing import List, Dict, Any
import json

# OpenRouter-only synthesis path (no Anthropic token pools)

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
    positions: List[Dict[str, Any]]  # {"position": str, "experts": List[int], "evidence": str}
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

class OpenRouterClient:
    def __init__(self, model: str = "anthropic/claude-opus-4-6", base_url: str = "https://openrouter.ai/api/v1"):
        import os
        self.model = model
        self.api_key = os.getenv("OPENROUTER_API_KEY")
        from openai import OpenAI
        self.client = OpenAI(api_key=self.api_key, base_url=base_url)

    def _call(self, prompt: str) -> str:
        resp = self.client.chat.completions.create(
            model=self.model,
            messages=[
                {"role": "system", "content": "You are an analyst that outputs structured JSON for synthesis results."},
                {"role": "user", "content": prompt},
            ],
        )
        if not resp or not getattr(resp, choices, None) or not resp.choices:
            raise RuntimeError("OpenRouter returned no choices")
        content = resp.choices[0].message.content
        return content

class OpenRouterSynthesis:
    def __init__(self, analysts: int = 3, model: str = "anthropic/claude-opus-4-6"):
        self.analysts = int(analysts)
        self.model = model
        self.client = OpenRouterClient(model=model)

    def _build_analyst_prompt(self, idx: int, questions: List[Dict[str, Any]], responses: List[Dict[str, Any]], mode: FlowMode) -> str:
        prompt = f"You are Analyst #{idx+1}. Review the following expert responses and questions. Provide agreements, disagreements, and nuanced points. Do not take a side."
        prompt += "\n\nQuestions:\n"
        for i, q in enumerate(questions, 1):
            prompt += f"{i}. {q.get(text,)}\n"
        prompt += "\nResponses:\n"
        for i, r in enumerate(responses, 1):
            prompt += f"Response {i}:\n"
            for k, v in (r or {}).items():
                prompt += f"- {k}: {v}\n"
        if mode == FlowMode.AI_ASSISTED:
            prompt += "\nFollow-up probes may be requested to sharpen disagreements and strengthen alignments."
        return prompt

    def run(self, questions: List[Dict[str, Any]], responses: List[Dict[str, Any]], mode: FlowMode = FlowMode.HUMAN_ONLY) -> SynthesisResult:
        prompts = [self._build_analyst_prompt(i, questions, responses, mode) for i in range(self.analysts)]
        analyst_reports = []
        results = []
        agreements = []
        disagreements = []
        nuances = []
        for idx, prompt in enumerate(prompts):
            try:
                content = self.client._call(prompt)
                payload = json.loads(content) if isinstance(content, str) else content
                analyst_reports.append({"index": idx, "payload": payload})
            except Exception as e:
                analyst_reports.append({"index": idx, "error": str(e)})
                payload = {"agreements": [], "disagreements": [], "nuances": []}
            results.append(payload)
        for p in results:
            agreements.extend(p.get("agreements", []))
            disagreements.extend(p.get("disagreements", []))
            nuances.extend(p.get("nuances", []))
        provenance = {f"analyst_{i}": {"count": len(results[i].get(agreements, []))} for i in range(len(results))}
        synthesis = SynthesisResult(
            agreements=[Agreement(**a) for a in agreements],
            disagreements=[Disagreement(**d) for d in disagreements],
            nuances=[Nuance(**n) for n in nuances],
            confidence_map={},
            follow_up_probes=[],
            provenance=provenance,
            analyst_reports=analyst_reports,
            meta_synthesis_reasoning="OpenRouter-only synthesis pass"
        )
        return synthesis

# Backwards-compat helper
def make_openrouter_synthesis(analysts: int = 3, model: str = "anthropic/claude-opus-4-6") -> OpenRouterSynthesis:
    return OpenRouterSynthesis(analysts=analysts, model=model)

# Backwards compatibility alias
CommitteeSynthesiser = OpenRouterSynthesis

