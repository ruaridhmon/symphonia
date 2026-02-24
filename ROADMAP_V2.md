# Symphonia Roadmap V2
> Generated: 2026-02-21 18:08 GMT
> Status: Active Development

---

## Phase 1: Design Polish (This Week)
*Goal: Make it look like a product, not a prototype*

### 1.1 Design Review Integration
- [ ] Integrate Apple Design Specialist feedback
- [ ] Integrate Graphic Designer feedback  
- [ ] Integrate UX Flow Expert feedback
- [ ] Prioritize and implement top 20 issues

### 1.2 Logo & Brand
- [x] **Symphonia logo** — tuning fork Concept D (orchestral metaphor, best favicon viability)
- [x] Favicon (multi-size .ico + apple-touch-icon.png)
- [x] Loading animation (branded CSS bars + logo in index.html, auto-replaced on React mount)
- [x] Email templates styling (5 branded templates: invitation, new round, synthesis ready, reminder, welcome + preview endpoint)

### 1.3 Visual Consistency ✅ DONE
- [x] Color system audit (ensure dark/light parity) — skeleton/gradient vars added to all themes, hardcoded #fff → CSS vars
- [x] Typography scale standardization — documented modular scale in index.css header
- [x] Spacing/grid system (8px base) — --space-* design tokens + Tailwind grid-* utilities
- [x] Icon style unification (all Lucide, semantic colors) — .icon-* utility classes added

---

## Phase 2: Core UX Fixes (This Week)
*Goal: Remove friction, fix bugs*

### 2.1 Critical Bugs ✅ DONE
- [x] `[object Object]` in questions
- [x] Generate synthesis for past rounds
- [x] Consensus library import error
- [x] Session expiry redirect
- [x] API routing (`/api/forms` → `/forms`)
- [x] Single-expert disagreement hallucination

### 2.2 Page Separation ✅ DONE
- [x] Dashboard = list only
- [x] Create Consultation = separate page

### 2.3 Remaining UX
- [x] Remove duplicate empty states in AdminDashboard (was rendering twice)
- [x] Loading states for all async actions (ActionsCard: Save, Download now have spinners)
- [x] Error recovery — SummaryPage load failure now shows retry + back-to-dashboard
- [x] Empty states with helpful CTAs (AdminDashboard, UserDashboard already had good ones)
- [x] **Expert responses scrolling** (2026-02-24) — `ResponsesAccordion` expanded content now `maxHeight: 600px` + `overflowY: auto`; long response lists scroll instead of overflowing

---

## Phase 3: New Features — AI Enhancement (Next 2 Weeks)
*Goal: Differentiate from "Google Forms + ChatGPT"*

### 3.1 AI Devil's Advocate Section ✅ DONE
- [x] Backend: `/forms/{id}/rounds/{round_id}/devil_advocate` endpoint
- [x] Frontend: `DevilsAdvocate` component with Generate/Regenerate, strength badges
- [x] AI disclaimer banner, collapsible card, error handling

### 3.2 Expert Voice Mirroring ✅ DONE
- [x] Backend: `/forms/{id}/rounds/{round_id}/voice_mirror` endpoint
- [x] Frontend: `VoiceMirroring` component with Generate/toggle per response
- [x] Original vs Clarified toggle with inline comparison
- [x] AI disclaimer banner, error handling, toggle-all support
- [x] Integrated into ResponsesAccordion per expanded round

### 3.3 Audience Translation Toggle ✅ DONE
- [x] Backend: `/forms/{id}/rounds/{round_id}/translate` endpoint with 5 audience profiles
- [x] Frontend: `AudienceTranslation` dropdown component with live translation
- [x] Profiles: Policy Maker, Technical, General Public, Executive, Academic

### 3.4 AI Probe Questions ✅ DONE (2026-02-24)
- [x] Backend: `POST /forms/{id}/rounds/{round_id}/probe-questions` — reads all questions + responses + synthesis, generates 5–7 maximally-probing questions
- [x] Categories: `assumption`, `challenge`, `disagreement`, `depth`, `blind_spot`, `clarification`
- [x] Frontend: `ProbeQuestionsPanel` component — generate/regenerate button, category badges, per-question copy button
- [x] Wired into `SummaryPage` after AI Counterpoints
- [x] Works in mock mode until API key set, then activates automatically

### 3.5 AI Features API Key Fix ✅ DONE (2026-02-24)
- [x] Bug: backend only loaded `backend/.env` (no key there); root `.env` was never read
- [x] Fix: `routes.py` now loads root `.env` first, `backend/.env` overrides
- [x] `SYNTHESIS_MODE` changed `mock → simple` — real synthesis runs once key is present
- [x] **Action required:** add `OPENROUTER_API_KEY=sk-or-v1-...` to `symphonia-repo/.env`

---

## Phase 4: Structured Input (Next 2 Weeks)
*Goal: Better data in = better synthesis out*

### 4.1 Expert Input Templates ✅ DONE
- [x] Position field
- [x] Evidence field  
- [x] Confidence slider (1-10)
- [x] Counterarguments field (what argues against your position?)
- [x] Citations helper (Advanced section with chip-based input)
- [x] Expert nomination field (Advanced section with chip-based input)

### 4.2 Auto-Save ✅ DONE
- [x] Debounced localStorage save
- [x] Server-side draft persistence (Draft model + PUT/GET/DELETE endpoints + 2s debounced auto-save)
- [x] Resume incomplete responses (server draft restored on page load + dismissable banner)

---

## Phase 5: Synthesis Versioning (Next 2 Weeks)
*Goal: Iterate without losing work*

### 5.1 Version Management ✅ MOSTLY DONE
- [x] Backend: SynthesisVersion model
- [x] Backend: Generate for any round
- [x] UI: Version selector (pill buttons with active indicators)
- [x] UI: Compare versions side-by-side (VersionCompare component)
- [x] UI: "Publish" vs "Draft" states (badges + Publish button)
- [x] UI: Version history timeline (VersionTimeline component)

### 5.2 View/Edit Mode ✅ DONE
- [x] Toggle between rendered markdown and editor
- [x] Auto-switch to View mode after generation (already implemented in generateSummary)

---

## Phase 6: Architecture (Ongoing)
*Goal: Maintainable, scalable codebase*

### 6.1 Completed ✅
- [x] API client abstraction
- [x] SummaryPage decomposition (1414→672 lines)
- [x] Code splitting (1.3MB → 18KB initial)
- [x] TypeScript zero errors
- [x] React.memo for heavy components

### 6.2 Future
- [ ] TanStack Query for server state
- [ ] Zustand for client state
- [ ] E2E tests (Playwright)
- [ ] Component library documentation (Storybook)

---

## Phase 7: Government Readiness (Month 2)
*Goal: Meet UK GDS/security requirements*

- [ ] WCAG 2.2 AA accessibility audit
- [ ] Keyboard navigation complete
- [ ] Screen reader testing
- [x] httpOnly cookies (XSS protection) — session_token cookie, JS-inaccessible, SameSite=Lax
- [x] CSRF protection — double-submit cookie pattern, X-CSRF-Token header validation on state-changing requests
- [x] Audit logging for admin actions (AuditLog model + /audit-log endpoint + wired into key routes)
- [ ] GOV.UK Design System alignment review
- [x] Export to GOV.UK report format (GOV.UK-styled HTML report with findings cards, metadata, annexes, print CSS)

---

## Milestones

| Milestone | Target | Status |
|-----------|--------|--------|
| Design polish complete | Feb 24 | ✅ Complete (1.2 logo ✅, 1.3 visual consistency ✅, 1.1 design review ✅) |
| AI features MVP | Feb 28 | ✅ Complete (Devil's Advocate + Audience Translation + Voice Mirroring + Probe Questions) |
| Structured input complete | Mar 3 | ✅ Complete (templates + server drafts + resume) |
| Expert responses scrolling | Feb 24 | ✅ Complete — ResponsesAccordion maxHeight + scroll |
| AI features API key fix | Feb 24 | ✅ Complete — root .env loading + SYNTHESIS_MODE=simple |
| SPRIND demo ready | Mar 4 | 🔄 In Progress — core complete, polish ongoing |
| Government pilot ready | Mar 15 | ⏳ Planned |

## Completed Features Summary (as of 2026-02-24)

| Phase | Feature | Date |
|-------|---------|------|
| Foundation | 3-theme system, Byzantine synthesis adapter, OpenRouter integration | Feb 20 |
| Phase 1 | UX components, round navigation, synthesis display | Feb 21 |
| Phase 2 | Structured synthesis (agreements/disagreements/nuances/probes), expert attribution | Feb 21 |
| Phase 3 | Dimensional labels, cross-matrix heatmap, emergence highlighting, minority report | Feb 21 |
| Phase 4 | Real-time presence, response editing, comment threads, PDF/Markdown export | Feb 21 |
| Phase 5 | 171+ tests, Vision QA (8.05/10 avg) | Feb 21 |
| Phase 6 | Mobile, keyboard nav, skeletons, toast system, ⌘K palette, PWA, code splitting | Feb 21 |
| Gov/Security | httpOnly cookies, CSRF, audit logging, GOV.UK report export | Feb 22 |
| AI Features | Devil's Advocate, Audience Translation (5 profiles), Voice Mirroring | Feb 21–22 |
| Infra | Rate limiting, health endpoints, DB backups, cloudflared watchdog, i18n scaffold | Feb 23 |
| Analytics | Admin analytics dashboard (Recharts), form templates (7 pre-built), E2E Playwright | Feb 22–23 |
| AI Features+ | **AI Probe Questions** (assumption/challenge/disagreement/depth/blind_spot) | **Feb 24** |
| UX fixes | **Expert responses scrolling**, **API key env loading fix** | **Feb 24** |

---

## Team Assignments

| Track | Owner | Status |
|-------|-------|--------|
| Design Review | 3 agents (Apple/Graphic/UX) | 🔄 Running |
| Logo Design | Hephaestus | 🔜 Next |
| AI Features | TBD | ⏳ Planned |
| Structured Input | TBD | ⏳ Planned |

---

*This roadmap is a living document. Updated as work progresses.*
