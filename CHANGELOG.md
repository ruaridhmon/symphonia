# Symphonia — Changelog

> Auto-generated from git log. All 153 commits documented.  
> Last updated: 2026-02-24 by Hephaestus

---

## 2026-02-24 — AI Probe Questions + UX Fixes

### ✨ Features
- **AI Probe Questions** (`ProbeQuestionsPanel`) — new endpoint `POST /forms/{id}/rounds/{id}/probe-questions` generates 5–7 maximally-probing questions from full round context. Categories: `assumption`, `challenge`, `disagreement`, `depth`, `blind_spot`, `clarification`. Frontend panel with generate/regenerate button, category badges, per-question copy. Wired into SummaryPage after AI Counterpoints. ([Today])

### 🐛 Fixes
- **Expert responses scrolling** — expanded round content in `ResponsesAccordion` now has `maxHeight: 600px` + `overflowY: auto`; long response lists no longer overflow the viewport.
- **API key not loading** — backend `routes.py` now loads root `.env` first, then `backend/.env` override. Previously only `backend/.env` was read (which had no key). `SYNTHESIS_MODE` changed `mock → simple` so real synthesis activates once a key is set.
- **Two routing bugs** from visual QA audit (a094e44)
- **Admin dashboard UX** — analytics toggle, font reduction, lean sidebar (114bd19)
- **Defensive guards** for previous round navigation (355f086)
- `BarChart3` → `ChartNoAxesColumn` for lucide-react v0.575 (8941295)

---

## 2026-02-23 — Infrastructure Hardening + New Features

### ✨ Features
- **i18n scaffolding** — react-i18next, English translations, language switcher stub (eacef47)
- **Cloudflared tunnel watchdog** — auto-detect drops and restart (d5d0768)
- **Form templates system** — 7 pre-built templates with picker UI (f44e307)
- **Admin analytics dashboard** with Recharts (e19f5bb)
- **Rate limiting middleware** (slowapi) for auth, synthesis, and API routes (db8b364)
- **Synthesis export** (markdown/PDF/JSON) + download button (91e8a82)

### 🧪 Tests
- **Vitest** component tests — LoadingButton, SynthesisModeSelector, SynthesisProgress, StructuredSynthesis, RoundTimeline (29b6ae5)
- **Playwright E2E** expanded — auth, admin forms, synthesis, responsive (a1a8495)

### 🐛 Fixes
- **MessageSquare** import missing in RoundCard.tsx (dcacd51)
- **CF Access timeout** detection + back button error resilience (50d791c)
- **DB safeguards** — form count monitoring, health endpoint, backup retention (8c19738)
- **SQLite date casting** in admin analytics endpoint (151dd61)
- **Global exception handler**, synthesis 500 UX, protect reset scripts, DB backup on startup (7d1c520)
- **Auto-logout** on session expiry — proactive 5-min /me polling + redirect on idle expiry (0c03571)
- **Synthesis pipeline hardening** — status endpoint, error handling, WebSocket errors, tests (0b7f4c0)
- **SPA catch-all** no longer shadows API routes (/templates, /health, etc.) (224c7fa)
- **Mobile responsiveness** audit — all pages optimized for 375px+ (c707461)

### 🔧 Chore
- Docker compose hardening — healthchecks, WebSocket proxy, env example, dev mode (c04d423)
- GitHub Actions CI + consensus sync workflows (2cf6fd1)
- Rebuild frontend dist with latest component changes (c09941f)
- Fix TTD route through consensus library adapter (DiffusionStrategy) (90d75db)

---

## 2026-02-22 — Government Readiness + AI Features + Settings

### ✨ Features
- **GOV.UK-styled report export** — HTML report with findings cards, metadata, annexes, print CSS (8d86c28)
- **AI Question Assistant** — suggest, critique, improve questions with Delphi methodology (a98d085)
- **httpOnly cookie auth + CSRF protection** (Phase 7 security) (ca555ef)
- **Audit logging** for admin actions (AuditLog model + /audit-log endpoint) (0a3da02)
- **Branded email templates** — 5 templates: invitation, new round, synthesis ready, reminder, welcome (3dbbc9f)
- **Visual consistency** Phase 1.3 — design tokens, dark-mode skeleton colors, icon utilities (54e9aff)
- **Form creation** extracted to dedicated /admin/forms/new page (0b31b33)
- **Server-side draft persistence** Phase 4.2 (eeaa77f)
- **Floating overlay sidebar** panel (24ccc27)
- **Float-in action button** on form items (5966af8)
- **Playwright E2E** setup — 5/5 smoke tests passing, full journey spec (1d8002f)
- **Settings page** — synthesis strategy, convergence threshold, max rounds, anonymous/late-join defaults, AI suggestions count (f843697)
- **Settings** — synthesis model config, Opus 4.6 default, ai/suggest uses same model (c5467fc)
- **Guide modal** — full Symphonia feature set (heatmap, cross-analysis, voice mirroring, 3 synthesis strategies) (040f753)

### 🐛 Fixes
- **GOV.UK export** blob download, PDF rich structured HTML (47149d1)
- **ai/suggest** — valid OpenRouter model ID (gemini-flash-1.5) (ed4ce40)
- **Guide modal** — standard Delphi first, then Symphonia augmentation (93dec3f)
- **Flood-fill background removal** from corners, no more white box in logo (fe7f772)
- **Summary page icons** — Users/TrendingUp/ClipboardList, real logo in header (cd34902)
- **Redirect loop** — clear access_token on 401, restore Bearer header as fallback (6cbb353)
- **Transparent logo backgrounds** dark/light (134cc7c, dfe3e0c)
- **Sidebar** overlays content — remove marginRight push (c7613c5)
- **Missing sidebarOpen** useState declaration (891e428)
- Form creation page widened to lg container (6ada129)
- Follow-up questions are suggestions, admin stays in control (1d8fd00)

---

## 2026-02-21 — Full Feature Sprint (100+ commits, the core build)

> This was the primary build day — Phase 1 through Phase 6 all shipped.

### Foundation (Feb 20 evening)
- `da33483` — **Initial commit** (concordia prototype added)
- **OpenRouter-only** synthesis path, remove Anthropic token pools (9060ed8)
- **Committee synthesis engine**, follow-up system, data model extensions (827cf35)
- **3-theme system** (Apple/Gov/Default) with zero-flash switching (f5bc818)
- `backend/consensus` → `backend/core` rename to avoid namespace conflict (3b68b90)
- **Byzantine-integrated consensus adapter** (2 workers + integrator) (7ff3f5c)
- **Hecate dimensional UI** revamp (Layout + Visual + Motion) (5eb15b7)

### Phase 1 & 2 — UX Foundation + Structured Synthesis
- UX components added: LoadingButton, MarkdownRenderer, SynthesisProgress, RoundTimeline, StructuredSynthesis, SynthesisModeSelector (40afccd)
- SummaryPage, ResultPage, WaitingPage, FormPage overhauled (c607672)
- RoundTimeline v2 — horizontal stepper + cards + RoundCard detail view (e01ec32)
- Synthesis mode selector wired into SummaryPage sidebar (e5ec506)
- SynthesisDisplay integrated with MarkdownRenderer (dd01116)

### Phase 3 — Dimensional Search
- **3.1** Dimensional expert labels — Past/Present/Future presets, backend persistence (d13760c, ed4e5d5)
- **3.2** Cross-matrix visualization — NxN heatmap, pairwise agreement/disagreement, hover tooltips (9381cc3)
- **3.3** Emergence highlighting — shimmer-border cards, type badges, expert attribution (a8ce9e4)
- **3.4** Minority report display — what was lost in synthesis (3d3a5ad)

### Phase 4 — Collaboration Features
- **4.1** Real-time presence indicator (WebSocket, auto-reconnect, heartbeats) (c8b4a84)
- **4.2** Response editing with optimistic locking & conflict resolution (622b718)
- **4.3** Comment threads on synthesis sections (209dd97)
- **4.4** Export to PDF/Markdown — ExportPanel with full synthesis export (c8af8ee)
- All Phases 1-4 wired into SummaryPage (3d481aa)

### Phase 5 — Testing
- E2E simulated tests — full user journey (37f8383)
- Consensus library integration tests — 48 tests across 8 classes (3870f91)
- Synthesis output validation — 62 tests across 9 classes (112fd76)
- Error scenario coverage — 61 tests (f5f91dd)
- Vision QA loop — avg 8.05/10 (be578f9)

### Phase 6 — Polish & Performance
- **6.1** Mobile responsive design — hamburger menu, sidebar sticky, fullscreen modal (ec28e55)
- **6.2** Keyboard navigation — skip links, focus-visible rings, roving tabindex, ARIA accordion, modal focus traps (a596cef)
- **6.3** Skeleton loading states + React.memo perf (7296cd7)
- Toast notification system — replaced all 9 alert() calls (4fdcc7f)
- 404 page + dynamic document titles (38d1a29)
- ⌘K command palette, copy join codes, admin search, stagger animations (9bf3af7)
- PWA manifest, password toggle, print styles, API client migration (079f3a5)
- Code splitting: SummaryPage chunk 75.6KB → 49.1KB (cd4de84)

### Architecture & Quality
- SummaryPage decomposed 1414 → 672 lines (499c57c)
- API client: zero raw fetch, zero `any` types, zero emoji in production (c1a9669)
- TypeScript: zero errors (9ff7673)
- Security headers, typed auth, selective logout (1b67c54)
- WebSocket real-time features + favicon + meta tags (2212e99)
- WebSocket broken fix — install uvicorn[standard] for Python 3.12 (4e03133)

### Design System
- Symphonia tuning fork logo — Concept D (orchestral metaphor, best favicon) (af615ad)
- Branded loading animation + version compare side-by-side (84ba0b9)
- Expert Voice Mirroring Phase 3.2 (4e6d13e)
- Version History Timeline Phase 5.1 (371a4a9)
- Converging waves design system (1897eb1)
- Top 28 design fixes from 3-reviewer synthesis (f13bc57)

### AI Features (Phase 3 V2)
- **AI Devil's Advocate** — backend endpoint + DevilsAdvocate component with strength badges (3d7dd69)
- **Audience Translation** — 5 profiles (Policy Maker, Technical, General Public, Executive, Academic) (3d7dd69)
- **Expert Voice Mirroring** — backend endpoint + VoiceMirroring component, original/clarified toggle (4e6d13e)

---

## 2025-11-28 — Origin

- **da33483** — Initial commit: concordia prototype (the seed that became Symphonia)

---

## Statistics

| Metric | Value |
|--------|-------|
| Total commits | 153 |
| Span | Nov 28 2025 → Feb 24 2026 |
| Core build day | Feb 21 2026 (Phase 1–6 shipped) |
| Features shipped | 40+ |
| Tests written | 171+ (48 integration + 62 validation + 61 error) |
| Vision QA score | 8.05/10 avg |
| Frontend bundle | 75.6KB → 49.1KB (SummaryPage chunk) |
| SummaryPage refactor | 1414 → 672 lines |
| TypeScript errors | 0 |

---

*Maintained by Hephaestus 🔥 — the forge that remembers everything.*
