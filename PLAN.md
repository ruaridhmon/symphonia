# Symphonia — Redesign Plan

> **Branch:** `axiotic/redesign`
> **Lead:** Antreas Antoniou
> **Date:** 2026-02-20
> **Status:** Planning

---

## Vision

Symphonia is a distributed expert synthesis platform for scientific consensus. It implements the Delphi methodology — structured expert input → LLM synthesis → expert review → iteration until convergence — to produce high-signal policy artefacts.

**The goal of this redesign:** Transform Ruaridh's functional prototype into a beautiful, professional product that uses the Axiotic brand system and integrates Sam's synthesis engine as the backend brain.

---

## Architecture

### Self-Contained Platform

This repo is the **complete product** — UI, backend, and synthesis engine. Sam's `axiotic-ai/consensus` repo stays separate (library-only, no UI). We build our own committee-based synthesis directly in this codebase.

### Target Stack

```
┌─────────────────────────────────────────────────┐
│                   Frontend                       │
│  React + Vite + Tailwind + Axiotic Brand Pack   │
│  Radix UI primitives + shadcn/ui components     │
│  Inter font · Dark/Light theme · Motion          │
├─────────────────────────────────────────────────┤
│                   Backend                        │
│  FastAPI + SQLAlchemy + PostgreSQL               │
│  Auth (JWT) · Forms · Rounds · WebSocket         │
├─────────────────────────────────────────────────┤
│          Committee Synthesis Engine               │
│  Built-in (no external dependency)               │
│  N independent LLM committee members             │
│  Agreement/disagreement/nuance extraction         │
│  Follow-up question generation (AI + human)       │
├─────────────────────────────────────────────────┤
│                   Infra                          │
│  Docker Compose · PostgreSQL · Cloudflare Tunnel │
└─────────────────────────────────────────────────┘
```

---

## Core UX Flow

Two modes, build for BOTH:

### Flow A: Human-Only Follow-ups
```
1. Experts sign in → answer structured survey questions
2. AI synthesis: find agreements, disagreements, expose all nuance
   (AI does NOT take a side — organises and reconciles only)
3. Show outcome to experts
4. Experts ask follow-up questions/comments
   → Other HUMANS answer (no AI here)
5. Repeat from 2
```

### Flow B: AI-Assisted Follow-ups
```
1. Experts sign in → answer structured survey questions  
2. AI synthesis: find agreements, disagreements, expose all nuance
3. Show outcome to experts
4. Experts ask follow-ups + AI asks follow-ups
   → AI probes disagreements to make them cleaner
   → AI probes alignments to strengthen them
   → Humans can also respond to each other and to AI
5. Repeat from 2
```

**Admin configures which flow** when creating a form. Both share the same synthesis engine; the difference is whether AI participates in the follow-up/probing phase.

---

## Phase 1: Brand & UI Overhaul

**Goal:** Make it beautiful. Axiotic brand identity throughout.

### 1.1 Design System Integration

Adopt the [Axiotic Brand Pack](https://github.com/axiotic-ai/brand-pack) design system:

**Color Strategy (80/15/5 rule):**

| Token | Dark Mode | Light Mode | Usage |
|-------|-----------|------------|-------|
| Background | `#020617` (slate-950) | `#f8fafc` (slate-50) | Primary surface |
| Card | `#0f172a` (slate-900) | `#ffffff` | Elevated surfaces |
| Foreground | `#f8fafc` (slate-50) | `#0f172a` (slate-900) | Primary text |
| Secondary | `#1e293b` (slate-800) | `#e2e8f0` (slate-200) | Secondary surfaces |
| Muted | `#1e293b` | `#f1f5f9` (slate-100) | Subdued content |
| Muted FG | `#94a3b8` (slate-400) | `#64748b` (slate-500) | Secondary text |
| Accent | `#fbbf24` (amber-400) | `#d97706` (amber-600) | CTAs, highlights (**5% max**) |
| Ring/Focus | `#fbbf24` | `#d97706` | Focus indicators |
| Border | `rgba(148,163,184,0.1)` | `rgba(30,41,59,0.1)` | Subtle borders |
| Destructive | `oklch(0.396 0.141 25.723)` | `#d4183d` | Error states |

**Typography:**
- Font: `Inter` (heading + body)
- Weights: 400 (body), 500 (labels), 600 (subheadings), 700 (headings)

**Radius:** `0.75rem` (consistent rounded feel)

**Transitions:** `0.2s ease` for theme switches, hover states

### 1.2 Component Library

Replace raw HTML/Tailwind with Radix UI + shadcn/ui components from brand pack:
- `Button` (primary/secondary/tertiary variants)
- `Card` (elevated surfaces for forms, responses, synthesis)
- `Tabs` (round navigation, admin sections)
- `Dialog` (confirmations, form creation)
- `Badge` (status indicators — active round, submitted, pending)
- `Progress` (Delphi iteration progress)
- `Tooltip` (help text, confidence explanations)
- `Accordion` (expandable response sections)
- `Separator` (visual content breaks)
- `Skeleton` (loading states)

### 1.3 Theme Switching

- `data-theme` attribute on `<html>` (dark default)
- CSS custom properties from brand pack
- `localStorage` persistence
- Sun/moon toggle in header
- Zero-flash: set theme before first paint via inline `<script>`

### 1.4 Page Redesign

**Landing / Login:**
- Full-bleed dark hero with Symphonia branding
- Particle background (tsparticles from brand pack)
- Clean login form (email + password)
- Register flow with form validation

**User Dashboard:**
- Card grid of available forms
- Status badges (active/completed/locked)
- Join code input with unlock flow
- My submissions history

**Form Page (Expert Input):**
- Previous round synthesis displayed prominently (if exists)
- Structured input template per question:
  - Position (rich text)
  - Evidence base (rich text)
  - Confidence level (slider 1-10 with justification textarea)
  - Known counterarguments (rich text)
  - Relevant publications (repeatable link/citation inputs)
  - Suggested experts (repeatable name/affiliation inputs)
- Progress indicator (which question, how many total)
- Auto-save draft to localStorage

**Synthesis View (Results):**
- Accordion sections: Agreement Areas / Divergence Points / Uncertainties
- Confidence heatmap or distribution chart
- Source traceability (which experts said what)
- Version history across Delphi rounds (diff view)
- Export as PDF/Markdown

**Admin Dashboard:**
- Form management (CRUD)
- Participant list + response counts per round
- Trigger synthesis (choose model/strategy)
- Push synthesis to participants
- Round management (advance, configure questions)
- Feedback review panel
- Real-time WebSocket status

**Waiting Page:**
- Animated loading state while synthesis runs
- Live WebSocket updates on progress
- "Your response has been recorded" confirmation

---

## Phase 2: Committee Synthesis Engine

**Goal:** Build our own committee-based synthesis engine directly in this repo. No external dependencies on axiotic-ai/consensus.

### 2.1 Committee Architecture

```
Expert Responses (structured)
    ↓
┌─────────────────────────────────────────────────┐
│  Committee of N Independent LLM Analysts         │
│                                                   │
│  Analyst 1 ──┐                                   │
│  Analyst 2 ──┼── Each independently reads ALL    │
│  Analyst 3 ──┤   expert responses and produces:  │
│  ...         │   • Agreements found              │
│  Analyst N ──┘   • Disagreements found           │
│                  • Nuances/edge cases            │
│                  • Gaps in reasoning              │
│                  (NO position-taking)             │
├─────────────────────────────────────────────────┤
│  Meta-Synthesiser                                │
│  Reads all N analyst outputs → produces final:   │
│  • Confirmed agreements (N/N analysts agree)     │
│  • Confirmed disagreements (with both sides)     │
│  • Nuance spectrum (not binary)                  │
│  • Confidence distribution                       │
│  • Suggested follow-up probes                    │
└─────────────────────────────────────────────────┘
    ↓
Structured Synthesis Output
    ↓ (shown to experts)
Follow-up Phase (Flow A: humans only, Flow B: AI + humans)
    ↓
Next Delphi Round
```

**Why committee:** Multiple independent LLM passes catch different nuances. No single model bias. Disagreements between analysts = genuine ambiguity in the data (diagnostic, not noise).

### 2.2 Backend Module: `backend/consensus/synthesis.py`

New module (separate from routes):

```python
class CommitteeSynthesiser:
    """N independent LLM analysts + meta-synthesiser."""
    
    async def run(
        self,
        questions: list[dict],
        responses: list[dict],
        n_analysts: int = 3,
        model: str = "anthropic/claude-sonnet-4-5",
        mode: str = "human_only",  # or "ai_assisted"
    ) -> SynthesisResult:
        """
        1. Fan out to N analysts (parallel)
        2. Collect independent analyses
        3. Meta-synthesise into structured output
        4. If ai_assisted: generate follow-up probes
        """

class SynthesisResult:
    agreements: list[Agreement]        # What experts agree on
    disagreements: list[Disagreement]  # Both sides, no judgment
    nuances: list[Nuance]             # Edge cases, caveats
    confidence_map: dict               # Per-question confidence distribution
    follow_up_probes: list[Probe]      # AI-generated (Flow B only)
    provenance: dict                   # Which expert said what
```

### 2.3 Data Model Extensions

Add to `models.py`:
- `RoundModel.synthesis_json` — full structured synthesis (JSON)
- `RoundModel.provenance` — source traceability (JSON)
- `RoundModel.flow_mode` — "human_only" or "ai_assisted"
- `RoundModel.convergence_score` — numerical convergence metric
- New table: `FollowUp` — follow-up questions/comments (from humans and/or AI)
- New table: `FollowUpResponse` — answers to follow-ups

### 2.4 Structured Input Template

Extend `FormModel.questions` from simple strings to structured objects:

```json
{
  "id": "q1",
  "text": "What are the primary drivers of the current SEN crisis?",
  "type": "structured_delphi",
  "fields": [
    {"key": "position", "label": "Your Position", "type": "richtext", "required": true},
    {"key": "evidence", "label": "Evidence Base", "type": "richtext", "required": true},
    {"key": "confidence", "label": "Confidence Level", "type": "slider", "min": 1, "max": 10, "required": true},
    {"key": "confidence_justification", "label": "Confidence Justification", "type": "textarea"},
    {"key": "counterarguments", "label": "Known Counterarguments", "type": "richtext"},
    {"key": "publications", "label": "Relevant Publications", "type": "repeatable_citation"},
    {"key": "suggested_experts", "label": "Suggested Additional Experts", "type": "repeatable_contact"}
  ]
}
```

### 2.5 Follow-Up System

**Flow A (human-only):**
- After synthesis shown, experts can post follow-up questions/comments
- Other experts can respond (threaded)
- Admin triggers next synthesis round when ready

**Flow B (AI-assisted):**
- Everything from Flow A, PLUS:
- AI generates targeted probes: "Expert 3 and Expert 7 disagree on X. Can you clarify Y?"
- AI probes aim to sharpen disagreements and strengthen alignments
- Experts respond to AI probes same as human questions
- AI can summarise follow-up discussion before next round

### 2.6 WebSocket Progress

Stream synthesis progress to frontend:
```json
{"type": "synthesis_progress", "stage": "analyst_1_complete", "step": 1, "total_steps": 5}
{"type": "synthesis_progress", "stage": "meta_synthesis", "step": 4, "total_steps": 5}
{"type": "synthesis_complete", "round_id": 42}
{"type": "follow_up_posted", "from": "ai", "question": "..."}
```

---

## Phase 3: Delphi Protocol Hardening

**Goal:** Make the iterative Delphi loop production-quality.

### 3.1 Convergence Tracking
- Compute convergence metrics between rounds (e.g. cosine similarity of positions, confidence drift)
- Auto-suggest stopping when convergence threshold reached
- Visualise convergence trajectory across rounds

### 3.2 Expert Nomination Flow
- Experts can nominate additional participants (field in structured input)
- Admin reviews nominations → sends invite via email (existing SMTP infra)
- Join code per form for access control

### 3.3 Inline Commenting
- Experts can annotate the synthesis output
- Comments feed into next round's context
- Thread-style discussion on specific claims

### 3.4 Audit Trail
- Full version history of every synthesis
- Diff view between rounds
- Exportable provenance chain (which expert → which claim → which evidence)

---

## Phase 4: Polish & Deploy

### 4.1 Docker Compose Refinement
- Multi-stage builds (frontend: build → nginx, backend: slim Python)
- Environment variable templates
- Health checks
- Volume mounts for DB persistence

### 4.2 Cloudflare Tunnel + Access
- Public tunnel via `cloudflared`
- Cloudflare Access OTP policy for admin routes
- Custom domain (symphonia.axiotic.ai)

### 4.3 Testing
- Backend: pytest for all endpoints
- Frontend: Vitest + React Testing Library
- E2E: Playwright for critical user flows

### 4.4 Documentation
- API docs (auto-generated via FastAPI /docs)
- User guide (how to run a Delphi session)
- Admin guide (form creation, synthesis, round management)

---

## Implementation Order

```
Phase 1.1  → Design system tokens + theme provider           [2 days]
Phase 1.2  → Component library swap (Radix/shadcn)           [3 days]
Phase 1.3  → Theme switching                                  [0.5 day]
Phase 1.4  → Page redesigns (login, dashboard, form, admin)  [5 days]
Phase 2.1  → consensus engine integration                     [1 day]
Phase 2.2  → New synthesis endpoint                           [2 days]
Phase 2.3  → Data model extensions                            [1 day]
Phase 2.4  → Structured input template                        [2 days]
Phase 2.5  → WebSocket progress                               [1 day]
Phase 3.*  → Delphi hardening (convergence, comments, audit)  [5 days]
Phase 4.*  → Docker, tunnel, testing, docs                    [3 days]
                                                       Total: ~25 days
```

---

## Key Design Decisions (Confirmed)

- ✅ **Committee-based synthesis** — our own implementation, NOT Sam's TTD/NSGA-II
- ✅ **Repos stay separated** — no dependency on axiotic-ai/consensus
- ✅ **Both UX flows** — human-only AND AI-assisted follow-ups
- ✅ **AI never takes a side** — organises, reconciles, probes, but never judges

## Open Questions

1. **Domain:** `symphonia.axiotic.ai`? Or separate branding?
2. **Auth:** Keep simple JWT or upgrade to Cloudflare Access / OAuth?
3. **Pilot question:** "What are the drivers of the current SEN crisis?" (from spec) — confirmed?
4. **Target panel size:** 12 SAC members (from spec) — for pilot?
5. **Model defaults:** Claude Sonnet 4.5 for committee analysts, or allow admin to choose?
6. **Committee size:** Default N=3 analysts? Or configurable per form?

---

*Plan created by Hephaestus. Ready for Father's review.* 🔥
