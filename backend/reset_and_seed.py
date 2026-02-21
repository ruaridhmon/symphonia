#!/usr/bin/env python3
"""
Nuke all existing forms and seed 10 fresh government consultation forms.
Keeps all users intact.
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import json, uuid
from sqlalchemy import text
from core.models import FormModel, RoundModel, Response
from core.db import SessionLocal

# ─── 10 Consultation definitions ─────────────────────────────────────────────

FORMS = [
    {
        "title": "AI in Education: Risks, Opportunities & Safeguards",
        "questions": [
            {"id": "q1", "type": "textarea", "label": "What are the primary opportunities AI presents for improving educational outcomes in the UK?", "required": True},
            {"id": "q2", "type": "textarea", "label": "What risks does AI pose to students, teachers, and the integrity of education?", "required": True},
            {"id": "q3", "type": "textarea", "label": "What safeguards should government mandate for AI systems used in schools?", "required": True},
            {"id": "q4", "type": "select", "label": "Should AI tutoring systems be permitted in state schools?",
             "options": ["Yes, with light regulation", "Yes, with strict oversight", "Only for specific subjects", "No, too risky at this stage"], "required": True},
        ],
    },
    {
        "title": "National AI Strategy: Priorities for 2025–2030",
        "questions": [
            {"id": "q1", "type": "textarea", "label": "What should be the UK's top three AI policy priorities for the next five years?", "required": True},
            {"id": "q2", "type": "textarea", "label": "How should the UK balance AI innovation with safety and ethical considerations?", "required": True},
            {"id": "q3", "type": "textarea", "label": "What institutional changes are needed to deliver an effective national AI strategy?", "required": True},
            {"id": "q4", "type": "select", "label": "What is the UK's biggest AI competitiveness risk?",
             "options": ["Regulatory over-reach", "Under-investment in compute", "Talent drain", "Fragmented governance", "Public trust deficit"], "required": True},
        ],
    },
    {
        "title": "Workforce Transition: Preparing for AI-Driven Economic Change",
        "questions": [
            {"id": "q1", "type": "textarea", "label": "Which sectors and occupations face the greatest near-term displacement risk from AI automation?", "required": True},
            {"id": "q2", "type": "textarea", "label": "What reskilling and lifelong learning infrastructure does the UK need to build?", "required": True},
            {"id": "q3", "type": "textarea", "label": "How should income support and social protection systems adapt to AI-driven labour market shifts?", "required": True},
            {"id": "q4", "type": "select", "label": "What is the most important lever for managing AI-driven workforce disruption?",
             "options": ["Retraining programmes", "Universal basic income", "Sector-specific transition funds", "Slowing adoption via regulation", "New forms of work-sharing"], "required": True},
        ],
    },
    {
        "title": "AI in Public Services: NHS Implementation Framework",
        "questions": [
            {"id": "q1", "type": "textarea", "label": "Where in the NHS pathway does AI offer the highest-value near-term opportunities?", "required": True},
            {"id": "q2", "type": "textarea", "label": "What are the key barriers to responsible AI adoption in NHS clinical settings?", "required": True},
            {"id": "q3", "type": "textarea", "label": "How should the NHS approach procurement and evaluation of clinical AI systems?", "required": True},
            {"id": "q4", "type": "select", "label": "What should be the primary criterion for approving a clinical AI system?",
             "options": ["Clinical efficacy evidence", "Cost-effectiveness", "Explainability to clinicians", "Patient consent mechanisms", "Interoperability with NHS systems"], "required": True},
        ],
    },
    {
        "title": "Frontier AI Safety: Governance Frameworks for Advanced Systems",
        "questions": [
            {"id": "q1", "type": "textarea", "label": "What technical safety requirements should be mandatory before deploying frontier AI models?", "required": True},
            {"id": "q2", "type": "textarea", "label": "How should international coordination on frontier AI safety be structured?", "required": True},
            {"id": "q3", "type": "textarea", "label": "What role should mandatory third-party audits play in frontier AI governance?", "required": True},
            {"id": "q4", "type": "select", "label": "Which governance mechanism would most improve frontier AI safety?",
             "options": ["Mandatory pre-deployment evaluations", "International treaty framework", "Liability regime for developers", "Government compute access controls", "Whistleblower protections"], "required": True},
        ],
    },
    {
        "title": "Open vs Closed AI: Policy Implications of Model Release Strategies",
        "questions": [
            {"id": "q1", "type": "textarea", "label": "What are the key risks and benefits of open-weight model releases compared to closed API access?", "required": True},
            {"id": "q2", "type": "textarea", "label": "Under what conditions, if any, should government restrict open release of AI model weights?", "required": True},
            {"id": "q3", "type": "textarea", "label": "How should policymakers evaluate the security implications of open-source AI development?", "required": True},
            {"id": "q4", "type": "select", "label": "What is your overall position on open-weight model releases?",
             "options": ["Strongly support open release", "Support with safety caveats", "Case-by-case evaluation required", "Prefer restricted access for frontier models", "Oppose open release of powerful models"], "required": True},
        ],
    },
    {
        "title": "AI & Democratic Integrity: Disinformation, Elections and Public Discourse",
        "questions": [
            {"id": "q1", "type": "textarea", "label": "How is AI changing the landscape of disinformation and its threat to democratic processes?", "required": True},
            {"id": "q2", "type": "textarea", "label": "What obligations should AI companies have regarding political advertising and synthetic media?", "required": True},
            {"id": "q3", "type": "textarea", "label": "What technical and regulatory measures would most effectively protect electoral integrity from AI-enabled manipulation?", "required": True},
            {"id": "q4", "type": "select", "label": "What is the most urgent AI-related threat to democratic integrity?",
             "options": ["Synthetic media / deepfakes", "Micro-targeted disinformation at scale", "Automated influence operations", "Algorithmic filter bubbles", "AI-assisted voter suppression"], "required": True},
        ],
    },
    {
        "title": "Data Governance for AI: Privacy, Consent and the Public Interest",
        "questions": [
            {"id": "q1", "type": "textarea", "label": "How should the UK update its data governance framework to address AI training data requirements?", "required": True},
            {"id": "q2", "type": "textarea", "label": "What rights should individuals have over how their data is used to train AI systems?", "required": True},
            {"id": "q3", "type": "textarea", "label": "How should tensions between data access for AI innovation and privacy rights be resolved?", "required": True},
            {"id": "q4", "type": "select", "label": "Which data governance reform is most urgent for AI?",
             "options": ["Mandatory consent for AI training use", "Data trusts and collective licensing", "Strengthened subject access rights", "International data transfer controls", "Public sector data commons"], "required": True},
        ],
    },
    {
        "title": "AI Compute Infrastructure: Sovereign Capability and Supply Chain Risk",
        "questions": [
            {"id": "q1", "type": "textarea", "label": "What level of sovereign AI compute capacity does the UK need to maintain strategic independence?", "required": True},
            {"id": "q2", "type": "textarea", "label": "How should the UK manage supply chain dependencies on non-allied semiconductor manufacturers?", "required": True},
            {"id": "q3", "type": "textarea", "label": "What is the right balance between public investment in compute infrastructure and private sector provision?", "required": True},
            {"id": "q4", "type": "select", "label": "What is the most critical compute infrastructure risk for UK AI development?",
             "options": ["Semiconductor supply chain concentration", "Energy constraints on data centres", "Lack of sovereign cloud capability", "Export controls limiting access", "Cost barriers for academic researchers"], "required": True},
        ],
    },
    {
        "title": "AI Regulation Design: Principles for an Adaptive Regulatory Framework",
        "questions": [
            {"id": "q1", "type": "textarea", "label": "What principles should underpin a UK AI regulatory framework that remains effective as technology evolves?", "required": True},
            {"id": "q2", "type": "textarea", "label": "How should regulatory responsibility be divided between sector-specific regulators and a central AI authority?", "required": True},
            {"id": "q3", "type": "textarea", "label": "What enforcement mechanisms are needed to make AI regulation effective rather than performative?", "required": True},
            {"id": "q4", "type": "select", "label": "Which regulatory model should the UK adopt?",
             "options": ["Sector-specific rules via existing regulators", "Horizontal cross-sector AI Act (EU-style)", "Principles-based self-regulation", "Risk-tiered mandatory licensing", "Regulatory sandboxes with light-touch rules"], "required": True},
        ],
    },
]


def reset_and_seed():
    db = SessionLocal()
    try:
        # ── 1. Wipe all form-related data via raw SQL (correct FK order) ──
        print("Wiping all form-related data...")
        # Delete in dependency order to respect FK constraints
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
        print("  ✓ All forms and related data deleted")

        # ── 2. Create 10 fresh forms ──────────────────────────────────────
        print(f"\nCreating {len(FORMS)} fresh forms...")
        for i, spec in enumerate(FORMS, 1):
            join_code = uuid.uuid4().hex[:8]
            form = FormModel(
                title=spec["title"],
                questions=spec["questions"],
                allow_join=True,
                join_code=join_code,
            )
            db.add(form)
            db.flush()  # get form.id

            round1 = RoundModel(
                form_id=form.id,
                round_number=1,
                is_active=True,
                questions=spec["questions"],
                flow_mode="human_only",
            )
            db.add(round1)
            print(f"  [{i:2d}] {spec['title'][:60]}  code={join_code}")

        db.commit()
        print(f"\n✓ Done. {len(FORMS)} fresh forms ready.")

    except Exception as e:
        db.rollback()
        print(f"ERROR: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    reset_and_seed()
