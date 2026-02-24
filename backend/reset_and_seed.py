#!/usr/bin/env python3
"""
Nuke all existing forms and seed 10 rich government consultation forms
with varied states: different round counts, convergence arcs, responses,
and synthesis data — so the UI exercises every possible state.
"""
import sys, os

# ── Safety guard: prevent accidental execution ──
if os.environ.get("ALLOW_DB_RESET") != "yes-i-know-what-im-doing":
    print("ERROR: This script destroys all production data.")
    print("Set ALLOW_DB_RESET=yes-i-know-what-im-doing to proceed.")
    sys.exit(1)

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import json, uuid, random
from datetime import datetime, timedelta, timezone
from sqlalchemy import text
from core.models import FormModel, RoundModel, Response, SynthesisVersion
from core.db import SessionLocal
from core.auth import get_password_hash

random.seed(42)  # deterministic

# ─── Expert user IDs (already in DB) ─────────────────────────────────────────
# 9=prof.chen, 10=m.okonkwo, 11=j.mueller, 12=r.patel, 13=a.bergstrom,
# 14=d.thompson, 15=l.santos, 16=k.yamamoto, 17=e.oduya, 18=s.williams,
# 19=urd, 20=verdandi, 21=skuld, 22=dr.patel, 23=sarah.j, 24=marcus.t,
# 25=ai.policy, 26=cto, 27=prof.ethics, 28=director, 29=mp, 30=historian,
# 31=current.teacher, 32=futurist
EXPERT_IDS = list(range(9, 33))


def uid() -> str:
    return uuid.uuid4().hex[:8]


def days_ago(n: int) -> datetime:
    return datetime.now(timezone.utc) - timedelta(days=n)


# ─── Synthesis JSON builder ───────────────────────────────────────────────────

def make_synthesis(title: str, round_n: int, expert_ids: list, convergence: float) -> dict:
    """Generate a realistic synthesis_json structure."""
    topic_snippets = {
        "Education": {
            "agreements": [
                ("AI offers genuine value for personalised learning at scale", 0.9),
                ("Teacher oversight must remain central to any AI deployment", 0.85),
                ("Data privacy protections for minors require strengthened legislation", 0.78),
            ],
            "disagreements": [
                ("Extent to which AI tutoring can replace human mentorship",
                 ["AI can substitute for routine instruction", "Human relationship is irreplaceable in development"]),
                ("Whether algorithmic assessment tools are ready for high-stakes use",
                 ["Evidence base is sufficient with safeguards", "Too immature — risk of entrenching bias"]),
            ],
            "nuances": [
                "Effectiveness varies significantly by subject domain and age group",
                "Infrastructure inequality means AI benefits may not reach disadvantaged schools",
                "Teacher AI-literacy gap requires urgent investment before deployment at scale",
            ],
            "narrative": (
                f"Round {round_n} synthesis reveals broad agreement that AI presents meaningful "
                "opportunities for educational personalisation, while significant debate continues "
                "over deployment readiness and the irreducible value of human teaching relationships. "
                f"Expert convergence stands at {convergence:.0%}, with remaining divergence "
                "concentrated on high-stakes assessment use cases."
            ),
        },
        "Strategy": {
            "agreements": [
                ("Compute sovereignty is a strategic priority requiring public investment", 0.82),
                ("Regulatory fragmentation across departments creates unnecessary barriers", 0.76),
                ("The UK must prioritise AI safety research alongside capability development", 0.88),
            ],
            "disagreements": [
                ("Whether a dedicated AI ministry is warranted",
                 ["Cross-cutting nature demands dedicated institutional home", "Sector regulators already have domain expertise"]),
                ("Optimal balance between open and sovereign AI infrastructure",
                 ["Public cloud suffices with appropriate contracts", "Sovereign infrastructure essential for national security"]),
            ],
            "nuances": [
                "Timeline pressures from US and China make measured policymaking difficult",
                "Scottish and Welsh devolution creates additional coordination complexity",
            ],
            "narrative": (
                f"Round {round_n} surfaces strong consensus around compute investment and regulatory "
                "coordination as strategic imperatives. Experts diverge on institutional architecture "
                f"for delivering the strategy. Convergence score: {convergence:.0%}."
            ),
        },
        "Workforce": {
            "agreements": [
                ("Reskilling at scale requires sustained public funding over a decade", 0.84),
                ("Low-wage routine cognitive work faces the highest near-term displacement risk", 0.91),
                ("Existing social safety nets are inadequate for AI-driven labour transitions", 0.79),
            ],
            "disagreements": [
                ("Whether universal basic income is a viable response mechanism",
                 ["UBI provides necessary floor for transition period", "Targeted reskilling is more efficient and politically viable"]),
                ("Speed of displacement — gradual vs. acute shock",
                 ["Historical precedent suggests gradual adjustment is likely", "AI's pace of improvement makes acute disruption plausible"]),
            ],
            "nuances": [
                "Regional concentration of at-risk occupations demands place-based policy",
                "Gender and age dimensions of displacement risk are underweighted in current projections",
            ],
            "narrative": (
                f"Round {round_n} achieves high consensus on displacement risk profile and inadequacy "
                "of current safety nets. UBI debate remains unresolved. "
                f"Convergence: {convergence:.0%}."
            ),
        },
        "NHS": {
            "agreements": [
                ("Diagnostic imaging AI has the strongest current evidence base for clinical deployment", 0.93),
                ("Procurement frameworks must include mandatory real-world performance validation", 0.87),
                ("Clinician training and change management are as critical as the technology itself", 0.81),
            ],
            "disagreements": [
                ("Whether NHS should build internal AI capability or rely on vendor solutions",
                 ["Internal capability builds long-term resilience", "Vendor ecosystem innovation outpaces what NHS can build"]),
                ("Appropriate scope of AI in triage and patient-facing interactions",
                 ["AI triage can safely reduce A&E burden", "Patient trust and liability issues make this premature"]),
            ],
            "nuances": [
                "Interoperability with legacy EPR systems is a blocking constraint underestimated by vendors",
                "BAME health data underrepresentation in training sets creates safety-relevant bias risks",
            ],
            "narrative": (
                f"Round {round_n} consensus centres on imaging AI as the beachhead for NHS deployment, "
                "with procurement reform as a prerequisite. Internal vs. vendor debate reflects deeper "
                f"questions about NHS digital autonomy. Convergence: {convergence:.0%}."
            ),
        },
        "Safety": {
            "agreements": [
                ("Pre-deployment safety evaluations must be mandatory for frontier systems above a capability threshold", 0.89),
                ("Third-party auditing requires technical access that current voluntary frameworks do not guarantee", 0.83),
                ("International coordination is essential but must not delay domestic action", 0.77),
            ],
            "disagreements": [
                ("Whether capability thresholds for mandatory evaluation can be defined objectively",
                 ["Compute-based proxies are measurable and enforceable", "Capability thresholds require interpretability tools we lack"]),
                ("Role of government vs. industry in setting safety standards",
                 ["Government must set binding standards", "Industry technical lead is inevitable given expertise gap"]),
            ],
            "nuances": [
                "Defining 'frontier' is increasingly contested as capabilities diffuse rapidly",
                "Safety evaluation methodology itself requires research investment before mandating",
            ],
            "narrative": (
                f"Round {round_n} achieves strong consensus on mandatory pre-deployment evaluation "
                "in principle, with significant remaining disagreement on implementation. "
                f"Convergence: {convergence:.0%}."
            ),
        },
        "Open": {
            "agreements": [
                ("Open release accelerates research but creates irreversible proliferation risks at frontier scale", 0.74),
                ("A blanket policy — fully open or fully closed — is inappropriate across all model capability levels", 0.86),
                ("Staged release with third-party evaluation offers a viable middle path", 0.71),
            ],
            "disagreements": [
                ("Whether open weights provide net security benefit or risk",
                 ["Defenders benefit more than attackers from open access", "Concentration of capability in few actors is safer than wide proliferation"]),
                ("Appropriate threshold for restricting open release",
                 ["Only weapons-of-mass-destruction-adjacent capabilities warrant restriction", "Human-level performance in key domains should trigger review"]),
            ],
            "nuances": [
                "Geopolitical context makes this debate inseparable from industrial policy",
                "Enforcement mechanisms for conditional release remain technically underdeveloped",
            ],
            "narrative": (
                f"Round {round_n} reveals a nuanced expert landscape that rejects simple open/closed "
                "framing. Staged release with evaluation emerges as provisional consensus. "
                f"Convergence: {convergence:.0%}."
            ),
        },
        "Democratic": {
            "agreements": [
                ("Synthetic media attribution technology must be mandated for AI-generated political content", 0.88),
                ("Electoral advertising AI use requires real-time disclosure and spending limits", 0.82),
                ("Existing electoral law is inadequate for the AI disinformation threat landscape", 0.91),
            ],
            "disagreements": [
                ("Whether platform algorithmic amplification is a more serious risk than synthetic content creation",
                 ["Amplification at scale is the core threat", "Synthetic creation sets a new floor of deception difficulty"]),
                ("Appropriate role for government in mandating content moderation decisions",
                 ["Democratic legitimacy requires independent oversight, not government mandate", "Self-regulation has demonstrably failed — government must act"]),
            ],
            "nuances": [
                "Cross-border nature of platforms limits unilateral UK regulatory effectiveness",
                "Counter-disinformation tools risk chilling legitimate political speech",
            ],
            "narrative": (
                f"Round {round_n} surfaces strong consensus that current legislative frameworks are "
                "inadequate. Experts diverge on where to target intervention. "
                f"Convergence: {convergence:.0%}."
            ),
        },
        "Data": {
            "agreements": [
                ("Consent frameworks designed for direct data collection are poorly suited to AI training use", 0.85),
                ("Collective data governance mechanisms such as data trusts deserve serious policy attention", 0.73),
                ("Children's data warrants categorically stronger protections than adult data for AI training", 0.92),
            ],
            "disagreements": [
                ("Whether opt-in or opt-out should be the default for AI training data use",
                 ["Opt-in preserves meaningful consent", "Opt-out is necessary to maintain research viability"]),
                ("Economic rights in data — should individuals receive compensation for AI training use",
                 ["Data dignity requires remuneration", "Compensation schemes are administratively infeasible at scale"]),
            ],
            "nuances": [
                "GDPR's legitimate interest basis creates ambiguity that different jurisdictions resolve differently",
                "Public sector data is subject to different considerations than commercial data",
            ],
            "narrative": (
                f"Round {round_n} achieves consensus on consent framework inadequacy and children's "
                "data protection. Economic rights in data remain genuinely contested. "
                f"Convergence: {convergence:.0%}."
            ),
        },
        "Compute": {
            "agreements": [
                ("The UK cannot rely indefinitely on non-allied semiconductor supply chains for strategic AI compute", 0.86),
                ("Energy infrastructure is an underappreciated binding constraint on AI compute expansion", 0.79),
                ("Academic and public sector access to compute requires ring-fenced provision", 0.83),
            ],
            "disagreements": [
                ("Optimal level of public investment in sovereign compute",
                 ["£1B+ public programme is economically justified", "Market mechanisms are more efficient — target subsidies not ownership"]),
                ("Whether UK should seek EU compute infrastructure alignment post-Brexit",
                 ["EU Chips Act coordination would accelerate UK capability", "Strategic autonomy requires independence from EU frameworks"]),
            ],
            "nuances": [
                "Carbon footprint of large-scale compute is a long-term sustainability constraint",
                "Compute requirements are shifting rapidly — infrastructure locked in today may be obsolete in five years",
            ],
            "narrative": (
                f"Round {round_n} consensus on energy and access as constraints. Investment level "
                "and governance model remain contested. "
                f"Convergence: {convergence:.0%}."
            ),
        },
        "Regulation": {
            "agreements": [
                ("Risk-based tiering is superior to blanket horizontal AI regulation", 0.81),
                ("Regulatory capacity and technical expertise must be built before new powers are granted", 0.87),
                ("Adaptive review mechanisms are essential given the pace of AI development", 0.90),
            ],
            "disagreements": [
                ("Whether to converge with EU AI Act or pursue a distinct UK framework",
                 ["Regulatory alignment reduces compliance burden for UK companies", "UK-specific approach enables more innovation-friendly design"]),
                ("Appropriate penalty structure for high-risk AI violations",
                 ["GDPR-style revenue-based fines create appropriate deterrence", "Criminal liability for individual executives is necessary"]),
            ],
            "nuances": [
                "Regulatory arbitrage risk if UK framework is significantly lighter than EU",
                "SME compliance burden deserves dedicated sandboxing provisions",
            ],
            "narrative": (
                f"Round {round_n} consensus on risk-tiering and adaptive mechanisms. "
                "EU alignment question remains the most politically loaded unresolved issue. "
                f"Convergence: {convergence:.0%}."
            ),
        },
    }

    # Pick topic by keyword matching
    key = "Education"
    for k in topic_snippets:
        if k.lower() in title.lower():
            key = k
            break

    t = topic_snippets[key]
    n_experts = len(expert_ids)

    # agreements — matches TypeScript Agreement interface
    agreements = []
    for claim, score in t["agreements"]:
        supporting = random.sample(expert_ids, max(2, int(n_experts * score)))
        agreements.append({
            "claim": claim,
            "supporting_experts": supporting,           # number[], not string[]
            "confidence": round(score * convergence + random.uniform(-0.05, 0.05), 3),
            "evidence_summary": f"{len(supporting)} of {n_experts} experts supported this claim.",
            "evidence_excerpts": [],
        })

    # disagreements — matches TypeScript Disagreement / DisagreementPosition interface
    disagreements = []
    for topic, positions in t["disagreements"]:
        split = max(1, n_experts // 2)
        group_a = expert_ids[:split]
        group_b = expert_ids[split:] if len(expert_ids) > split else expert_ids[-1:]
        severity = "high" if convergence < 0.65 else ("medium" if convergence < 0.82 else "low")
        disagreements.append({
            "topic": topic,
            "positions": [
                {"position": positions[0], "experts": group_a,
                 "evidence": f"{len(group_a)} experts held this position."},
                {"position": positions[1], "experts": group_b,
                 "evidence": f"{len(group_b)} experts held this position."},
            ],
            "severity": severity,
        })

    # nuances — matches TypeScript Nuance interface
    nuances = [
        {
            "claim": obs,
            "context": "Raised by multiple experts as a complicating factor.",
            "relevant_experts": random.sample(expert_ids, max(1, n_experts // 3)),
        }
        for obs in t["nuances"]
    ]

    confidence_map = {str(e): round(random.uniform(0.6, 0.95), 2) for e in expert_ids}

    return {
        "agreements": agreements,
        "disagreements": disagreements,
        "nuances": nuances,
        "narrative": t["narrative"],
        "confidence_map": confidence_map,
        "follow_up_probes": [],
        "provenance": {"expert_count": n_experts, "round": round_n},
        "analyst_reports": [],
        "meta_synthesis_reasoning": f"Synthesised from {n_experts} expert responses in round {round_n}.",
        "claims_raw": None,
        "areas_of_agreement": [a["claim"] for a in agreements],
        "areas_of_disagreement": [d["topic"] for d in disagreements],
        "uncertainties": [n["claim"] for n in nuances[:1]],
        "emergent_insights": [],
        "minority_reports": [],
    }


def make_answers(questions: list, expert_pool: list, topic_keyword: str) -> dict:
    """Generate plausible text answers for a given question set."""
    snippets = {
        "Education": [
            "Personalised adaptive learning systems can significantly improve outcomes for students with diverse needs.",
            "The risk of algorithmic bias perpetuating existing inequalities must be central to any deployment framework.",
            "Teacher agency and oversight must be preserved — AI should augment, never replace, the pedagogical relationship.",
            "Data localisation requirements are essential to protect children's sensitive learning data.",
            "A tiered regulatory approach based on stakes is the right framework — treat assessment AI differently from practice tools.",
        ],
        "Strategy": [
            "Compute sovereignty and domestic research capacity are the twin pillars of a credible AI strategy.",
            "Regulatory fragmentation across DSIT, OFCOM, and sector regulators is the biggest structural barrier to effective governance.",
            "The UK's research base is a genuine competitive advantage that must be protected from talent drain.",
            "We need a whole-of-government coordination mechanism with teeth, not another advisory body.",
            "Safety and capability are complementary — framing them as a trade-off is a false dichotomy that weakens both.",
        ],
        "Workforce": [
            "Low-wage routine cognitive work faces near-term displacement that existing safety nets cannot absorb.",
            "Reskilling programmes must be sector-specific, long-term funded, and co-designed with trade unions.",
            "Universal basic income deserves serious evaluation as a transition floor — dismissing it is premature.",
            "Regional concentration of at-risk occupations demands place-based industrial policy, not one-size-fits-all retraining.",
            "The gender dimension of AI displacement is systematically underweighted in current policy modelling.",
        ],
        "NHS": [
            "Diagnostic imaging AI has the strongest evidence base and should be the first deployment priority.",
            "Procurement reform is a prerequisite — current frameworks cannot evaluate real-world clinical AI performance.",
            "Interoperability with legacy EPR systems is a blocking technical constraint that vendors consistently underestimate.",
            "Clinician training and change management are as critical as the technology — skimping here guarantees failure.",
            "BAME data underrepresentation in training sets creates safety-relevant bias that must be explicitly tested.",
        ],
        "Safety": [
            "Mandatory pre-deployment evaluation above a capability threshold is the minimum viable safety governance.",
            "Third-party auditing requires technical access that current voluntary frameworks cannot guarantee.",
            "Defining capability thresholds is harder than it sounds — compute proxies are measurable but imperfect.",
            "International coordination is essential but cannot be a reason to delay domestic action.",
            "The safety evaluation methodology itself needs R&D investment — we cannot mandate what we cannot perform.",
        ],
        "Open": [
            "Open release accelerates research but creates irreversible proliferation risks at frontier scale.",
            "A blanket policy is incoherent across capability levels — staged release with evaluation is the right framing.",
            "Defenders benefit from open access, but so do sophisticated adversaries — the net calculation is genuinely uncertain.",
            "Enforcement mechanisms for conditional release are technically underdeveloped — this limits policy options.",
            "Geopolitical context makes this debate inseparable from industrial policy and democratic values.",
        ],
        "Democratic": [
            "Synthetic media attribution technology must be mandated for AI-generated political content immediately.",
            "Existing electoral law is categorically inadequate for the AI disinformation threat landscape.",
            "Platform algorithmic amplification is the core threat — synthetic content creation is downstream of that.",
            "Government mandating content moderation decisions creates democratic legitimacy risks equal to the original threat.",
            "Cross-border platform jurisdiction limits unilateral UK effectiveness — EU coordination is essential.",
        ],
        "Data": [
            "Consent frameworks designed for direct data collection are poorly suited to AI training use — reform is overdue.",
            "Collective data governance through data trusts deserves serious policy attention, not just academic discussion.",
            "Children's data warrants categorically stronger protection — the current approach is inadequate.",
            "Opt-in should be the default for AI training use — meaningful consent requires active affirmation.",
            "Economic rights in data are philosophically compelling but administratively infeasible at scale.",
        ],
        "Compute": [
            "The UK cannot rely indefinitely on non-allied semiconductor supply chains for strategic AI compute.",
            "Energy infrastructure is an underappreciated binding constraint — planning law is the real blocker.",
            "Academic and public sector access needs ring-fenced provision, not just market access on commercial terms.",
            "A £1B+ public compute programme is economically justified given the strategic stakes.",
            "Carbon footprint is a genuine long-term constraint that current compute expansion plans underweight.",
        ],
        "Regulation": [
            "Risk-based tiering is clearly superior to blanket horizontal regulation — the EU AI Act's structure is instructive.",
            "Regulatory capacity must be built before new powers are granted — technical expertise is the binding constraint.",
            "Adaptive review mechanisms are essential given the pace of AI development — sunset clauses should be standard.",
            "EU alignment reduces compliance burden but requires accepting frameworks we had no part in designing.",
            "SME compliance burden needs dedicated sandboxing provisions — one-size-fits-all kills innovation.",
        ],
    }

    key = "Education"
    for k in snippets:
        if k.lower() in topic_keyword.lower():
            key = k
            break

    pool = snippets[key]
    answers = {}
    for q in questions:
        qid = q["id"]
        if q["type"] == "textarea":
            # pick a random snippet + pad it
            base = random.choice(pool)
            answers[qid] = base + " " + random.choice(pool)
        elif q["type"] == "select" and q.get("options"):
            answers[qid] = random.choice(q["options"])
    return answers


# ─── Form definitions: title + round plan ────────────────────────────────────
#
# round_plan entries:
#   n_responses  — how many expert responses to create
#   convergence  — float 0–1 (None = no synthesis yet)
#   flow_mode    — "human_only" | "ai_assisted" | "ai_led"
#   is_active    — whether this is the current open round

FORMS = [
    # 1. Single round, empty — pristine state
    {
        "title": "AI in Education: Risks, Opportunities & Safeguards",
        "questions": [
            {"id": "q1", "type": "textarea", "label": "What opportunities does AI present for improving UK educational outcomes?", "required": True},
            {"id": "q2", "type": "textarea", "label": "What risks does AI pose to students, teachers, and educational integrity?", "required": True},
            {"id": "q3", "type": "textarea", "label": "What safeguards should government mandate for AI systems in schools?", "required": True},
            {"id": "q4", "type": "select", "label": "Should AI tutoring systems be permitted in state schools?",
             "options": ["Yes, with light regulation", "Yes, with strict oversight", "Only for specific subjects", "No, too risky"], "required": True},
        ],
        "round_plan": [
            {"n_responses": 0, "convergence": None, "flow_mode": "human_only", "is_active": True},
        ],
    },
    # 2. Single round, 4 responses, no synthesis yet
    {
        "title": "National AI Strategy: Priorities for 2025–2030",
        "questions": [
            {"id": "q1", "type": "textarea", "label": "What should be the UK's top three AI policy priorities for the next five years?", "required": True},
            {"id": "q2", "type": "textarea", "label": "How should the UK balance AI innovation with safety and ethical considerations?", "required": True},
            {"id": "q3", "type": "textarea", "label": "What institutional changes are needed to deliver an effective national AI strategy?", "required": True},
            {"id": "q4", "type": "select", "label": "What is the UK's biggest AI competitiveness risk?",
             "options": ["Regulatory over-reach", "Under-investment in compute", "Talent drain", "Fragmented governance", "Public trust deficit"], "required": True},
        ],
        "round_plan": [
            {"n_responses": 4, "convergence": None, "flow_mode": "human_only", "is_active": True},
        ],
    },
    # 3. Single round, 7 responses, synthesis done — moderate convergence
    {
        "title": "Workforce Transition: Preparing for AI-Driven Economic Change",
        "questions": [
            {"id": "q1", "type": "textarea", "label": "Which sectors face the greatest near-term displacement risk from AI automation?", "required": True},
            {"id": "q2", "type": "textarea", "label": "What reskilling and lifelong learning infrastructure does the UK need to build?", "required": True},
            {"id": "q3", "type": "textarea", "label": "How should income support systems adapt to AI-driven labour market shifts?", "required": True},
            {"id": "q4", "type": "select", "label": "What is the most important lever for managing AI-driven workforce disruption?",
             "options": ["Retraining programmes", "Universal basic income", "Sector-specific transition funds", "Slow adoption via regulation", "Work-sharing schemes"], "required": True},
        ],
        "round_plan": [
            {"n_responses": 7, "convergence": 0.63, "flow_mode": "human_only", "is_active": True},
        ],
    },
    # 4. Two rounds — R1 complete (low convergence), R2 active with 3 responses
    {
        "title": "AI in Public Services: NHS Implementation Framework",
        "questions": [
            {"id": "q1", "type": "textarea", "label": "Where in the NHS pathway does AI offer the highest-value near-term opportunities?", "required": True},
            {"id": "q2", "type": "textarea", "label": "What are the key barriers to responsible AI adoption in NHS clinical settings?", "required": True},
            {"id": "q3", "type": "textarea", "label": "How should the NHS approach procurement and evaluation of clinical AI systems?", "required": True},
            {"id": "q4", "type": "select", "label": "What should be the primary criterion for approving a clinical AI system?",
             "options": ["Clinical efficacy evidence", "Cost-effectiveness", "Explainability to clinicians", "Patient consent mechanisms", "Interoperability with NHS systems"], "required": True},
        ],
        "round_plan": [
            {"n_responses": 6, "convergence": 0.52, "flow_mode": "human_only", "is_active": False},
            {"n_responses": 3, "convergence": None, "flow_mode": "human_only", "is_active": True},
        ],
    },
    # 5. Two rounds — both complete, convergence arc (0.68 → 0.84)
    {
        "title": "Frontier AI Safety: Governance Frameworks for Advanced Systems",
        "questions": [
            {"id": "q1", "type": "textarea", "label": "What technical safety requirements should be mandatory before deploying frontier AI models?", "required": True},
            {"id": "q2", "type": "textarea", "label": "How should international coordination on frontier AI safety be structured?", "required": True},
            {"id": "q3", "type": "textarea", "label": "What role should mandatory third-party audits play in frontier AI governance?", "required": True},
            {"id": "q4", "type": "select", "label": "Which governance mechanism would most improve frontier AI safety?",
             "options": ["Mandatory pre-deployment evaluations", "International treaty framework", "Liability regime for developers", "Compute access controls", "Whistleblower protections"], "required": True},
        ],
        "round_plan": [
            {"n_responses": 8, "convergence": 0.68, "flow_mode": "human_only", "is_active": False},
            {"n_responses": 7, "convergence": 0.84, "flow_mode": "ai_assisted", "is_active": True},
        ],
    },
    # 6. Three rounds — full convergence arc (0.55 → 0.73 → 0.91), R3 active with responses
    {
        "title": "Open vs Closed AI: Policy Implications of Model Release Strategies",
        "questions": [
            {"id": "q1", "type": "textarea", "label": "What are the key risks and benefits of open-weight model releases vs closed API access?", "required": True},
            {"id": "q2", "type": "textarea", "label": "Under what conditions should government restrict open release of AI model weights?", "required": True},
            {"id": "q3", "type": "textarea", "label": "How should policymakers evaluate the security implications of open-source AI?", "required": True},
            {"id": "q4", "type": "select", "label": "What is your overall position on open-weight model releases?",
             "options": ["Strongly support open release", "Support with safety caveats", "Case-by-case evaluation required", "Prefer restricted access for frontier models", "Oppose open release of powerful models"], "required": True},
        ],
        "round_plan": [
            {"n_responses": 8, "convergence": 0.55, "flow_mode": "human_only", "is_active": False},
            {"n_responses": 8, "convergence": 0.73, "flow_mode": "ai_assisted", "is_active": False},
            {"n_responses": 5, "convergence": 0.91, "flow_mode": "ai_assisted", "is_active": True},
        ],
    },
    # 7. Single round, 6 responses, high-convergence synthesis, AI-assisted
    {
        "title": "AI & Democratic Integrity: Disinformation, Elections and Public Discourse",
        "questions": [
            {"id": "q1", "type": "textarea", "label": "How is AI changing the disinformation threat to democratic processes?", "required": True},
            {"id": "q2", "type": "textarea", "label": "What obligations should AI companies have regarding political advertising and synthetic media?", "required": True},
            {"id": "q3", "type": "textarea", "label": "What technical and regulatory measures would most effectively protect electoral integrity?", "required": True},
            {"id": "q4", "type": "select", "label": "What is the most urgent AI-related threat to democratic integrity?",
             "options": ["Synthetic media / deepfakes", "Micro-targeted disinformation at scale", "Automated influence operations", "Algorithmic filter bubbles", "AI-assisted voter suppression"], "required": True},
        ],
        "round_plan": [
            {"n_responses": 6, "convergence": 0.88, "flow_mode": "ai_assisted", "is_active": True},
        ],
    },
    # 8. Two rounds — R1 complete AI-led (high convergence), R2 active empty
    {
        "title": "Data Governance for AI: Privacy, Consent and the Public Interest",
        "questions": [
            {"id": "q1", "type": "textarea", "label": "How should the UK update its data governance framework to address AI training data requirements?", "required": True},
            {"id": "q2", "type": "textarea", "label": "What rights should individuals have over how their data is used to train AI systems?", "required": True},
            {"id": "q3", "type": "textarea", "label": "How should tensions between data access for AI innovation and privacy rights be resolved?", "required": True},
            {"id": "q4", "type": "select", "label": "Which data governance reform is most urgent for AI?",
             "options": ["Mandatory consent for AI training use", "Data trusts and collective licensing", "Strengthened subject access rights", "International data transfer controls", "Public sector data commons"], "required": True},
        ],
        "round_plan": [
            {"n_responses": 5, "convergence": 0.77, "flow_mode": "ai_led", "is_active": False},
            {"n_responses": 0, "convergence": None, "flow_mode": "human_only", "is_active": True},
        ],
    },
    # 9. Three rounds — R1 & R2 complete, R3 active with 4 responses (still collecting)
    {
        "title": "AI Compute Infrastructure: Sovereign Capability and Supply Chain Risk",
        "questions": [
            {"id": "q1", "type": "textarea", "label": "What level of sovereign AI compute capacity does the UK need to maintain strategic independence?", "required": True},
            {"id": "q2", "type": "textarea", "label": "How should the UK manage supply chain dependencies on non-allied semiconductor manufacturers?", "required": True},
            {"id": "q3", "type": "textarea", "label": "What is the right balance between public investment in compute and private sector provision?", "required": True},
            {"id": "q4", "type": "select", "label": "What is the most critical compute infrastructure risk for UK AI development?",
             "options": ["Semiconductor supply chain concentration", "Energy constraints on data centres", "Lack of sovereign cloud capability", "Export controls limiting access", "Cost barriers for academic researchers"], "required": True},
        ],
        "round_plan": [
            {"n_responses": 7, "convergence": 0.61, "flow_mode": "human_only", "is_active": False},
            {"n_responses": 7, "convergence": 0.76, "flow_mode": "ai_assisted", "is_active": False},
            {"n_responses": 4, "convergence": None, "flow_mode": "human_only", "is_active": True},
        ],
    },
    # 10. Single round, 5 responses, medium convergence synthesis
    {
        "title": "AI Regulation Design: Principles for an Adaptive Regulatory Framework",
        "questions": [
            {"id": "q1", "type": "textarea", "label": "What principles should underpin a UK AI regulatory framework that remains effective as technology evolves?", "required": True},
            {"id": "q2", "type": "textarea", "label": "How should regulatory responsibility be divided between sector-specific regulators and a central AI authority?", "required": True},
            {"id": "q3", "type": "textarea", "label": "What enforcement mechanisms are needed to make AI regulation effective rather than performative?", "required": True},
            {"id": "q4", "type": "select", "label": "Which regulatory model should the UK adopt?",
             "options": ["Sector-specific rules via existing regulators", "Horizontal cross-sector AI Act (EU-style)", "Principles-based self-regulation", "Risk-tiered mandatory licensing", "Regulatory sandboxes with light-touch rules"], "required": True},
        ],
        "round_plan": [
            {"n_responses": 5, "convergence": 0.71, "flow_mode": "human_only", "is_active": True},
        ],
    },
]


def reset_and_seed():
    db = SessionLocal()
    try:
        # ── 1. Wipe all form-related data ─────────────────────────────────
        print("Wiping all form-related data...")
        for table in [
            "synthesis_comments", "synthesis_versions",
            "follow_up_responses", "follow_ups",
            "archived_responses", "responses",
            "feedback", "user_form_unlocks",
            "rounds", "forms",
        ]:
            db.execute(text(f"DELETE FROM {table}"))
            print(f"    cleared {table}")
        db.commit()
        print("  ✓ All cleared\n")

        # ── 2. Create forms ───────────────────────────────────────────────
        print(f"Seeding {len(FORMS)} forms with varied states...\n")
        for i, spec in enumerate(FORMS, 1):
            join_code = uid()
            form = FormModel(
                title=spec["title"],
                questions=spec["questions"],
                allow_join=True,
                join_code=join_code,
            )
            db.add(form)
            db.flush()

            plan = spec["round_plan"]
            n_rounds = len(plan)
            topic_kw = spec["title"].split(":")[0].split()[0]  # "AI", "National", etc. - use title keyword

            # pick expert pool for this form (8–12 experts from pool)
            pool_size = random.randint(8, min(12, len(EXPERT_IDS)))
            expert_pool = random.sample(EXPERT_IDS, pool_size)
            # track which users have submitted in prior rounds (for archived responses)
            submitted_users: set = set()

            for r_idx, rp in enumerate(plan):
                round_n = r_idx + 1
                syn_json = None
                syn_text = None
                conv_score = rp["convergence"]

                # Build synthesis if convergence is provided
                if conv_score is not None:
                    n_resp_for_synth = rp["n_responses"]
                    synth_experts = expert_pool[:n_resp_for_synth] if n_resp_for_synth else expert_pool[:4]
                    syn_json = make_synthesis(spec["title"], round_n, synth_experts, conv_score)
                    syn_text = syn_json["narrative"]

                round_obj = RoundModel(
                    form_id=form.id,
                    round_number=round_n,
                    is_active=rp["is_active"],
                    questions=spec["questions"],
                    synthesis=syn_text,
                    synthesis_json=syn_json,
                    flow_mode=rp["flow_mode"],
                    convergence_score=conv_score,
                )
                db.add(round_obj)
                db.flush()

                # Create a SynthesisVersion if synthesis exists
                if syn_json is not None:
                    sv = SynthesisVersion(
                        round_id=round_obj.id,
                        version=1,
                        synthesis=syn_text,
                        synthesis_json=syn_json,
                        model_used="openrouter/anthropic/claude-3.5-sonnet",
                        strategy=rp["flow_mode"],
                        created_at=days_ago(n_rounds - r_idx + 1),
                        is_active=True,
                    )
                    db.add(sv)

                # Archive previous round's users before creating new responses
                if r_idx > 0 and submitted_users:
                    for uid_prev in submitted_users:
                        prev_round_id = round_obj.id - 1  # rough
                        db.execute(text(
                            "INSERT INTO archived_responses (form_id, user_id, email, answers, created_at, round_id) "
                            "SELECT form_id, user_id, '', answers, created_at, round_id "
                            "FROM responses WHERE form_id=:fid AND user_id=:uid"
                        ), {"fid": form.id, "uid": uid_prev})

                # Create responses for this round
                n_resp = rp["n_responses"]
                resp_experts = expert_pool[:n_resp]
                new_submitted = set()
                for exp_uid in resp_experts:
                    answers = make_answers(spec["questions"], expert_pool, spec["title"])
                    resp = Response(
                        form_id=form.id,
                        user_id=exp_uid,
                        round_id=round_obj.id,
                        answers=answers,
                        created_at=days_ago(n_rounds - r_idx + random.uniform(0, 2)),
                        version=1,
                    )
                    db.add(resp)
                    new_submitted.add(exp_uid)
                submitted_users = new_submitted

            rounds_desc = []
            for r_idx, rp in enumerate(plan):
                desc = f"R{r_idx+1}({'active' if rp['is_active'] else 'closed'}, {rp['n_responses']}resp"
                if rp["convergence"]:
                    desc += f", conv={rp['convergence']:.0%}"
                desc += ")"
                rounds_desc.append(desc)

            print(f"  [{i:2d}] {spec['title'][:52]}  code={join_code}")
            print(f"        {' → '.join(rounds_desc)}")

        db.commit()
        print(f"\n✓ Done. {len(FORMS)} forms seeded.")

    except Exception as e:
        db.rollback()
        print(f"\nERROR: {e}")
        import traceback; traceback.print_exc()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    reset_and_seed()
