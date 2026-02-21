# 🎯 Design Review: UX Flow & Interaction Design

> **Reviewer:** Senior UX Designer (Enterprise SaaS — Figma, Slack, Airtable background)
> **Date:** 2026-02-21
> **Method:** Comprehensive code-level review of all routes, components, layouts, and styles
> **Perspective:** First-time user, busy government official, mobile user

---

## Executive Summary

Symphonia has **strong foundational UI craft** — theme system, responsive layouts, accessibility basics (skip links, focus management, ARIA). The visual design is clean and modern. But there are **critical UX flow gaps** that would confuse a first-time user and frustrate a returning one. The biggest issues are:

1. **The expert journey is incomplete** — gaps between submission and next round
2. **The admin synthesis workspace is overwhelming** — too many panels, unclear workflow
3. **No onboarding or wayfinding** — users arrive cold with no context
4. **Critical actions hidden or ambiguous** — join codes, round advancement, export

**Overall Grade: B- for visual polish, C for user journey completeness**

---

## 1. Login → Register Flow (`/login`, `/register`)

### What Works ✅
- **Clean, centered layout** — `AuthLayout` provides professional branding (logo, tagline, centered card)
- **Clear form labels** with proper `htmlFor`/`id` associations
- **Accessible error handling** — `aria-live="polite"` regions, `role="alert"` on errors
- **Session expiry notice** — detects `?expired=1` param and shows helpful message
- **Loading states** — `LoadingButton` with spinner and "Signing in…" text
- **Password visibility toggle** — `PasswordInput` component
- **Cross-linking** — "Don't have an account?" / "Already have an account?" links are prominent
- **iOS zoom prevention** — font-size bumped to 16px on mobile inputs
- **Graceful error differentiation** — distinguishes 401, 409, 422, 500+ with human-readable messages

### Friction Points 🔴

#### F1: No explanation of what Symphonia is (CRITICAL)
**Problem:** A government expert receives a link, lands on `/login`, and sees "Sign in to your account" + "Collaborative Consensus Platform". That's it. No explanation of:
- What is this platform?
- Why am I here?
- What will I be doing?
- Who sent me here?
- Is this legitimate?

**Impact:** Government officials are trained to be suspicious of unknown login pages. Without context, many will simply close the tab.

**Fix:** Add a brief value proposition below the branding:
```
Symphonia helps expert panels reach structured consensus 
through iterative rounds of anonymous feedback and AI-assisted synthesis.

You've been invited to contribute your expertise.
```
Or better: support a `?context=` parameter that shows the consultation title: "You've been invited to: AI in Education — Risks & Opportunities"

#### F2: No password requirements shown during registration
**Problem:** `Register.tsx` has a single password field with no indication of minimum length, complexity requirements, or strength meter. Users will enter "test123" (like the test credentials) and wonder if that's acceptable.

**Fix:** Add inline password requirements: "At least 8 characters" or a strength indicator. The backend presumably validates — show those rules client-side.

#### F3: No "Forgot Password" flow
**Problem:** No password reset mechanism anywhere. A returning user who forgot their password hits a dead end.

**Fix:** Add "Forgot password?" link below the password field on `/login`.

#### F4: Registration has no name field
**Problem:** Only email + password collected. When experts participate, they're identified only by email. This is impersonal for a deliberative process.

**Fix:** Add optional "Display Name" field during registration. Use it in the UI instead of raw email addresses.

#### F5: No terms of service or privacy notice
**Problem:** For government deployment, this is a legal requirement. Users must consent to data processing before account creation.

**Fix:** Checkbox before "Create Account": "I agree to the Terms of Service and Privacy Policy."

### Journey Map

```
Expert receives invitation (email? link? code?)
  → Opens /login (or /register)
  → ❓ "What is this?" — no context
  → Creates account / Signs in
  → Redirect to / (Dashboard)
  → ❓ "Now what?" — blank dashboard if no forms joined
```

**Happy path works.** Sad paths have gaps: no forgot password, no invitation context, no name collection.

---

## 2. Dashboard (`/`)

### Architecture
The `Dashboard` component is a simple admin/user router:
- Admin → `AdminDashboard` (create forms, manage consultations)
- User → `UserDashboard` (join forms, view joined forms)

### 2a. Admin Dashboard

#### What Works ✅
- **Clear hierarchy** — "Admin Dashboard" heading, "Your Consultations" section, "New Consultation" button
- **Search** — appears when >3 forms, with clear/filter UX
- **Responsive design** — desktop table, mobile cards
- **Join code copy** — one-click copy with toast confirmation
- **Status badges** — participant count, current round number
- **Loading skeleton** — `SkeletonDashboard` while fetching
- **Error recovery** — retry button on API failures

#### Friction Points 🔴

#### F6: "New Consultation" button is secondary (MAJOR)
**Problem:** The primary action for a new admin — creating their first consultation — is a button next to the "Your Consultations" heading. But when `forms.length === 0`, there's no empty state at all. The user sees "Admin Dashboard" and... nothing else.

**Fix:** Add an empty state:
```
╭──────────────────────────────────────╮
│  🎵  Welcome to Symphonia            │
│                                       │
│  Create your first consultation to    │
│  start gathering expert consensus.    │
│                                       │
│  [+ Create Consultation]              │
│                                       │
│  What's a Delphi consultation? →      │
╰──────────────────────────────────────╯
```

#### F7: No indication of how to invite experts
**Problem:** Admin creates a form, gets a join code. But there's no guidance on:
- How to share this code with experts
- Whether there's an invite-by-email flow
- What URL to send experts to

The join code is displayed but the admin has to figure out the invitation workflow themselves.

**Fix:** After creating a consultation, show:
```
Share this with your experts:
1. Send them to https://symphonia.axiotic.ai/register
2. They'll enter this code: [XXXXX] 📋
[Copy Invitation Link] [Send Email Invites]
```

#### F8: Actions column is text-only, no visual hierarchy
**Problem:** "Edit" and "Summary →" are plain text links of similar visual weight. The primary action (Summary — where the synthesis work happens) isn't visually distinguished from the secondary action (Edit — modifying questions).

**Fix:** Make "Summary" a proper button/badge:
```
[Edit]  [Summary →]  ← button with accent bg
```

#### F9: No form status indicator
**Problem:** The table shows participant count and round number, but no indication of form state: is it active? Closed? Awaiting responses? Has synthesis been generated?

**Fix:** Add a status column:
```
● Active — Awaiting responses (3/7 submitted)
● Ready — All responses in, synthesis needed
● Complete — Round 3 synthesis published
● Closed — Consultation complete
```

### 2b. User Dashboard

#### What Works ✅
- **Join form card** — prominent, centered, clear CTA
- **Form status badges** — "Submitted" (green), "Awaiting response" (yellow), round number
- **Adaptive button text** — "Review" for submitted, "Enter" for pending
- **Error recovery** — retry banner on API failure

#### Friction Points 🔴

#### F10: No explanation of what a "join code" is (MAJOR)
**Problem:** User lands on the dashboard and sees "Join a New Form" with an input field "Enter join code." A first-time expert doesn't know:
- What a join code is
- Where to get one
- What happens when they enter it

**Fix:** Add context: "Enter the code your facilitator shared with you" with a help tooltip.

#### F11: Empty state is just text
**Problem:** When the user has no forms, they see "No forms joined yet." — a single line of gray text. This is a dead end that provides no guidance.

**Fix:** 
```
╭──────────────────────────────────────╮
│  No consultations yet                 │
│                                       │
│  Enter a join code above to access    │
│  your first consultation, or check    │
│  your email for an invitation link.   │
╰──────────────────────────────────────╯
```

#### F12: Status enrichment is fire-and-forget
**Problem:** `fetchStatuses` fires after `fetchMyForms` but is a Promise.allSettled fire-and-forget. If status fetching fails silently, users see forms with no badges — confusing.

**Fix:** Show a subtle "updating status…" indicator, or at minimum display the form even without status data (currently handled, but the loading transition is jarring — forms appear, then badges pop in).

---

## 3. Create Consultation (`/admin/form/new`)

### What Works ✅
- **Back navigation** — "← Back to Dashboard" link at top
- **Clear form structure** — Title, Questions, Join Code in separate cards
- **Dynamic questions** — Add/remove with trash icon, numbered
- **Auto-generated join code** — 5-digit random code shown immediately
- **Validation** — checks for empty title, at least one question
- **Dual mode** — same component handles create and edit (smart)

### Friction Points 🔴

#### F13: Join code is not explained (MODERATE)
**Problem:** The join code section says "Share this code with experts so they can access the consultation" but doesn't explain the full flow. Admin wonders: "Do I send them this number? To what URL?"

**Fix:** Show the complete invitation flow: "Experts will register at [URL] and enter this code."

#### F14: Question input is bare text fields
**Problem:** Each question is a single-line `<input>`. For complex policy questions that might be 2-3 sentences, this is cramped.

**Fix:** Use auto-resizing `<textarea>` instead of `<input>` for questions. Support markdown formatting hints.

#### F15: No preview of what experts will see
**Problem:** Admin has no way to preview the form as an expert would see it. They're designing blind.

**Fix:** Add "Preview as Expert" button that shows the form in expert view mode.

#### F16: Delete has no undo (MAJOR)
**Problem:** Delete uses `window.confirm()` — a browser-native dialog that's jarring and doesn't match the app's design language. Once confirmed, deletion is permanent.

**Fix:** Use a custom confirmation dialog matching the app theme. Better: soft-delete with an "Undo" toast (like Gmail's undo delete).

#### F17: No indication of existing participants when editing
**Problem:** An admin editing an existing form can change questions after experts have already responded. No warning about this.

**Fix:** Show a warning: "This consultation has 5 participants and 3 responses. Editing questions may invalidate existing data."

---

## 4. Summary/Synthesis Workspace (`/admin/form/14/summary`)

### What Works ✅
- **Rich data visualization** — StructuredSynthesis, CrossMatrix, ConsensusHeatmap, EmergenceHighlights
- **Round timeline** — horizontal stepper with visual state (active, has-synthesis, selected)
- **Version management** — SynthesisVersionPanel with activation/generation
- **AI synthesis panel** — model selection, strategy modes, progress animation
- **Real-time presence** — see who else is viewing
- **Responsive grid** — 2/3 main + 1/3 sidebar, stacks on mobile
- **Tiptap editor** — view/edit toggle for synthesis text
- **Export capabilities** — DOCX download
- **WebSocket sync** — auto-refresh on `synthesis_complete`

### Friction Points 🔴

#### F18: The page is OVERWHELMING (CRITICAL)
**Problem:** This is the most complex page in the app and it tries to show *everything* at once:
- Round timeline (top)
- Synthesis progress bar (conditional)
- Responses accordion
- Synthesis editor card
- Read-only synthesis for non-active rounds
- Structured analysis (agreements/disagreements/nuances)
- Cross-matrix
- Consensus heatmap
- Selected version content
- Emergent insights
- Next round questions
- Sidebar: Form info, Actions, AI Synthesis, Versions, Round History

That's **12+ sections** in the main content area plus **5 sidebar sections**. A new admin seeing this for the first time will have no idea where to start.

**Impact:** This is the core workspace — the place where facilitators spend most of their time. If it's overwhelming, they'll make mistakes or give up.

**Fix:** Implement a **guided workflow** pattern:
```
Step 1: Review Responses    [Current: 3/7 submitted]
Step 2: Generate Synthesis   [Click to generate]
Step 3: Review & Edit        [View the synthesis]
Step 4: Advance Round        [Ready? Start next round]
```

Each step expands only the relevant sections. The current "everything at once" approach should be available as an "Advanced view" toggle.

#### F19: SummaryPage has its own Header, breaking layout (MAJOR)
**Problem:** `SummaryPage` renders a completely separate `<SummaryHeader>` component that says "Admin Workspace" instead of "Symphonia". It also has its own logout button. This breaks the consistent layout pattern established by `PageLayout` for every other authenticated page.

When you navigate from Dashboard (which uses the shared Header with theme toggle, ⌘K, etc.) to the Summary page, the header changes completely — losing the theme toggle, command palette trigger, and app branding.

**Fix:** Use the shared `PageLayout` header consistently. Add context-specific breadcrumbs below: "Dashboard > AI in Education > Round 2 Summary"

#### F20: Synthesis modes have cryptic labels
**Problem:** The AI Synthesis panel offers three modes: "Simple", "Committee", "TTD". What does "TTD" mean? What's the difference between Simple and Committee? A government facilitator will not understand these technical labels.

**Fix:** 
```
🎯 Quick Synthesis      — Fast, single-pass analysis (~30s)
🧑‍🤝‍🧑 Expert Committee    — Multiple AI analysts compare notes (~2min)  
🔬 Deep Analysis        — Thorough triangulated synthesis (~5min)
```

#### F21: No clear workflow for advancing rounds (CRITICAL)
**Problem:** The "Start Next Round" button is buried in the sidebar Actions card. An admin must:
1. Review responses (accordion)
2. Generate synthesis (sidebar AI panel)
3. Save synthesis (sidebar Actions card)
4. Edit next round questions (buried at bottom of main content)
5. Start next round (sidebar Actions card)

Steps 2-5 require switching between main content and sidebar, scrolling past multiple visualization sections. The questions editor for the next round is separated from the "Start Next Round" button by ~2000px of synthesis visualizations.

**Fix:** Group the round advancement workflow:
```
╭──────────────────────────────────────────╮
│  Ready to advance?                       │
│                                          │
│  ✅ Synthesis generated and saved        │
│  ✅ 3 questions drafted for next round   │
│                                          │
│  [Preview Questions] [Start Round 3 →]   │
╰──────────────────────────────────────────╯
```

#### F22: Actions card has too many equally-weighted buttons
**Problem:** The sidebar Actions card shows 5 buttons of similar visual weight:
1. View All Responses (accent)
2. Download Responses (secondary)
3. Save Synthesis (success)
4. Export Panel
5. Start Next Round (accent with darker bg)

A facilitator doesn't know which to click first. They all look similarly important.

**Fix:** Apply progressive disclosure:
- **Primary:** Start Next Round (only when synthesis is saved)
- **Secondary:** Save Synthesis | Export
- **Tertiary:** View Responses | Download

#### F23: Responses accordion and modal are redundant
**Problem:** There are two ways to view responses: the inline `ResponsesAccordion` in the main content area, AND a `ResponsesModal` toggled from the sidebar. Both show the same data. This is confusing — why are there two?

**Fix:** Pick one. The accordion is better (in-context, no modal). Remove the modal toggle or make it a dedicated "Full-screen responses" view.

#### F24: View/Edit toggle in synthesis editor is subtle
**Problem:** The View/Edit toggle for the synthesis is a small pill-style control that could be missed. When in View mode, there's no obvious indication that the content is editable.

**Fix:** In View mode, show a subtle "Click Edit to modify" prompt or a pencil icon overlay.

#### F25: No unsaved changes warning
**Problem:** If an admin edits the synthesis text and navigates away, changes are lost silently. No `beforeunload` handler, no "You have unsaved changes" warning.

**Fix:** Add `window.onbeforeunload` when editor content has changed, and show a confirmation dialog on internal navigation.

---

## 5. Expert Response Experience (`/form/14`)

### What Works ✅
- **Structured input** — `StructuredInput` component with Position, Evidence, Confidence slider, Counterarguments, and Advanced (Citations, Expert Nominations)
- **Auto-save to localStorage** — debounced 500ms, restored on mount
- **Keyboard shortcut** — ⌘+Enter to submit with visual hint
- **Auto-resizing textareas** — grows with content
- **Review mode** — after submission, shows read-only view with "Edit Response" button
- **Previous synthesis toggle** — collapsible, marked as "Optional"
- **Presence indicator** — see other active viewers
- **Confidence slider** — 1-10 with color-coded labels and justification field

### Friction Points 🔴

#### F26: No progress indication within the form (MAJOR)
**Problem:** An expert with 5 questions sees them all listed vertically with no indication of progress. For long consultations (10+ questions), this creates decision fatigue and no sense of accomplishment.

**Fix:** Add a progress bar or step indicator:
```
Question 3 of 7  [===========-------] 43%
```

Or use a step-by-step wizard for long forms (>5 questions).

#### F27: "Submit" vs "Update Response" is confusing
**Problem:** The button says "Submit" on first visit and "Update Response" on subsequent visits. But when the user switches from reviewing to filling mode by clicking "Edit Response", the button still says "Update Response" — unclear whether this will create a new version or overwrite.

**Fix:** Be explicit: "Update your response — this will replace your previous submission."

#### F28: Previous synthesis is too hidden
**Problem:** In a Delphi process, reviewing the previous round's synthesis is THE key action before responding to the new round. But in Symphonia, it's at the BOTTOM of the page, collapsed, marked "Optional", behind a toggle. This is backwards — it should be prominent.

**Fix:** Show the previous synthesis at the TOP, before the questions, in an expanded state:
```
╭──────────────────────────────────────────╮
│  📊 Round 1 Synthesis                    │
│                                          │
│  Key findings from the previous round:   │
│  • Experts agreed on X (89% consensus)   │
│  • Disagreement persists on Y            │
│  • New question for this round: Z        │
│                                          │
│  [Read Full Synthesis ↓]                 │
╰──────────────────────────────────────────╯

Now, please share your updated views:
```

#### F29: Structured Input is complex but not explained
**Problem:** The StructuredInput presents 4 sections (Position, Evidence, Confidence, Counterarguments) plus an Advanced section (Citations, Expert Nominations). A government expert seeing this for the first time may wonder:
- Why is this structured this way?
- Do I need to fill in everything?
- What's the difference between "Position" and "Evidence"?
- Why is Counterarguments even here? (It's unusual to ask for arguments against yourself)

Only "Your Position" is marked as required (*). The rest are unmarked — are they optional?

**Fix:** Add brief inline guidance:
```
Your Position *
💡 State your core answer to this question clearly and concisely.

Evidence & Reasoning
📚 What data, experience, or research supports your position?
(Helps other experts understand your perspective — optional but valuable)
```

Mark optional fields explicitly as "Optional" rather than leaving them unmarked.

#### F30: Confidence slider lacks context
**Problem:** The confidence slider goes 1-10 with semantic labels ("Highly uncertain" to "Certain"). But there's no calibration guidance. What does "7 — Confident" mean in practice? Is it "I'd bet money on this" or "I think this is right"?

**Fix:** Add tooltip calibration:
```
1-3: "I'm speculating — limited evidence"
4-6: "I have some basis — mixed evidence" 
7-8: "I'm fairly sure — good evidence"
9-10: "I'm very sure — strong evidence/direct experience"
```

#### F31: No way to see other experts' responses
**Problem:** In a Delphi process, the value comes from experts seeing aggregated views from peers. Currently, experts only see the admin-curated synthesis blob. They can't explore individual anonymized responses, agreement areas, or tension points.

**Fix:** Add an expert-facing synthesis exploration view (the admin's structured analysis, minus editing capabilities).

#### F32: Auto-save has no UI indicator
**Problem:** Auto-save happens silently via localStorage. Experts don't know their work is being preserved. If they're writing a 500-word response, anxiety about losing work is real.

**Fix:** Show a subtle "Draft saved" indicator that flashes briefly after each save:
```
✓ Draft saved just now
```

---

## 6. Post-Submission Flow (`/waiting`, `/result`, `/thank-you`)

### What Works ✅
- **WaitingPage** — orbit animation, context (form title + round number), "Edit response" link
- **ResultPage** — synthesis display + structured feedback form
- **ThankYouPage** — clean confirmation
- **WebSocket** — real-time navigation from waiting → result

### Friction Points 🔴

#### F33: WaitingPage has no timeline (CRITICAL)
**Problem:** "Your response has been recorded. You'll be notified when the synthesis is ready..." But:
- How long will this take? Hours? Days? Weeks?
- How many other experts need to respond?
- Is there a deadline?
- Will I get an email notification?

The page says "This page will update automatically" but experts will close the tab. There's no email notification system to bring them back.

**Fix:**
```
Waiting for synthesis...

📊 5 of 7 experts have responded
⏱  Estimated next round: ~3 days

We'll email you at antreas@axiotic.ai when the 
synthesis is ready and the next round begins.
```

#### F34: No way back to the form from WaitingPage (PARTIALLY FIXED)
**Problem:** There IS an "Edit response" link and a "← Back to Dashboard" link, which is good. But the "Edit response" link navigates to `/form/${formId}` which loads fresh — it should ideally scroll to where they left off.

#### F35: ResultPage feedback form has no connection to the synthesis
**Problem:** The feedback questions ("Does this summary accurately reflect your viewpoint?") are generic. They don't reference specific synthesis sections. An expert might want to say "Agreement #3 misrepresents my position."

**Fix:** Allow inline annotations on the synthesis, not just a separate feedback form.

#### F36: ThankYouPage has no next action
**Problem:** After submitting feedback, the expert sees "Thank you for your submission" with no links, no guidance, no next steps. It's a dead end — no way to navigate back to the dashboard.

**Fix:** Add: "Return to Dashboard" button, "You'll be notified when the next round begins" message.

---

## 7. Cross-Cutting UX Issues

### Navigation & Wayfinding

#### F37: No breadcrumbs (MAJOR)
**Problem:** On deep pages like `/admin/form/14/summary`, users lose context. The only navigation is "← Back to Dashboard" text links, which are inconsistent in placement (sometimes top-left, sometimes inline).

**Fix:** Add consistent breadcrumbs:
```
Dashboard > AI in Education > Round 2 > Synthesis
```

#### F38: Command Palette (⌘K) has limited commands
**Problem:** The ⌘K palette offers: Dashboard, Atlas, New Form, Theme switching, Logout. But it doesn't offer:
- Navigate to a specific form
- Quick search across consultations
- Create new round
- Generate synthesis

**Fix:** Make it a true power-user tool by adding form-specific and action-specific commands.

#### F39: Atlas page exists but is disconnected
**Problem:** The router includes `/atlas` route but it's not clear what it does or how to reach it. It's in the command palette but not in any visible navigation.

### Error States

#### F40: Inconsistent error patterns
**Problem:** Some pages show inline error banners (AdminDashboard, UserDashboard), some show full-page error states (FormPage), some catch errors silently (SummaryPage's `loadResponses`). The user experience of errors varies wildly.

**Fix:** Establish a consistent error hierarchy:
1. **Toast** — transient, non-blocking (save failed, copy success)
2. **Inline banner** — blocking but recoverable (API down, retry)
3. **Full-page** — fatal, unrecoverable (form not found, auth expired)

Apply consistently.

#### F41: No offline handling
**Problem:** No service worker, no offline indicators. If a user's connection drops while filling a 30-minute expert response, they see nothing until they try to submit and get a network error. The auto-save to localStorage helps, but there's no user-visible indication.

**Fix:** Add connection status indicator. On disconnect: "You're offline — your work is saved locally and will sync when you reconnect."

### Accessibility

#### F42: Good foundations, incomplete implementation
**What's done well:**
- Skip-to-main link (`PageLayout`)
- `aria-live` regions on error messages
- `role="alert"` on errors
- `prefers-reduced-motion` media query
- Focus management on mobile menu
- 44px minimum tap targets
- `focus-visible` outlines on all interactive elements

**What's missing:**
- Screen reader announcements for dynamic content (synthesis generation progress, presence updates)
- ARIA labels on icon-only buttons (e.g., trash icons, copy buttons)
- `aria-expanded` on accordion sections (ResponsesAccordion, StructuredInput Advanced toggle)
- Color contrast: some `var(--muted-foreground)` on `var(--muted)` combinations may not meet WCAG AA 4.5:1
- Keyboard navigation within StructuredInput (no tab order documentation)
- Live region updates for toast notifications

#### F43: Mobile menu accessibility is good
**Credit:** The mobile hamburger menu has `aria-expanded`, `aria-controls`, `role="menu"`, Escape key handler, and auto-focus on first item. This is above-average for many production apps.

### Performance & Loading

#### F44: Loading states are well-implemented
**Credit:** The app has skeleton screens (SkeletonDashboard, SummaryLoadingSkeleton), loading spinners in buttons, and Suspense fallbacks for lazy-loaded routes. This is good UX.

**Minor issue:** The `RouteLoadingFallback` for Suspense should be checked — if it's just a spinner, it may flash briefly on fast connections. Consider a 300ms delay before showing.

### Cognitive Load

#### F45: Theme system adds complexity without clear benefit
**Problem:** Three themes (Light, Dark, System/Apple) + the command palette offers "Warm" theme. For a government tool, this is feature creep that adds cognitive load. The theme toggle is in the header and command palette.

**Fix:** Keep Light/Dark only. Auto-detect system preference. Remove theme from being a visible navigation element.

---

## 8. Proposed Priority Fixes

### P0 — Must Fix (Blocking for first use)
| # | Fix | Effort | Impact |
|---|-----|--------|--------|
| F6 | Empty state for admin dashboard | Small | Unblocks first-time admins |
| F10/F11 | User dashboard onboarding text | Small | Unblocks first-time experts |
| F1 | Login page context / explanation | Small | Trust & comprehension |
| F18 | Summary page guided workflow | Large | Core admin experience |
| F33 | Waiting page timeline & expectations | Medium | Expert retention |

### P1 — Should Fix (Friction for recurring use)
| # | Fix | Effort | Impact |
|---|-----|--------|--------|
| F28 | Move previous synthesis to top of form | Small | Delphi process integrity |
| F21 | Group round advancement workflow | Medium | Admin efficiency |
| F7 | Expert invitation flow guidance | Medium | Admin onboarding |
| F36 | ThankYou page next actions | Small | Dead end elimination |
| F25 | Unsaved changes warning | Small | Data loss prevention |
| F19 | Unified header for SummaryPage | Medium | Layout consistency |

### P2 — Nice to Have (Polish)
| # | Fix | Effort | Impact |
|---|-----|--------|--------|
| F26 | Form progress indicator | Medium | Expert experience |
| F37 | Breadcrumb navigation | Small | Wayfinding |
| F29 | Structured input guidance text | Small | Expert comprehension |
| F32 | Auto-save indicator | Small | Expert confidence |
| F14 | Textarea for questions instead of input | Small | Admin experience |
| F20 | Synthesis mode labels | Small | Admin comprehension |

---

## 9. User Journey Summary Maps

### Expert Journey (Current)
```
📧 Receive invitation (somehow?)
  → 🌐 Open /login
  → ❓ "What is this?" (no context)
  → ✍️ Register / Login
  → 📋 Dashboard (empty, confusing)
  → 🔢 Enter join code (what code?)
  → 📝 Fill out form (structured input — good!)
  → 📨 Submit
  → ⏳ WaitingPage (dead end, no timeline)
  → 📊 ResultPage (synthesis + feedback)
  → ✅ ThankYou (dead end)
  → ❓ "Will there be a Round 2?" (no indication)
```

### Expert Journey (Ideal)
```
📧 Receive branded invitation email with deep link
  → 🌐 Open /register?invite=XXXXX
  → 💡 See consultation title, facilitator name, expected timeline
  → ✍️ Register with name + email
  → 📋 Dashboard shows "AI in Education — Round 1 (3 days remaining)"
  → 📝 Fill out structured form with guidance
  → 💾 Auto-save indicator, progress bar
  → 📨 Submit
  → ✅ "Submitted! 5/7 experts have responded. Expected synthesis: ~2 days."
  → 📧 Email when synthesis is ready
  → 📊 Rich synthesis view (agreements, tensions, emergence)
  → 📝 Round 2 form pre-loaded with your previous positions
  → ♻️ Repeat...
```

### Admin Journey (Current)
```
🔑 Login
  → 📋 Dashboard (form list or empty — no guidance)
  → ➕ Create Consultation (title + questions)
  → 📋 Copy join code (manual sharing)
  → ⏳ Wait for responses
  → 📊 Summary page (OVERWHELMING)
    → 🤖 Generate synthesis (which mode? which model?)
    → 📝 Edit synthesis (where?)
    → 💾 Save synthesis (sidebar)
    → ❓ Edit next round questions (buried at bottom)
    → ▶️ Start next round (sidebar, disconnected from questions)
```

### Admin Journey (Ideal)
```
🔑 Login
  → 📋 Dashboard with clear status for each consultation
  → ➕ Create Consultation with preview
  → 📧 Invite experts via email (branded invitations)
  → 📊 Summary page with guided workflow:
    Step 1: ✅ Review responses (3/7 in, 4 pending — send reminder?)
    Step 2: 🤖 Generate synthesis (recommended: Expert Committee)
    Step 3: 📝 Review, edit, approve synthesis
    Step 4: ▶️ Set next round questions → Start Round 2
```

---

## 10. Component-Level Observations

### Excellent Patterns to Keep
1. **LoadingButton** — unified loading state across all CTAs
2. **Toast system** — non-blocking success/error notifications
3. **ErrorBoundary** — graceful React error catching per route
4. **PasswordInput** — toggle visibility, consistent styling
5. **ThemeProvider** — CSS custom properties, smooth transitions, localStorage persistence
6. **CommandPalette** — keyboard navigation, fuzzy search, accessible dialog
7. **PresenceIndicator** — real-time collaboration awareness
8. **Stagger animations** — card entrance effects for lists

### Patterns to Reconsider
1. **Inline styles** — StructuredInput, SummaryHeader, many buttons use `style={{}}` alongside CSS variables. This makes theming harder to maintain and creates specificity issues.
2. **onMouseEnter/onMouseLeave** for hover states — used extensively (AdminDashboard table rows, Header buttons). These should be CSS `:hover` rules for performance and consistency.
3. **Raw `fetch()` in SummaryPage** — while other pages use the centralized `api` client, SummaryPage does raw fetch calls with manual auth headers. This bypasses the client's 401 handling.
4. **localStorage for auth** — standard but vulnerable to XSS. For government deployment, consider httpOnly cookies.

---

*End of review. Think like a first-time user. What would confuse your mother? Everything before F6 — the empty states and missing context. What would frustrate a busy government official? The summary page (F18) and the invisible round advancement workflow (F21).*
