# 🔬 UX Research Brainstorm: Symphonia

> **Author:** Brainstorm Agent — Senior UX Researcher perspective
> **Date:** 2026-02-21
> **Scope:** Full platform analysis — admin journey, expert respondent journey, trust architecture
> **Method:** Heuristic evaluation of codebase + user journey mapping + competitive analysis against Google Forms/Qualtrics/existing Delphi tools

---

## Part 1: Pain Points Analysis

### 1.1 What's Broken

| # | Issue | Severity | Where | Detail |
|---|-------|----------|-------|--------|
| 1 | **Expert input is a plain textarea** | 🔴 Critical | `FormPage.tsx` | PLAN.md specifies structured input (position, evidence, confidence slider, counterarguments, publications, suggested experts). Currently it's just `<textarea>` per question — identical to Google Forms. This is the single biggest gap between spec and reality. |
| 2 | **No expert-facing synthesis view** | 🔴 Critical | `FormPage.tsx` | Experts see `previousSynthesis` as a blob of text at the top of the next round's form. There's no dedicated, rich synthesis view for experts — only admins get `SummaryPage`. Experts can't explore agreements/disagreements/emergence. The whole point of Delphi is that experts *react to the synthesis*. |
| 3 | **Follow-up system has no UI** | 🔴 Critical | Backend exists (`/follow_ups` endpoints) but there is zero frontend for experts to see follow-up questions, respond to them, or post their own. The entire Flow A/Flow B distinction is invisible. |
| 4 | **WaitingPage is a dead end** | 🟡 Major | `WaitingPage.tsx` | After submitting, experts land on a page with a spinner and "You'll be notified when synthesis is ready." But: (a) there's no notification system, (b) the WebSocket only fires on `summary_updated` which navigates to `/result` (a page that may not exist or work properly), (c) no indication of timeline, (d) no ability to go back and edit before the round closes. |
| 5 | **No notification system** | 🟡 Major | Entire platform | Experts have no way to know when: a new round starts, synthesis is ready, someone posted a follow-up, they've been mentioned in a probe. The email endpoint exists in routes.py but has no UI or automation. |
| 6 | **Console.log pollution** | 🟡 Major | `SummaryPage.tsx`, `AdminDashboard.tsx`, `FormPage.tsx` | 50+ debug console.log statements throughout production code. This is a credibility issue for government deployment — any civil servant opening DevTools sees `[SummaryPage] Fetching rounds_with_responses for modal...` |
| 7 | **No auto-save on FormPage** | 🟡 Major | `FormPage.tsx` | PLAN.md specifies "Auto-save draft to localStorage." Not implemented. Experts filling out long, considered responses risk losing everything if they navigate away or their browser crashes. For policy experts writing 500+ word responses, this is unforgivable. |
| 8 | **Join code UX is clunky** | 🟠 Moderate | `UserDashboard.tsx` | Experts get a 5-digit code and must manually type it in. No invitation link, no deep-link, no email invitation flow from the admin UI. Compare to how every modern tool does this: "Click this link to join." |
| 9 | **No form status for experts** | 🟠 Moderate | `UserDashboard.tsx` | Expert's "My Forms" list shows form titles with an "Enter" button. No indication of: which round they're on, whether they've submitted for the current round, whether synthesis is available, whether the form is still active. |
| 10 | **Admin can't see who has/hasn't submitted** | 🟠 Moderate | `AdminDashboard.tsx` | The admin dashboard shows `participant_count` but not who has submitted *this round*. Critical for follow-up emails ("3 of 12 experts haven't responded yet"). |

### 1.2 What's Confusing

| # | Issue | Who's Confused | Detail |
|---|-------|---------------|--------|
| 1 | **What is this?** | New experts | There's no onboarding, no explanation of the Delphi method, no "how this works" anywhere. An expert invited by a government department lands on a login page with zero context. They don't know what Symphonia is, why they should care, or what will happen with their input. |
| 2 | **What happens after I submit?** | Experts | Submit → WaitingPage → ??? The entire lifecycle is opaque. Experts don't know: How many rounds? How long between rounds? Who else is participating? What does synthesis mean? Will I see others' responses? |
| 3 | **What's the difference between rounds?** | Experts | On FormPage, `Round 2` shows at the top but there's no explanation of what changed, what the synthesis found, or what they should focus on differently this time. The previousSynthesis blob is undifferentiated — no "here's where you agreed, here's where you diverged, here's what we're probing this round." |
| 4 | **What do the confidence numbers mean?** | Admins | In StructuredSynthesis, confidence scores appear but there's no explanation of methodology, no calibration, no context for what 0.7 means versus 0.9. Government users will ask "how was this calculated?" |
| 5 | **Three synthesis modes, no explanation** | Admins | SynthesisModeSelector offers "Simple / Committee / TTD" with no explanation of what these are, when to use which, or what the trade-offs are. An admin who isn't deeply technical will be paralyzed. |
| 6 | **Expert labels / dimensions** | Admins | The CrossMatrix and dimensional labeling (temporal, methodological, stakeholder) exist but there's no guidance on *when* or *why* to use them. What's the difference between default and temporal? When should I apply labels? |

### 1.3 What's Missing

| # | Missing Feature | Impact | Detail |
|---|----------------|--------|--------|
| 1 | **Structured expert input** | Foundational | Position + evidence + confidence + counterarguments + publications + expert nomination. This is what makes Delphi work vs. a survey. |
| 2 | **Expert-facing synthesis view** | Foundational | A dedicated page where experts can explore the full structured synthesis (agreements, disagreements, nuances, emergence), not just a text blob. |
| 3 | **Follow-up / discussion UI** | Foundational | Threaded discussion on synthesis sections. This is the Delphi feedback loop. |
| 4 | **Email notifications / reminders** | High | Round opened, synthesis ready, follow-up posted, reminder to submit, round closing soon. |
| 5 | **Invitation flow** | High | Admin enters expert emails → system sends branded invite with deep-link → expert clicks, registers, lands on form. |
| 6 | **Progress dashboard for experts** | High | Where am I in the process? How many rounds expected? What round are we on? What's my submission status? |
| 7 | **Anonymity controls** | High | Government Delphi typically requires anonymous responses. Currently emails are visible everywhere. Need: anonymous to peers, anonymous to admins, fully identified, pseudonymous. |
| 8 | **Audit trail / provenance for experts** | High | Experts should be able to see *how their input was used*. "Your position on X contributed to Agreement #3." This is what makes experts feel heard. |
| 9 | **Mobile responsiveness** | Medium | Phase 6.1 not started. UK government experts will check this on phones. Senior academics will use iPads. |
| 10 | **Accessibility (WCAG 2.1 AA)** | Medium-High | UK government has legal requirements for accessibility. No ARIA labels, no keyboard navigation, no screen reader support, no focus management, no skip links, no alt text strategy. This is a compliance blocker for government deployment. |
| 11 | **Rate/deadline management** | Medium | No concept of round deadlines, no "round closes in 3 days" indicator, no automatic round advancement. |
| 12 | **Expert profile / credentials** | Medium | No way for experts to indicate their qualifications, area of expertise, or institutional affiliation. This matters for weighting and for the provenance chain. |
| 13 | **Minority position protection** | Medium | MinorityReport component exists but the UX around it needs work. In policy, the dissenting view is often the most important. How do we ensure minority positions aren't lost or marginalized? |
| 14 | **Offline / intermittent support** | Low-Medium | Experts in rural areas or government buildings with poor connectivity should be able to draft responses offline. |

---

## Part 2: Feature Brainstorm

### 2.1 Making Delphi Feel Collaborative, Not Bureaucratic

**The core insight:** Current Delphi tools feel like filling out a survey into a void. Symphonia should feel like being part of a collective intelligence exercise where you can see the thinking evolve in real time.

#### Feature: "The Living Synthesis"
Instead of a static synthesis document that appears between rounds, create a dynamic, evolving view that experts can watch develop:
- **Real-time synthesis streaming** — When the admin triggers synthesis, experts see it building live (like watching a document being written). WebSocket infrastructure already exists.
- **Annotation layer** — Experts can highlight any claim in the synthesis and add a margin note: "This doesn't capture my position accurately" or "I'd like to add nuance here" or "This is exactly right."
- **Agreement pulse** — A simple "I agree / I want to add nuance / I disagree" reaction on each synthesis section. Aggregated in real-time. Think of it as lightweight voting on claims.
- **The "Aha" marker** — Experts can flag moments where they changed their mind or gained new insight. These are gold for the final report and for building trust ("this process actually shifted expert thinking").

#### Feature: "The Dialogue Space"
Between formal rounds, create an informal discussion space:
- **Threaded discussion per synthesis section** — Backend exists (`SynthesisComment`), but needs a proper expert-facing UI.
- **AI facilitator in Flow B** — The AI posts targeted questions: "Expert A and Expert C seem to disagree on X. Could you each elaborate on your reasoning?" The AI never takes sides — it sharpens.
- **Response to probes** — Experts see AI-generated probes and can respond inline. Their responses feed into the next round's synthesis.
- **"Reply to the group" vs "Note to facilitator"** — Some comments should be visible to all experts; others should be private notes to the admin. This is standard in good facilitation.

#### Feature: "See the Conversation, Not Just the Conclusion"
- **Position evolution timeline** — For each key topic, show how the distribution of expert positions changed across rounds. "In Round 1, 3 of 8 experts supported X. By Round 3, 6 of 8 did, with 2 holding a nuanced position."
- **Convergence visualisation (expert-facing)** — Not just the admin's convergence score, but a visual that experts can see: "We're converging on these topics, still diverging on these." Gives a sense of progress.
- **Attribution with consent** — "Two experts in your panel changed their position after seeing the Round 2 synthesis." (Anonymous unless experts opt in to be identified.)

### 2.2 How Experts Know Their Input Matters

This is the existential UX challenge for Delphi. Every expert who's done a government consultation has had the experience of submitting detailed input that disappears into a void. Symphonia must be *visibly different*.

#### Feature: "Your Contribution Map"
After each synthesis round, show each expert a personalised view:
- **"Your input influenced..."** — Highlight which synthesis claims their specific position or evidence contributed to.
- **"Your evidence was cited..."** — If they provided publications or data, show where it appears in the synthesis.
- **"Your counterargument was addressed..."** — Show that the synthesis didn't just cherry-pick agreement — it engaged with the tensions they raised.
- **"The AI probed your position because..."** — In Flow B, explain *why* the AI is asking a follow-up of this specific expert.

#### Feature: "The Expert's Receipt"
After each round:
- A summary email: "Here's what happened in Round 2 of [Policy Question]. Your position on X was captured under Agreement #3. The panel is converging on Y but still divergent on Z. Round 3 opens on [date]."
- This is the single most impactful thing for retention. Experts need to feel the machine noticed them.

#### Feature: "Your Evolving Position"
- **Personal position history** — Show each expert how their own views evolved across rounds. "In Round 1, you said X. In Round 2, after seeing the synthesis, you refined to Y."
- **Confidence trajectory** — If structured input includes confidence sliders, show how their confidence changed. This is genuinely interesting to experts and useful for the final report.

### 2.3 Feedback Loops Needed

| Loop | Current State | Needed |
|------|--------------|--------|
| Expert → System | Submit response → WaitingPage (dead end) | Submit → confirmation with timeline → notification when synthesis ready → notification when new round opens |
| System → Expert | None (except WebSocket on WaitingPage) | Email digest per round, in-app notification center, push notifications (optional) |
| Expert → Synthesis | None | Annotation, agreement pulse, margin notes, "this doesn't capture my view" flag |
| Expert → Expert | None | Discussion threads per synthesis section (backend exists, no expert UI), follow-up Q&A |
| Admin → Expert | Manual email only (raw API endpoint) | Templated emails triggered by events (round open, reminder, synthesis ready), in-app announcements |
| Expert → Admin | None | "Note to facilitator" (private), "Flag this section" for admin attention |
| System → Admin | Basic (form table + response counts) | Analytics dashboard: response rate per round, convergence trajectory, engagement metrics, stalled experts |
| AI → Expert (Flow B) | Backend exists, no frontend | AI-generated probes rendered inline, experts can respond, responses feed next round |

### 2.4 Accessibility

**This is not optional for UK government.** The Public Sector Bodies Accessibility Regulations 2018 require WCAG 2.1 AA compliance.

| Requirement | Current State | Priority |
|------------|--------------|----------|
| **Keyboard navigation** | Not implemented | P0 — All interactive elements must be keyboard-accessible |
| **Screen reader support** | No ARIA labels, no semantic HTML in many places | P0 — Synthesis sections, forms, buttons need proper ARIA |
| **Focus management** | No focus trapping in modals, no focus restoration | P0 — The response modal (`responsesOpen`) has no focus trap |
| **Color contrast** | Untested — `var(--muted-foreground)` on `var(--muted)` may fail | P1 — Must meet 4.5:1 for normal text, 3:1 for large |
| **Text resizing** | Unknown — uses rem/px mix | P1 — Must work at 200% zoom |
| **Motion sensitivity** | Animations (orbit, dots) have no `prefers-reduced-motion` support | P1 — WaitingPage orbit animation could cause issues |
| **Screen magnification** | Untested | P2 |
| **Voice control** | No testing | P2 |
| **Alternative text** | No images currently, but synthesis visualisations (CrossMatrix, convergence charts) would need text alternatives | P2 |
| **Skip links** | None | P1 — Required for repeated navigation |
| **Error identification** | Form errors are `alert()` calls | P1 — Must be inline, associated with inputs, announced to screen readers |

**Recommendation:** Before any government pilot, commission a formal WCAG 2.1 AA audit. Budget 2-3 weeks of remediation.

---

## Part 3: Beyond the Obvious

### 3.1 What Would Make This 10x Better Than Google Forms + Manual Synthesis?

Google Forms + a human synthesiser is the current baseline. Most government Delphi processes use exactly this. To be 10x better:

#### 1. **Structured Epistemics, Not Just Opinions**
The structured input template from PLAN.md (position + evidence + confidence + counterarguments) transforms a survey into an epistemological instrument. But go further:
- **Evidence quality tagging** — Let experts classify their evidence: peer-reviewed, grey literature, professional experience, anecdotal, theoretical. The synthesis engine can weight accordingly.
- **Uncertainty decomposition** — Instead of a single confidence slider, let experts specify *what kind* of uncertainty they have: "I'm confident in the direction but uncertain about magnitude" vs "I'm uncertain whether this is even the right framing."
- **Conditional positions** — "I support X *if* Y is true, but oppose X *if* Z is true." Real policy positions are almost always conditional. Flat surveys lose this.
- **Known unknowns register** — A dedicated field for "What information would change your position?" This is incredibly valuable for follow-up rounds and for the final policy recommendation.

#### 2. **AI That Does More Than Summarise**
Current synthesis is "summarise the responses." Committee synthesis is better. But the real 10x is:
- **Argument structure extraction** — Don't just find agreement/disagreement. Map the *logical structure* of each expert's reasoning. "Expert A believes X because of evidence Y, which implies Z." Then find where the actual disagreement lies — is it in the evidence, the reasoning, or the values?
- **Steelman detection** — When experts disagree, automatically identify whether they're engaging with the strongest version of each other's arguments or talking past each other. Flag when Expert A is attacking a strawman of Expert B's position.
- **Gap analysis** — What questions *should* have been asked but weren't? What evidence is missing from all experts' responses? What assumptions are shared but unexamined?
- **Cross-domain pattern matching** — If the panel includes experts from different fields (economist + clinician + educator for SEN policy), the AI can identify where disciplinary assumptions create invisible disagreement.

#### 3. **The Provenance Chain**
This is what Google Forms fundamentally cannot do:
- Every claim in the final synthesis traces back to specific expert inputs, specific evidence, specific reasoning steps.
- The government policy team can click on "Experts broadly agree that X" and see: which experts, what evidence they cited, how confident they were, how this evolved across rounds.
- This is the **audit trail** that makes government trust the output. It's not "an AI said this." It's "8 domain experts said this, here's exactly how we arrived at this conclusion, here's the evidence chain."
- **Export as a formal evidence document** with full provenance — suitable for parliamentary committee review or judicial review.

#### 4. **Real-Time Consensus Dashboard**
- Live-updating visualisation of where the panel stands on each question.
- Not just yes/no — a distribution view showing the spectrum of positions.
- Convergence tracking across rounds with statistical measures.
- This turns a static survey process into a living, breathing deliberation that the admin can monitor and steer.

### 3.2 What Would Make Experts WANT to Participate?

This is the retention problem. Busy domain experts (senior academics, clinicians, policy professionals) get invited to Delphi panels all the time. Most are boring, slow, and feel like unpaid labour. To make them *want* to come back:

#### 1. **Intellectual Stimulation**
- **Show them something they couldn't see alone.** The synthesis should surface insights, connections, and tensions that no individual expert had. "I hadn't thought about it that way" is the goal.
- **The Emergence view** (already partially built) is key — but it needs expert-facing presentation, not just admin tools.
- **Cross-expert learning** — "Expert 3 cited a study you might find relevant to your position." (With appropriate anonymity.)

#### 2. **Respect Their Time**
- **Mobile-first for later rounds.** Round 1 might need long-form input. Round 2+ could be "Here's the synthesis. Do you agree? Where do you want to add nuance?" — achievable in 5 minutes on a phone.
- **Smart defaults** — Pre-populate their previous round's answers. They only need to change what changed.
- **Estimated completion time** per round. "This round will take approximately 15 minutes."
- **Deadline transparency** — "This round closes in 3 days. 8 of 12 experts have responded."

#### 3. **Status and Recognition**
- **Expert profiles** with qualifications and affiliations (optional, expert-controlled).
- **Participation certificate** — "Professor X participated in the [Policy Topic] Delphi panel convened by [Government Department]." Sounds small, but academics and consultants value these for CVs and bids.
- **Co-authorship option** — For panels that produce a published report, acknowledge participating experts (with consent). This turns "free labour" into "academic output."

#### 4. **Agency and Voice**
- **Question suggestion** — Let experts propose questions for the next round. Best suggestions get voted on or admin-approved.
- **Expert nomination** — "Who else should be on this panel?" (Already in PLAN.md Phase 3.2, not yet built.)
- **Position locking** — Let experts explicitly "lock in" a position they feel strongly about, signaling to the synthesis engine that this isn't up for further negotiation. Prevents the Delphi failure mode where persistent minorities are slowly eroded by social pressure.
- **Minority position protection** — Explicitly flag and preserve strong minority positions in the synthesis. The dissenting view in a policy Delphi is often the most important one. Never let the synthesis engine average it away.

#### 5. **The "What Happened" Report**
After the panel concludes:
- **Personal impact report** — "Your input directly influenced 4 of the 7 recommendations in the final report."
- **Panel-wide summary** — The story of how expert opinion evolved across rounds.
- **Publication** — Turn the Delphi output into a publishable format (working paper, policy brief). Share credit with experts.

### 3.3 What Would Make Government Actually Trust the Output?

Government trust is the hardest nut to crack. They need to defend this output to ministers, parliamentary committees, and potentially in court (judicial review). This is not about AI trust — it's about methodological credibility.

#### 1. **Methodological Transparency**
- **Full methodology page** — "This synthesis was produced using the Delphi method with N rounds, M experts, confidence-weighted structured responses, and committee-based AI synthesis with K independent analysts."
- **Model card** — Which AI model was used? What were the instructions? What was the synthesis strategy? This should be exportable and auditable.
- **Human-in-the-loop evidence** — Show where human experts reviewed and corrected AI-generated synthesis. Show where the admin edited the synthesis before publishing. Timestamp everything.

#### 2. **Statistical Rigour**
- **Convergence metrics** — Not just a number, but an explanation: "After 3 rounds, 85% of position-evidence pairs were stable (no material change between rounds). The panel reached convergence on 5 of 7 questions."
- **Confidence distributions** — Show the full distribution, not just the mean. A bimodal confidence distribution (half the experts very confident, half very uncertain) is a completely different signal than a uniform medium-confidence distribution.
- **Inter-rater reliability** — For the committee synthesis, show that N independent AI analysts reached similar conclusions. This is the methodological equivalent of Cronbach's alpha for AI synthesis.

#### 3. **The Provenance Chain (Again)**
- Every conclusion → traceable to specific expert inputs → with specific evidence → from specific rounds.
- **No orphan claims** — The synthesis must never contain a claim that doesn't trace back to at least one expert's input. AI hallucination in policy synthesis is catastrophic.
- **Conflict-of-interest declaration** — Let experts declare relevant interests. Flag these in the provenance chain. Government needs this for due diligence.

#### 4. **Peer Comparison**
- "This Delphi panel achieved a convergence score of X. For comparison, the average score in published Delphi studies is Y." (With citations.)
- Benchmarking against traditional (manual) Delphi processes — "AI-assisted synthesis identified N additional nuance points that were missed in a parallel manual synthesis." (This could be a powerful demo/validation experiment.)

#### 5. **Export Formats That Government Uses**
- **GOV.UK style report** — Formatted in the style of a government publication, with executive summary, methodology section, findings, recommendations, evidence annex.
- **Ministerial submission format** — A 2-page brief with the key findings, suitable for a minister's red box.
- **Parliamentary committee evidence format** — Suitable for submission to a Select Committee.
- **Data package** — All raw (anonymised) responses + synthesis outputs + metadata, in a format suitable for archiving and FOI compliance.

#### 6. **Governance Controls**
- **Admin audit log** — Every admin action (edited synthesis, advanced round, modified question) is logged with timestamp and user.
- **Version history** — Full diff view of every synthesis version, showing exactly what changed between edits.
- **Sign-off workflow** — Admin reviews synthesis → clicks "Approve for publication" → requires confirmation → synthesis is published to experts. No accidental publication.
- **Data retention controls** — Government needs to specify how long data is kept, when it's deleted, who can access it. GDPR compliance is mandatory.

---

## Part 4: Prioritised Feature Recommendations

### Tier 1: Must-Have for Government Pilot (before any real deployment)

| # | Feature | Rationale |
|---|---------|-----------|
| 1 | **Structured expert input** (position, evidence, confidence, counterarguments) | This IS the Delphi method. Without it, this is just a survey tool. |
| 2 | **Expert-facing synthesis view** | Experts must see and engage with the synthesis. This is the feedback loop that makes Delphi work. |
| 3 | **Follow-up / discussion UI for experts** | Backend exists. Wire it up. This is Flow A/B. |
| 4 | **Email notification system** (round open, synthesis ready, reminders) | Without this, the whole multi-round process breaks down. Experts forget, disengage, drop out. |
| 5 | **Invitation flow** (admin enters emails → branded invite → deep link to form) | Current join code UX is hostile. No government department will distribute 5-digit codes via email. |
| 6 | **Auto-save for expert responses** | Non-negotiable for long-form expert input. |
| 7 | **WCAG 2.1 AA accessibility audit + fixes** | Legal requirement for UK government. Blocker. |
| 8 | **Remove debug logging** | Credibility issue for any demo or pilot. |
| 9 | **Anonymity controls** (anonymous, pseudonymous, identified) | Government Delphi requires this. Experts must feel safe to dissent. |
| 10 | **Provenance chain in exports** | Government needs to justify every conclusion. "The AI said so" is not acceptable. |

### Tier 2: High-Impact Differentiators (what makes this better than alternatives)

| # | Feature | Rationale |
|---|---------|-----------|
| 11 | **Contribution map** ("your input influenced...") | Expert retention killer feature. |
| 12 | **Position evolution timeline** | Visual convergence across rounds — the core Delphi value proposition. |
| 13 | **Smart round 2+ UX** (pre-populated responses, focused input on changes) | Respect expert time. |
| 14 | **AI-generated probes (Flow B UI)** | The AI facilitator is the 10x feature. Backend exists. |
| 15 | **GOV.UK-formatted export** | Government users need to see output in their language. |
| 16 | **Deadline management** (round deadlines, countdown, automatic reminders) | Process management. |
| 17 | **Admin analytics dashboard** (response rate, convergence trajectory, engagement) | Admin needs to steer the process. |
| 18 | **Mobile responsive design** | Senior experts and policy professionals are on phones/tablets. |

### Tier 3: Excellence Features (for scale and credibility)

| # | Feature | Rationale |
|---|---------|-----------|
| 19 | **Evidence quality tagging** | Epistemological depth. |
| 20 | **Conditional positions** | Real policy positions are conditional. |
| 21 | **Argument structure extraction** | AI that understands reasoning, not just opinions. |
| 22 | **Peer comparison / benchmarking** | Academic and methodological credibility. |
| 23 | **Participation certificates** | Expert incentives. |
| 24 | **Data governance controls** (retention, GDPR, FOI) | Enterprise government requirements. |
| 25 | **Offline drafting support** | Edge case but important for some deployment contexts. |

---

## Part 5: Quick Wins (< 1 day each, high impact)

These are things that could be fixed in hours and would immediately improve the experience:

1. **Auto-save to localStorage on FormPage** — Add a `useEffect` with debounced save. 30 minutes of work.
2. **Remove all console.log statements** — Find-and-replace. 15 minutes.
3. **Add form status badges to UserDashboard** — "Submitted ✓" / "Round 2 Open" / "Synthesis Available". The data is already available from the API.
4. **Pre-populate Round 2+ with previous answers** — Load from `/form/{id}/my_response` and pre-fill. Experts only change what changed.
5. **Add "estimated time" to form header** — Simple metadata field on form creation. "Estimated completion: 15 minutes."
6. **Improve WaitingPage** — Add: round number, form title, "Back to edit response" link (if round still open), expected timeline.
7. **Add onboarding text to FormPage** — A collapsible "How this works" section explaining the Delphi process. 3 paragraphs of copy.
8. **Tooltips on synthesis mode selector** — Explain Simple vs Committee vs TTD for non-technical admins.
9. **Submission confirmation email** — Trigger the existing email endpoint when a response is submitted. "Thank you for your Round 1 response. We'll notify you when the synthesis is ready."
10. **Focus trap on the responses modal** — The `responsesOpen` portal has no focus trap. Accessibility fix, 20 minutes with a library.

---

## Part 6: User Journey Maps

### Expert Journey (Current vs. Ideal)

**Current:**
```
Receive join code (email from admin, not from system)
  → Go to symphonia URL manually
  → Register (email + password)
  → Type in join code
  → See form title + questions as textareas
  → Write answers → Submit
  → WaitingPage (spinner, no info)
  → ??? (no notification when next round starts)
  → Somehow learn round 2 is open (admin emails them manually)
  → Go back to form, see previousSynthesis as text blob
  → Write new answers from scratch
  → Submit → WaitingPage again
  → Process eventually ends. Expert never sees final output.
```

**Ideal:**
```
Receive branded email: "You've been invited to [Policy Topic] expert panel"
  → Click link → lands on form with explanation of Delphi process
  → Register (or SSO/magic link)
  → See form with structured input (position, evidence, confidence...)
  → Auto-saves as they type
  → Submit → confirmation with timeline + "what happens next"
  → 📧 Email: "Synthesis for Round 1 is ready. Click to review."
  → Rich synthesis view: agreements, disagreements, your contribution highlighted
  → React to synthesis: agree / add nuance / flag
  → Discussion threads with other experts (anonymous) and AI probes
  → 📧 Email: "Round 2 is open. Your previous answers are pre-loaded."
  → Round 2 form: previous answers pre-loaded, synthesis visible, focus on changes
  → Submit refined position
  → Repeat until convergence
  → 📧 Final report with personal contribution map + participation certificate
  → Expert feels: "That was actually valuable. I learned things. My input mattered."
```

### Admin Journey (Current vs. Ideal)

**Current:**
```
Create form (title + questions as text strings)
  → Share join code with experts (manually, via email client)
  → Wait for responses (no visibility into who's submitted)
  → Go to Summary page
  → Choose model → Generate Summary (single LLM call)
  → Edit synthesis in TipTap editor
  → Save synthesis → Push to next round
  → Manually email experts that round 2 is open
  → Repeat
  → No final report generation
```

**Ideal:**
```
Create form with structured questions + deadlines + anonymity settings
  → Invite experts from the platform (enter emails → system sends branded invites)
  → Dashboard shows: 8/12 experts submitted, 3 days remaining
  → Auto-reminder sent to non-responders at 50% and 75% of deadline
  → Trigger committee synthesis (N analysts + meta-synthesiser)
  → Review structured synthesis: agreements, disagreements, nuances, probes
  → Edit/approve synthesis → One-click publish to experts
  → System notifies all experts that synthesis is ready
  → Monitor discussion threads, engagement, convergence metrics
  → AI suggests when convergence is reached
  → Generate final report in multiple formats (GOV.UK, ministerial brief, evidence pack)
  → Full audit trail exportable for governance
```

---

## Part 7: Competitive Landscape & Differentiation

| Feature | Google Forms + Manual | Qualtrics | Real-Time Delphi (Calibrum) | Symphonia (Target) |
|---------|----------------------|-----------|----------------------------|-------------------|
| Structured epistemics | ❌ | ❌ | Partial | ✅ Full (position, evidence, confidence, counterarguments) |
| AI synthesis | ❌ | ❌ | ❌ | ✅ Committee-based with provenance |
| Real-time convergence | ❌ | ❌ | ✅ | ✅ |
| Follow-up probes | ❌ | ❌ | ❌ | ✅ AI + human |
| Provenance chain | ❌ | ❌ | ❌ | ✅ Every claim → evidence → expert |
| Expert contribution feedback | ❌ | ❌ | ❌ | ✅ "Your input influenced..." |
| Government-ready exports | ❌ Manual | ❌ | Partial | ✅ GOV.UK, ministerial, evidence format |
| Accessibility (WCAG) | ✅ (Google's own) | ✅ | Unknown | 🟡 Not yet |
| Cost | Free | £££ | ££ | Self-hosted |

**Symphonia's unique position:** The only tool that combines structured epistemics + AI committee synthesis + full provenance chains + Delphi iteration. No one else does this.

---

## Part 8: Research Questions to Validate

Before building, these should be tested with real government users and domain experts:

1. **How long will experts spend per round?** Test with the structured input template — is it too demanding? Do we need a "quick response" option?
2. **Do experts trust AI-generated synthesis?** Run the pilot with side-by-side: AI synthesis vs human synthesis. Measure expert confidence in each.
3. **What anonymity level do government Delphi panels need?** Talk to 3-5 government social researchers who've run Delphi processes.
4. **What's the drop-off rate between rounds?** This is the key metric. If >30% of experts drop off between rounds, the process fails.
5. **Do contribution maps actually improve retention?** A/B test: experts who see "your input influenced..." vs those who don't.
6. **What export format do government policy teams actually need?** Show them 3 options, ask which they'd submit to a minister.

---

*End of UX Research brainstorm. This document is raw ideation — not all ideas should be built, but all should be considered. The prioritisation in Part 4 reflects my assessment of what matters most for a credible government pilot.*
