"""Pre-built form templates for quick Delphi consultation creation.

Each template provides a complete starting point: title pattern, description,
default questions, expert label presets, and suggested panel size.
"""

from __future__ import annotations

from dataclasses import dataclass, field, asdict
from typing import List


@dataclass
class FormTemplate:
    """A pre-built template for creating Delphi consultation forms."""

    id: str
    name: str
    description: str
    icon: str  # emoji
    category: str
    suggested_panel_size: int
    default_questions: List[str]
    expert_label_preset: dict  # {"preset": "custom", "custom_labels": {...}}
    tags: List[str] = field(default_factory=list)

    def to_dict(self) -> dict:
        return asdict(self)


# ---------------------------------------------------------------------------
# Template definitions
# ---------------------------------------------------------------------------

TEMPLATES: dict[str, FormTemplate] = {}


def _register(t: FormTemplate) -> FormTemplate:
    TEMPLATES[t.id] = t
    return t


# ── 1. Policy Delphi ─────────────────────────────────────────────────────────

_register(
    FormTemplate(
        id="policy_delphi",
        name="Policy Delphi",
        description="Evaluate policy proposals through structured expert deliberation on impact, feasibility, stakeholder acceptance, and implementation timelines.",
        icon="🏛️",
        category="Governance",
        suggested_panel_size=8,
        default_questions=[
            "What are the most significant potential impacts — both positive and negative — of this policy proposal?",
            "How feasible is implementation within the current institutional and regulatory landscape?",
            "Which stakeholder groups are most likely to support or resist this policy, and why?",
            "What is a realistic implementation timeline, and what are the critical milestones?",
            "What unintended consequences should policymakers anticipate, and how might they be mitigated?",
        ],
        expert_label_preset={
            "preset": "custom",
            "custom_labels": {
                "1": "Policy Analyst",
                "2": "Domain Expert",
                "3": "Stakeholder Rep",
            },
        },
        tags=["policy", "governance", "public sector"],
    )
)

# ── 2. Technology Assessment ─────────────────────────────────────────────────

_register(
    FormTemplate(
        id="technology_assessment",
        name="Technology Assessment",
        description="Assess emerging technologies through expert evaluation of technical feasibility, maturity, adoption barriers, and competitive landscape.",
        icon="🔬",
        category="Technology",
        suggested_panel_size=6,
        default_questions=[
            "How would you rate the current technical maturity of this technology, and what evidence supports your assessment?",
            "What are the most significant technical barriers to real-world deployment at scale?",
            "What adoption barriers exist beyond the purely technical — organisational, cultural, regulatory?",
            "How does this technology compare to existing alternatives in terms of cost, performance, and risk?",
            "What is the likely trajectory of this technology over the next 3–5 years?",
        ],
        expert_label_preset={
            "preset": "custom",
            "custom_labels": {
                "1": "Technical Expert",
                "2": "Industry Analyst",
                "3": "End User",
            },
        },
        tags=["technology", "innovation", "R&D"],
    )
)

# ── 3. Risk Analysis ─────────────────────────────────────────────────────────

_register(
    FormTemplate(
        id="risk_analysis",
        name="Risk Analysis",
        description="Systematically identify and evaluate risks through expert assessment of likelihood, impact severity, mitigation strategies, and residual risk.",
        icon="⚠️",
        category="Risk & Compliance",
        suggested_panel_size=7,
        default_questions=[
            "What are the most critical risks associated with this initiative, and how would you rank them by likelihood?",
            "For each major risk, what is the potential impact severity if it materialises?",
            "What mitigation strategies would you recommend, and how effective do you expect each to be?",
            "After mitigation, what residual risks remain, and are they acceptable?",
            "Are there emerging or tail risks that may not be on the current radar but could be significant?",
        ],
        expert_label_preset={
            "preset": "custom",
            "custom_labels": {
                "1": "Risk Analyst",
                "2": "Subject Matter Expert",
                "3": "Decision Maker",
            },
        },
        tags=["risk", "compliance", "due diligence"],
    )
)

# ── 4. Market Research ────────────────────────────────────────────────────────

_register(
    FormTemplate(
        id="market_research",
        name="Market Research",
        description="Gather expert consensus on market dynamics — sizing, customer needs, competitive positioning, and pricing strategy.",
        icon="📊",
        category="Business",
        suggested_panel_size=6,
        default_questions=[
            "How would you estimate the total addressable market, and what are the key assumptions behind your estimate?",
            "What are the most important unmet customer needs in this space?",
            "Who are the strongest competitors, and what sustainable advantages do they hold?",
            "What pricing model and range would be most appropriate for this market, and why?",
            "What market trends or shifts could significantly change the opportunity landscape in the next 2–3 years?",
        ],
        expert_label_preset={
            "preset": "custom",
            "custom_labels": {
                "1": "Market Analyst",
                "2": "Customer Representative",
                "3": "Industry Expert",
            },
        },
        tags=["market", "business", "strategy"],
    )
)

# ── 5. Academic Peer Review ───────────────────────────────────────────────────

_register(
    FormTemplate(
        id="academic_peer_review",
        name="Academic Peer Review",
        description="Structure scholarly peer review around methodology, validity, significance, novelty, and replicability.",
        icon="🎓",
        category="Academic",
        suggested_panel_size=3,
        default_questions=[
            "How sound is the methodology? Are the research design and methods appropriate for the stated objectives?",
            "How valid and reliable are the findings? Are the conclusions supported by the evidence presented?",
            "What is the significance and contribution of this work to the field?",
            "How novel is the approach or findings? Does it advance the state of the art?",
            "Could this study be replicated? Is sufficient detail provided for reproducibility?",
            "What are the most important limitations, and how do they affect the conclusions?",
        ],
        expert_label_preset={
            "preset": "custom",
            "custom_labels": {
                "1": "Reviewer 1",
                "2": "Reviewer 2",
                "3": "Reviewer 3",
            },
        },
        tags=["academic", "research", "peer review"],
    )
)

# ── 6. Strategic Planning ────────────────────────────────────────────────────

_register(
    FormTemplate(
        id="strategic_planning",
        name="Strategic Planning",
        description="Facilitate strategic alignment through expert deliberation on objectives, SWOT analysis, resource allocation, and key performance indicators.",
        icon="🎯",
        category="Strategy",
        suggested_panel_size=5,
        default_questions=[
            "What should be the top 3 strategic objectives for the next 12–18 months, and why?",
            "What are the most significant internal strengths and weaknesses relevant to these objectives?",
            "What external opportunities and threats should shape our strategic direction?",
            "How should resources (budget, people, time) be allocated across strategic priorities?",
            "What KPIs would best measure progress toward these objectives, and what targets are realistic?",
        ],
        expert_label_preset={
            "preset": "custom",
            "custom_labels": {
                "1": "Strategist",
                "2": "Operations Lead",
                "3": "Finance Lead",
            },
        },
        tags=["strategy", "planning", "leadership"],
    )
)

# ── 7. Ethical Review ─────────────────────────────────────────────────────────

_register(
    FormTemplate(
        id="ethical_review",
        name="Ethical Review",
        description="Evaluate proposals through ethical lenses — fairness, transparency, harm potential, consent, and societal impact.",
        icon="⚖️",
        category="Ethics",
        suggested_panel_size=5,
        default_questions=[
            "What ethical principles are most relevant to this proposal, and are any in tension with each other?",
            "Who could be harmed by this initiative, and how severe could that harm be?",
            "Are issues of fairness, equity, and inclusion adequately addressed?",
            "Is there sufficient transparency and informed consent in the proposed approach?",
            "What safeguards or governance mechanisms would you recommend to address ethical concerns?",
        ],
        expert_label_preset={
            "preset": "custom",
            "custom_labels": {
                "1": "Ethicist",
                "2": "Domain Expert",
                "3": "Community Representative",
            },
        },
        tags=["ethics", "governance", "responsible innovation"],
    )
)


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


def list_templates() -> list[dict]:
    """Return all templates as dicts, sorted by category then name."""
    return sorted(
        [t.to_dict() for t in TEMPLATES.values()],
        key=lambda t: (t["category"], t["name"]),
    )


def get_template(template_id: str) -> FormTemplate | None:
    """Get a template by ID, or None if not found."""
    return TEMPLATES.get(template_id)
