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
- [ ] **Symphonia logo** — orchestral/synthesis metaphor
- [ ] Favicon
- [ ] Loading animation
- [ ] Email templates styling

### 1.3 Visual Consistency
- [ ] Color system audit (ensure dark/light parity)
- [ ] Typography scale standardization
- [ ] Spacing/grid system (8px base)
- [ ] Icon style unification (all Lucide, semantic colors)

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
- [ ] Remove duplicate "Generate" buttons (consolidate)
- [ ] Loading states for all async actions
- [ ] Error recovery (retry buttons everywhere)
- [ ] Empty states with helpful CTAs

---

## Phase 3: New Features — AI Enhancement (Next 2 Weeks)
*Goal: Differentiate from "Google Forms + ChatGPT"*

### 3.1 AI Devil's Advocate Section
**What:** AI-generated counterarguments, clearly separated from expert views
**UI:** New card type "🤖 AI-Generated Counterpoints"
**Backend:** Add `ai_counterarguments` field to SynthesisResult
**Prompt:** "What perspectives did experts NOT consider?"

### 3.2 Expert Voice Mirroring
**What:** Clarify expert statements without changing meaning
**UI:** Toggle to show "Original" vs "Clarified" for each quote
**Backend:** Add `clarified_text` field to evidence excerpts
**Prompt:** "Rephrase this for accessibility while preserving nuance"

### 3.3 Audience Translation Toggle
**What:** Re-render synthesis for different reader profiles
**UI:** Dropdown in synthesis header: "Translate for: [Policy Maker ▾]"
**Profiles:**
- Policy Maker (actionable, regulatory framing)
- Technical Expert (precise, caveats preserved)
- General Public (plain language, analogies)
- Executive (bottom-line, risk/opportunity)
- Academic (citations, methodology)

**Backend:** New endpoint `/forms/{id}/rounds/{round_id}/translate`
**Prompt:** Audience-specific system prompts

---

## Phase 4: Structured Input (Next 2 Weeks)
*Goal: Better data in = better synthesis out*

### 4.1 Expert Input Templates ✅ PARTIALLY DONE
- [x] Position field
- [x] Evidence field  
- [x] Confidence slider (1-10)
- [ ] Counterarguments field (what argues against your position?)
- [ ] Citations helper
- [ ] Expert nomination field

### 4.2 Auto-Save ✅ DONE
- [x] Debounced localStorage save
- [ ] Server-side draft persistence
- [ ] Resume incomplete responses

---

## Phase 5: Synthesis Versioning (Next 2 Weeks)
*Goal: Iterate without losing work*

### 5.1 Version Management ✅ PARTIALLY DONE
- [x] Backend: SynthesisVersion model
- [x] Backend: Generate for any round
- [ ] UI: Version selector dropdown
- [ ] UI: Compare versions side-by-side
- [ ] UI: "Publish" vs "Draft" states
- [ ] UI: Version history timeline

### 5.2 View/Edit Mode ✅ DONE
- [x] Toggle between rendered markdown and editor
- [ ] Auto-switch to View mode after generation

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
- [ ] httpOnly cookies (XSS protection)
- [ ] CSRF protection
- [ ] Audit logging for admin actions
- [ ] GOV.UK Design System alignment review
- [ ] Export to GOV.UK report format

---

## Milestones

| Milestone | Target | Status |
|-----------|--------|--------|
| Design polish complete | Feb 24 | 🔄 In Progress |
| AI features MVP | Feb 28 | ⏳ Planned |
| Structured input complete | Mar 3 | ⏳ Planned |
| SPRIND demo ready | Mar 4 | ⏳ Planned |
| Government pilot ready | Mar 15 | ⏳ Planned |

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
