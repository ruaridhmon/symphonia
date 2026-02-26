# 🎯 Symphonia — Product Manager Brainstorm

> **Author:** Senior PM Perspective (Brainstorm Agent 3)
> **Date:** 2026-02-21
> **Lens:** Features, user stories, prioritization, competitive positioning
> **Target audience:** ARIA / SPRIND pitch framing

---

## 1. Core User Stories — The Complete Journey

### 1.1 Admin: Consultation Creator

```
AS an Admin (policy team lead),
I WANT to create a structured consultation with specific questions, expert panel configuration, and Delphi parameters
SO THAT I can gather high-signal expert opinion on a policy question without the overhead of traditional SACs or roundtables.
```

**Current state:** ✅ Basic form creation works (title + questions + join code). Round management exists.
**Gaps:**
- No structured question types (PLAN.md specifies rich structured templates — slider, richtext, citations, expert nominations — but `FormCreate` in routes.py only accepts `list[str]` for questions)
- No consultation-level configuration (target panel size, deadline, anonymity settings, flow mode selection at creation time)
- No template library (reuse common consultation structures)
- No consultation lifecycle states (draft → recruiting → active → synthesis → review → closed → archived)

**Priority stories:**
1. ⭐ Admin configures flow mode (human-only vs AI-assisted) at form creation — **MVP**
2. ⭐ Admin sets deadlines per round with auto-reminders — **MVP**
3. Admin creates questions using structured templates (position + evidence + confidence + counterarguments) — **MVP**
4. Admin saves consultation as template for reuse — **Nice-to-have**
5. Admin sets anonymity level (full anonymity, admin-visible, open) — **High priority for government**

### 1.2 Admin: Expert Recruitment

```
AS an Admin,
I WANT to invite specific domain experts and manage panel composition
SO THAT the consultation captures diverse, representative expertise.
```

**Current state:** ⚠️ Partially implemented. Email sending exists (`/send_email`). Join codes exist. `UserFormUnlock` tracks access.
**Gaps:**
- No invitation tracking (invited vs. accepted vs. declined vs. responded)
- No expert profiles or expertise tagging
- No panel composition dashboard ("I have 3 neuroscientists, 0 economists — I need balance")
- No bulk invite functionality
- No invitation link with embedded join code (experts currently need to register, THEN enter a code — two friction points)
- No expert nomination pipeline (experts can suggest names in the input template, but there's no UI/workflow for admin to action those nominations)

**Priority stories:**
1. ⭐ Admin sends email invitation with magic link (register + join in one click) — **MVP**
2. ⭐ Admin sees invitation status dashboard (invited/accepted/submitted per round) — **MVP**
3. Admin tags experts with dimensions/expertise areas — **High priority** (partially exists via `expert_labels`)
4. Admin actions expert nominations from previous rounds — **Differentiator**
5. Admin sets minimum response threshold before synthesis can trigger — **MVP**

### 1.3 Expert: Response Submission

```
AS an Expert,
I WANT to provide my structured input with position, evidence, confidence, and counterarguments
SO THAT the synthesis captures the full nuance of my expertise, not just a flat opinion.
```

**Current state:** ⚠️ Form submission works but questions are simple strings. Answers are unstructured JSON blobs. The rich structured template from PLAN.md (position, evidence, confidence slider, counterarguments, citations, expert nominations) is **not implemented**.
**Gaps:**
- No structured input template UI (the defining differentiator of Symphonia vs Google Forms!)
- No confidence slider with justification
- No citation/publication input fields
- No expert nomination fields
- No auto-save drafts (PLAN mentions localStorage, not implemented)
- No progress indicator per question
- No response editing by experts (only admin can edit via `PUT /responses/{id}`)

**Priority stories:**
1. ⭐ Expert fills in structured template per question (position, evidence, confidence 1-10 with justification, counterarguments) — **MVP CRITICAL — this IS the product**
2. ⭐ Expert auto-saves drafts — **MVP**
3. Expert adds citations/publications — **High priority**
4. Expert nominates additional experts — **Differentiator**
5. Expert can revise their response before round closes — **MVP**

### 1.4 Admin: Synthesis Trigger

```
AS an Admin,
I WANT to trigger AI synthesis that identifies agreements, disagreements, and nuances across all expert responses
SO THAT I get a structured analytical map of expert opinion, not just a summary.
```

**Current state:** ✅ Two synthesis paths exist:
- Simple summary (`/form/{id}/synthesise`) — concatenates responses, basic HTML
- Committee synthesis (`/forms/{id}/synthesise_committee`) — N analysts + meta-synthesiser, structured output with agreements/disagreements/nuances/probes
- WebSocket progress broadcasting works
- Mock mode available when no API key

**Gaps:**
- No synthesis comparison (run committee vs simple, compare outputs)
- No human-in-the-loop editing of synthesis before publishing to experts
- No synthesis approval workflow (admin reviews → edits → publishes)
- Admin can push arbitrary summary text (`/forms/{id}/push_summary`) which is good, but there's no UI for editing structured synthesis JSON
- No cost estimation before running (N analysts × API calls = real money)

**Priority stories:**
1. ⭐ Admin triggers committee synthesis and sees real-time progress — **Exists, needs polish**
2. ⭐ Admin reviews and edits synthesis before publishing to experts — **MVP**
3. Admin sees cost estimate before triggering — **Nice-to-have**
4. Admin can re-run synthesis with different parameters (more analysts, different model) — **High priority**
5. Admin locks synthesis for a round (no more changes) — **MVP**

### 1.5 Admin: Round Advancement

```
AS an Admin,
I WANT to advance the Delphi process through rounds, carrying forward synthesis and refined questions
SO THAT expert opinion converges toward actionable consensus.
```

**Current state:** ✅ Round advancement works (`/forms/{id}/next_round`). Questions can be updated. Previous synthesis carries forward.
**Gaps:**
- No convergence tracking visualization (PLAN mentions cosine similarity, confidence drift — not implemented)
- No auto-suggest stopping condition
- No side-by-side comparison across rounds
- No question refinement suggestions from AI (e.g., "Based on disagreements, consider asking X in the next round")
- Admin has no guidance on when to stop iterating

**Priority stories:**
1. ⭐ Admin sees convergence trajectory across rounds — **High priority**
2. Admin gets AI-suggested refined questions for next round — **Differentiator**
3. Admin sees before/after comparison of expert positions across rounds — **High priority**
4. System auto-suggests when convergence plateau is reached — **Nice-to-have**

### 1.6 Expert: Seeing Their Impact

```
AS an Expert,
I WANT to see how my specific input was used in the synthesis
SO THAT I trust the process, feel my contribution mattered, and can verify accuracy.
```

**Current state:** ⚠️ Partial. Expert attribution exists in the frontend (`StructuredSynthesis` shows E1, E2 chips). `provenance` field exists on `RoundModel`. But experts see the same view as everyone — there's no personalized "your input was used here" view.
**Gaps:**
- No "my impact" view — highlight which agreements/disagreements cite MY responses
- No notification when synthesis is published
- No ability for experts to flag inaccurate attribution ("I didn't mean that")
- No feedback loop where expert corrections feed into next synthesis

**Priority stories:**
1. ⭐ Expert sees personalized view highlighting where their input appears in synthesis — **Differentiator, high trust-building value**
2. Expert can flag inaccurate synthesis of their position — **High priority for trust**
3. Expert gets notified when new synthesis or follow-up questions are posted — **MVP**
4. Expert sees how their position shifted across rounds — **Nice-to-have, cool for engagement**

### 1.7 Final Report Generation

```
AS an Admin,
I WANT to generate a comprehensive, citable report from the Delphi process
SO THAT I can submit it to the policy team / minister with full provenance and audit trail.
```

**Current state:** ⚠️ Export exists (`ExportPanel` component with Markdown + browser PDF). But it's basic — not a structured policy report.
**Gaps:**
- No professional report template (executive summary, methodology, findings, recommendations, appendices)
- No citation format for the report itself (how to cite "Symphonia consultation on X, 2026")
- No appendix generation (full expert responses, round-by-round evolution)
- No branded PDF generation (government logo, accessibility requirements)
- No sign-off / approval workflow before finalizing report
- No report versioning

**Priority stories:**
1. ⭐ Generate structured PDF report with exec summary, methodology, findings, appendices — **MVP for government adoption**
2. Report includes full audit trail (who said what, how it was synthesized, what changed) — **Government compliance critical**
3. Report has proper citation/reference format — **Academic credibility**
4. Admin can add custom narrative sections to generated report — **High priority**

---

## 2. Feature Gap Analysis

### 2.1 What's in ROADMAP but likely fragile or incomplete

| Feature | ROADMAP Status | Actual Assessment |
|---------|---------------|-------------------|
| Phases 1-4 | All marked ✅ | Built by autonomous pulse — likely functional but untested with real users. Vision QA (5.5) not started. No integration tests (5.2-5.4 incomplete). |
| Committee synthesis UI | ✅ (2.1-2.6) | Synthesis mode selector exists, structured display exists. But committee synthesis backend depends on `CommitteeSynthesiser` — need to verify it actually works with real API calls, not just mock mode. |
| Cross-matrix visualization | ✅ (3.2) | `CrossMatrix.tsx` exists but relies on expert labels being properly assigned. No evidence of real multi-dimensional data flowing through the system. |
| Emergence highlights | ✅ (3.3) | `EmergenceHighlights.tsx` exists but emergence detection happens in synthesis — need to verify the LLM actually produces emergence insights. |
| Real-time presence | ✅ (4.1) | `usePresence` hook exists with WebSocket. May work in single-server mode but will break with any horizontal scaling. |
| Response editing with conflict resolution | ✅ (4.2) | Optimistic locking on version field. Solid pattern but only admin can edit responses (`get_current_admin_user` dependency). Experts cannot edit their own responses. |
| Comment threads | ✅ (4.3) | `SynthesisComment` model + CRUD + WebSocket broadcast. Looks solid, but only 1 level of nesting allowed. |
| Export | ✅ (4.4) | Markdown + browser print PDF. Functional but not government-grade. |

**Key finding:** Phases 1-4 are "complete" in the sense that components exist. But this is prototype-grade code built by autonomous pulse agents. None of it has been tested with real users, real API calls, or real multi-user scenarios. The testing phase (5.2-5.4) being incomplete is the biggest risk.

### 2.2 What's missing entirely

**Critical for MVP:**
1. **Structured question templates** — The entire value proposition. Questions are still `list[str]`. The rich template (position/evidence/confidence/counterarguments/citations/nominations) from PLAN.md is not implemented in the backend data model or frontend.
2. **Expert self-service response editing** — Experts can submit but not revise. Only admin can edit.
3. **Notification system** — No email/WebSocket notifications for new rounds, synthesis published, follow-up questions posted. Experts must check the app manually.
4. **Consultation lifecycle management** — No draft/active/closed states. No deadlines. No round timers.
5. **Magic link invitations** — Current flow requires register → login → enter join code. Three friction points. Government experts won't do this.

**Critical for government adoption:**
6. **Audit trail** — PLAN.md mentions it (Phase 3.4). Not implemented. No immutable log of actions.
7. **Anonymity controls** — Government consultations often require anonymous expert input. No anonymity settings exist.
8. **Data retention policies** — Government data handling requirements (GDPR, UK data protection). No deletion/retention controls.
9. **Role-based access beyond admin/user** — No "observer" role for policy team members who need to watch but not participate.
10. **Accessibility (WCAG)** — UK government has legal accessibility requirements. Not addressed.

**Critical for differentiation:**
11. **Convergence analytics** — The field in the model exists (`convergence_score`) but it's computed as average confidence, which is meaningless as a convergence metric. Need actual convergence measurement (position drift across rounds, agreement growth rate).
12. **AI-generated question refinement** — The system generates follow-up probes but doesn't suggest improved questions for the next round.
13. **Expert impact visualization** — "My input was used here" view.

### 2.3 MVP Definition

**True MVP — what you need for the SEN pilot with 12 SAC members:**

| # | Feature | Why MVP |
|---|---------|---------|
| 1 | Structured input template (position + evidence + confidence + counterarguments) | This IS the product. Without this it's just SurveyMonkey. |
| 2 | Magic link invitation flow | Government experts won't tolerate register → login → enter code. |
| 3 | Committee synthesis that actually works end-to-end | The core AI value prop. |
| 4 | Synthesis review/edit before publishing | Admin must be able to QA before experts see it. |
| 5 | Email notifications (new round, synthesis ready) | Asynchronous process requires push notifications. |
| 6 | Professional report generation | The deliverable that goes to the policy team. |
| 7 | Audit trail | Government compliance non-negotiable. |
| 8 | Anonymity controls | SAC members may need anonymous input. |
| 9 | Expert can revise response before round closes | Basic usability. |
| 10 | Round deadlines | Without deadlines, Delphi processes stall indefinitely. |

**Nice-to-have for pilot (Phase 2):**
- Expert labels / dimensional analysis
- Cross-matrix visualization
- Emergence highlights
- Real-time presence
- Comment threads on synthesis
- Expert nomination pipeline
- Convergence analytics
- Multiple themes

**Future (Phase 3+):**
- AI-generated question refinement
- Expert reputation weighting
- Version control for synthesis
- API integrations with gov systems
- Multi-language support
- Mobile-responsive design

---

## 3. Beyond Basic Delphi — The Innovation Frontier

### 3.1 Real-time Collaboration Features

**Already partially built:** Presence indicators, WebSocket comments, response editor with conflict resolution.

**What would make this genuinely novel:**

- **Live synthesis dashboard during collection** — As responses come in, show a real-time evolving heatmap of where agreement/disagreement is forming. Not full synthesis, but a "temperature check." This creates urgency and engagement. Experts see the landscape forming and are motivated to contribute.

- **Synthesis "watch party"** — When admin triggers synthesis, all connected experts see it being built in real-time via WebSocket streaming. Each agreement/disagreement appears one by one. Creates a shared experience moment. This is the Symphonia equivalent of watching election results come in.

- **Breakout discussions** — After synthesis, allow small-group threaded discussions between experts who disagree on specific points. Not full committee synthesis, just structured spaces for bilateral or trilateral dialogue. Admin can observe. Insights feed into next round.

### 3.2 Asynchronous Expert Engagement

This is where the real product-market fit lives. Government experts are busy. They won't all be online at the same time. The entire Delphi methodology is inherently asynchronous, which is an advantage over roundtables.

**Key features for async excellence:**

- **Flexible response windows** — Admin sets a deadline (e.g., 2 weeks). Experts respond at their convenience. Progress bar shows "8/12 experts have responded."

- **Smart reminders** — Auto-email at 50% deadline, 75% deadline, and 24h before close. Personalized: "Dr. Smith, 10 of 12 experts have already submitted. Your expertise in [X] is particularly valuable for this question."

- **Digest emails** — Weekly summary of activity: "New synthesis published. 3 follow-up questions posted. Round 2 opens Monday." Keeps experts engaged without requiring app visits.

- **SMS/WhatsApp notifications** — For time-sensitive rounds. Government experts check email intermittently. An SMS saying "Your expertise is needed — synthesis complete, Round 2 open" cuts through.

- **Asynchronous AI probing** — In AI-assisted mode, when an expert submits, the AI can immediately analyze their response against others already submitted and generate personalized follow-up questions. The expert can optionally respond before the next round even starts. This turns dead time between rounds into productive dialogue.

### 3.3 Expert Reputation & Weighting

**Dangerous territory — handle carefully for government context.**

In academic Delphi, all experts are typically weighted equally. But in practice, some experts are more relevant to specific questions.

**What makes sense:**
- **Domain relevance weighting** — Admin can tag experts with domain tags and weight their input higher for questions in their domain. E.g., a neuroscientist's input on brain development questions carries more weight than an economist's, but the economist's input on funding questions carries more weight. This is transparent and configurable.

- **Confidence-adjusted synthesis** — Experts self-report confidence. An expert who says "confidence 9/10, I've published 15 papers on this" should arguably influence synthesis more on that question than one who says "confidence 3/10, outside my core area." The synthesis engine can use this signal.

- **Track record across consultations** — Over multiple consultations, build a (private, admin-only) profile of each expert's prediction accuracy, engagement rate, and peer ratings. This is for admin's panel composition decisions, NOT for weighting within a consultation.

**What to avoid:**
- Don't make weighting visible to experts (creates social pressure)
- Don't auto-weight by credentials (perpetuates hierarchies)
- Don't gamify (no leaderboards, no points)

### 3.4 Version Control for Synthesis

**This is a genuine innovation opportunity.**

The synthesis output is a document that evolves through rounds, admin edits, and expert feedback. Treating it with git-like version control would be unique:

- **Full diff view between synthesis versions** — Round 1 synthesis vs Round 2 synthesis. What changed? What converged? What diverged further?

- **Edit history with attribution** — "Admin modified this agreement claim at 14:32 on Feb 20. Original AI synthesis said X, admin changed to Y." Full transparency.

- **Branch and merge** — Admin creates two variants of the synthesis (one weighted toward economic evidence, one toward social evidence) and sends both to experts for the next round. Experts vote on or respond to both.

- **Rollback** — Admin can revert to a previous synthesis version if editing went wrong.

This is deeply aligned with the project's information-theoretic framing. Synthesis is a living document, not a static output.

### 3.5 Audit Trail for Government Compliance

**Non-negotiable for UK government adoption. Must be in MVP.**

Every government consultation platform needs:

- **Immutable action log** — Every action (create, submit, edit, synthesize, advance, delete) logged with timestamp, actor, and before/after state. Stored separately from the main DB (append-only log table or external audit service).

- **Data lineage / provenance chain** — For any claim in the final report: which expert responses contributed → which analyst identified it → which synthesis round included it → which admin edits modified it. End-to-end traceability.

- **Export for Freedom of Information (FOI)** — UK government bodies are subject to FOI requests. The system must be able to export a complete, human-readable record of the entire consultation process on demand.

- **Data retention controls** — Admin sets retention period. After expiry, personal data is anonymized or deleted. Configurable per consultation.

- **Access logs** — Who accessed what, when. Required for government data handling.

- **Tamper evidence** — Hash chain or similar mechanism so that audit records can be proven unmodified. This is the difference between "we logged it" and "we can prove it wasn't altered after the fact."

### 3.6 Integration with Existing Government Systems

**Long-term competitive moat. Not MVP, but worth designing for.**

- **GOV.UK Notify** — The UK government's notification service. Instead of raw SMTP, integrate with Notify for emails and SMS. Immediate credibility with government procurement.

- **GOV.UK Sign-in** — Single sign-on for government employees. Eliminates registration friction entirely.

- **Microsoft 365 / SharePoint** — Many government departments live in Microsoft. Export reports directly to SharePoint. Calendar integration for round deadlines.

- **Government Classification** — Support for marking documents as OFFICIAL, OFFICIAL-SENSITIVE, etc. Simple metadata but critical for government use.

- **JIRA / Trello / Monday.com** — Policy teams track actions arising from consultations. Auto-create action items from synthesis recommendations.

---

## 4. Competitive Moat — Why Fund This?

### 4.1 vs. Google Forms + ChatGPT

**What they do:** Create a form, collect responses, paste into ChatGPT, ask for summary.

**Why Symphonia is 10x better:**

| Dimension | Google Forms + ChatGPT | Symphonia |
|-----------|----------------------|-----------|
| Structure | Flat questions, flat answers | Structured templates (position + evidence + confidence + counterarguments) |
| Synthesis | One-shot, no provenance | Committee of N analysts, provenance chain, confidence maps |
| Iteration | Manual, ad-hoc | Systematic Delphi rounds with convergence tracking |
| Audit | None | Full immutable audit trail |
| Expert engagement | Fill form once, done | Multi-round dialogue, follow-ups, impact visibility |
| Output | ChatGPT markdown in a doc | Professional report with methodology, findings, appendices |
| Disagreement | Collapsed into "summary" | Explicitly preserved and surfaced as diagnostic |
| Trust | "ChatGPT said so" | Expert-verified, iteratively refined, fully traceable |

**The killer gap:** ChatGPT gives you a *summary*. Symphonia gives you a *scientific opinion with provenance*. Policymakers need the latter.

### 4.2 vs. SurveyMonkey + Manual Analysis

**What they do:** Professional surveys, statistical analysis, charts.

**Why Symphonia is 10x better:**

- SurveyMonkey is designed for quantitative opinion polling (Likert scales, NPS scores). Symphonia is designed for qualitative expert reasoning. Different category entirely.
- Manual analysis of open-text expert responses takes weeks. Committee synthesis takes minutes.
- SurveyMonkey can't do Delphi iteration (multiple rounds of refinement based on synthesis).
- SurveyMonkey has no concept of disagreement being diagnostic. It counts votes.

### 4.3 vs. Traditional Delphi Consultancies

**What they do:** RAND-style firms run Delphi processes manually over 6-12 months, costing £100k-£500k.

**Why Symphonia is 10x better:**

- **Speed:** 6-12 months → 2-4 weeks for a complete Delphi process
- **Cost:** £100k-£500k → platform subscription + API costs (likely £500-£5000 per consultation)
- **Scale:** Traditional Delphi limited to 15-30 experts (coordination overhead). Symphonia can handle 100+ with minimal marginal cost.
- **Transparency:** Traditional Delphi produces a report. Symphonia produces a report + full interactive provenance + version history + audit trail.
- **Replicability:** Traditional Delphi is one-off. Symphonia templates allow the same question structure to be re-run annually with updated evidence.
- **Real-time:** Traditional Delphi results arrive months later. Symphonia produces living documents that evolve in real-time.

### 4.4 The 10x Differentiator

**Symphonia's moat is the structured-input → committee-synthesis → Delphi-iteration loop with full provenance.**

No one else has this. Specifically:

1. **Structured expert input templates** — Not just "what do you think?" but "what's your position, what's your evidence, how confident are you, what are the counterarguments, who else should we ask?" This captures 10x more signal per expert.

2. **Committee-based synthesis (not single-model)** — N independent LLM analysts reading the same responses and independently identifying agreements/disagreements. Meta-synthesiser combines their analyses. This is Byzantine fault tolerance applied to LLM synthesis. Single-model bias is eliminated.

3. **Disagreement as a first-class citizen** — Most tools collapse disagreement into consensus. Symphonia explicitly preserves and surfaces disagreement as diagnostic information. This is the information-theoretic insight at the heart of the project: disagreement tells you where the genuine uncertainty is.

4. **Delphi iteration with convergence tracking** — Automated convergence metrics across rounds. The system knows when experts are converging and can tell the admin "we've reached 85% convergence — consider stopping" or "disagreement on X is actually increasing — this needs more investigation."

5. **Full audit trail with provenance** — From any claim in the final report, you can trace back to: which expert said it → which evidence they cited → which synthesis round identified it → which other experts agreed/disagreed → how it evolved across rounds. No other tool offers this.

**The ARIA/SPRIND pitch:**

> *"Governments make decisions affecting millions based on expert advisory processes that were designed in the 1950s. These processes are slow (6-12 months), expensive (£500k+), subject to groupthink, and produce documents with no traceability. Symphonia applies distributed cognition and committee-based AI synthesis to create a 100x improvement: structured expert input → multi-analyst AI synthesis → iterative Delphi refinement → fully traceable policy artefacts, in weeks instead of months, at a fraction of the cost. The result is not the opinion of a scientist — it's a scientific opinion."*

---

## 5. Prioritized Feature Roadmap (Product View)

### Tier 1: MVP for SEN Pilot (4-6 weeks)

These must work flawlessly for the pilot with 12 SAC members:

| # | Feature | Effort | Impact | Risk |
|---|---------|--------|--------|------|
| 1 | **Structured input templates** (position/evidence/confidence/counterarguments) — backend model change + frontend rich form | L | 🔴 Critical | Medium (data model migration) |
| 2 | **Magic link invitations** — one-click register + join | M | 🔴 Critical | Low |
| 3 | **End-to-end committee synthesis** — verify works with real API, not just mock | M | 🔴 Critical | High (LLM reliability) |
| 4 | **Synthesis review/edit workflow** — admin previews, edits, approves before publishing | M | 🔴 Critical | Low |
| 5 | **Email notifications** — round opened, synthesis published, deadline approaching | M | 🟡 High | Low |
| 6 | **Round deadlines with reminders** | S | 🟡 High | Low |
| 7 | **Expert can revise own response** before round closes | S | 🟡 High | Low |
| 8 | **Anonymity settings** — per-consultation toggle | S | 🟡 High | Low |
| 9 | **Professional PDF report generation** | L | 🟡 High | Medium |
| 10 | **Basic audit trail** — append-only action log | M | 🔴 Critical (for gov) | Low |

### Tier 2: Post-Pilot Enhancement (6-10 weeks)

Build after pilot validates the core loop:

| # | Feature | Effort | Impact |
|---|---------|--------|--------|
| 11 | Expert impact visualization ("my input here") | M | 🟡 High (trust) |
| 12 | Convergence analytics with visualization | M | 🟡 High (differentiation) |
| 13 | AI-suggested refined questions for next round | M | 🟡 High (differentiation) |
| 14 | Expert nomination pipeline (nominate → admin reviews → invite) | M | 🟢 Medium |
| 15 | Smart async reminders (personalized, time-aware) | S | 🟢 Medium |
| 16 | Synthesis version control with diff view | L | 🟡 High (differentiation) |
| 17 | Observer role (policy team watches without participating) | S | 🟢 Medium |
| 18 | WCAG accessibility compliance | L | 🔴 Critical (gov legal requirement) |
| 19 | Data retention/deletion controls | M | 🟡 High (GDPR) |
| 20 | Template library (save/reuse consultation structures) | M | 🟢 Medium |

### Tier 3: Scale & Integrate (10-20 weeks)

Build for multi-department adoption:

| # | Feature | Effort | Impact |
|---|---------|--------|--------|
| 21 | GOV.UK Notify integration | M | 🟡 High (procurement signal) |
| 22 | GOV.UK Sign-in / OAuth2 SSO | L | 🟡 High (enterprise adoption) |
| 23 | Multi-consultation dashboard (org-wide view) | L | 🟢 Medium |
| 24 | Domain relevance weighting | M | 🟢 Medium |
| 25 | Breakout discussion spaces | L | 🟢 Medium |
| 26 | Government classification marking | S | 🟡 High (security compliance) |
| 27 | API for programmatic access | L | 🟢 Medium |
| 28 | Multi-language support | L | 🟢 Medium (international orgs) |
| 29 | Live synthesis streaming ("watch party") | M | 🟢 Medium (engagement) |
| 30 | SharePoint / M365 export integration | M | 🟢 Medium |

---

## 6. Metrics That Matter

### Pilot Success Metrics
- **Expert completion rate** — Target: >80% of invited experts complete all rounds
- **Time to synthesis** — Target: <5 minutes for committee synthesis of 12 expert responses
- **Convergence trajectory** — Measurable convergence across Delphi rounds (position drift reduces)
- **Expert satisfaction** — Post-consultation survey: "Did the synthesis accurately reflect your input?" Target: >7/10
- **Admin effort** — Total admin hours per consultation. Target: <10 hours for a 3-round Delphi with 12 experts (vs. 100+ hours traditional)
- **Report quality** — Policy team assessment: "Is this report usable for decision-making?" Binary yes/no. Target: yes.

### Product-Market Fit Metrics
- **Repeat usage** — Same department runs a second consultation within 3 months
- **Organic referral** — Experts from pilot recommend the platform to other departments/organizations
- **Time-to-value** — Time from first login to completed first round. Target: <30 minutes for admin, <20 minutes for expert

### Scale Metrics (post-pilot)
- **Consultations per month** across all organizations
- **Experts per consultation** (can we scale beyond 30?)
- **Cross-department adoption** (how many government departments)
- **Revenue per consultation** (for pricing model development)

---

## 7. Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| LLM synthesis misrepresents expert input | Medium | 🔴 Critical | Committee approach + expert review phase + flagging mechanism |
| Government procurement blocks non-certified platform | High | 🔴 Critical | Early engagement with GDS (Government Digital Service), G-Cloud listing |
| Experts don't complete multi-round process | Medium | 🟡 High | Smart reminders, deadline management, show impact ("your input changed X") |
| API costs scale unexpectedly | Medium | 🟡 High | Cost estimation before synthesis, caching, model selection flexibility |
| Data security incident | Low | 🔴 Critical | Audit trail, encryption, Cloudflare Access, data retention controls |
| Existing components (Phase 1-4) have hidden bugs | High | 🟡 High | Full test suite (5.2-5.5) before pilot. Real user testing, not just automated. |
| Expert distrust of AI synthesis | Medium | 🟡 High | Transparency (show provenance), expert review phase, "AI organizes, not judges" messaging |
| Competitor launches similar product | Low | 🟢 Medium | Committee synthesis + provenance chain is hard to replicate. Speed to market. |

---

## 8. The One-Liner for ARIA/SPRIND

> **Symphonia turns expensive, slow, opaque expert advisory processes into fast, cheap, transparent, and reproducible scientific consensus — by treating experts as distributed compute nodes and AI as the synthesis layer, not the decision-maker.**

The funding ask: build the infrastructure for evidence-based policymaking at the speed and scale the 21st century requires.

---

*End of brainstorm. Ship the structured input templates first. Everything else is built on that foundation.* 🎵
