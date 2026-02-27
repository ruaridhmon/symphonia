# Symphonia — Changelog

> Auto-generated from git log. Last updated: 2026-02-24 by Hephaestus

---

## 2026-02-24

### 🏗 Architecture
- **Model resolution unified:** `translate_synthesis`, `counterarguments`, `generate_probe_questions`, and `clarify_responses` all hardcoded `model="anthropic/claude-sonnet-4"` — bypassing the app Settings entirely. Fixed: all 4 now call `_resolve_synthesis_model(db)` which respects Admin → Settings → `synthesis_model` first. Set your preferred model once in the app, all AI features follow. See `AGENTS.md` for the full resolution chain and template for new endpoints.

### ✨ Features
- `a4b4c86` feat: AI probe questions endpoint + dual .env loading (root + backend)
- `114bd19` feat: admin dashboard UX redesign — analytics toggle, font reduction, lean sidebar

### 🐛 Fixes
- `a094e44` fix: two routing bugs from visual QA audit
- `355f086` fix: defensive guards for previous round navigation
- `8941295` fix: replace BarChart3 with ChartNoAxesColumn for lucide-react v0.575

### 📝 Docs
- `027d2c1` docs: CHANGELOG (153 commits), ROADMAP_V2 updated with today's work + completed milestones

### 🔧 Chore
- `8970a0c` chore: update E2E test results and docs
- `95fecd3` chore: rebuild frontend dist, fix SYNTHESIS_MODE=mock→simple

## 2026-02-23

### ♿ Accessibility
- `166c06a` a11y: accessibility hardening — focus traps, skip links, ARIA audit

### ✨ Features
- `0b7f4c0` feat: harden synthesis pipeline — status endpoint, error handling, WebSocket errors, tests
- `eacef47` feat: i18n scaffolding — react-i18next, English translations, language switcher stub
- `d5d0768` feat: cloudflared tunnel watchdog — auto-detect drops and restart
- `f44e307` feat: form templates system — 7 pre-built templates with picker UI
- `e19f5bb` feat: admin analytics dashboard with Recharts
- `db8b364` feat: rate limiting middleware (slowapi) for auth, synthesis, and API routes
- `91e8a82` feat: synthesis export (markdown/PDF/JSON) + download button
- `9fd19c8` feat: synthesis export, rate limiting, UI improvements

### 🐛 Fixes
- `dcacd51` fix: add missing MessageSquare import to RoundCard.tsx
- `50d791c` fix: CF Access timeout detection + back button error resilience
- `8c19738` fix: DB safeguards — form count monitoring, health endpoint, backup retention
- `151dd61` fix: SQLite date casting in admin analytics endpoint
- `7d1c520` fix: global exception handler, synthesis 500 UX, protect reset scripts, DB backup on startup
- `0c03571` fix: auto-logout on session expiry — proactive 5-min /me polling + redirect on idle expiry
- `224c7fa` fix: SPA catch-all no longer shadows API routes (/templates, /health, etc.)
- `c707461` fix: mobile responsiveness audit — all pages optimized for 375px+
- `90d75db` fix: wire TTD route through consensus library adapter (DiffusionStrategy)

### 📝 Docs
- `6267c0e` docs: comprehensive OpenAPI documentation for all backend routes

### 🔧 Chore
- `c09941f` chore: rebuild frontend dist with latest component changes
- `c04d423` chore: Docker compose hardening — healthchecks, WebSocket proxy, env example, dev mode
- `2cf6fd1` chore: add GitHub Actions CI + consensus sync workflows

### 🧪 Tests
- `a1a8495` test: expand E2E Playwright test suite — auth, admin forms, synthesis, responsive
- `29b6ae5` test: Vitest setup + component tests for LoadingButton, SynthesisModeSelector, SynthesisProgress, StructuredSynthesis, RoundTimeline

## 2026-02-22

### ✨ Features
- `1d8002f` feat(e2e): Playwright setup — 5/5 smoke tests passing, full journey spec written
- `f843697` feat: settings — synthesis strategy, convergence threshold, max rounds, anonymous/late-join defaults, AI suggestions count
- `c5467fc` feat: settings page — synthesis model config, Opus 4.6 default, ai/suggest uses same model
- `040f753` feat: guide — full Symphonia feature set (heatmap, cross-analysis, voice mirroring, 3 synthesis strategies)
- `8d86c28` feat: GOV.UK-styled report export (Phase 7)
- `a98d085` feat: AI Question Assistant — suggest, critique, improve questions with Delphi methodology
- `ca555ef` feat: httpOnly cookie auth + CSRF protection (Phase 7 security)
- `0a3da02` feat: audit logging for admin actions (Phase 7 gov readiness)
- `3dbbc9f` feat: branded email templates (invitation, new round, synthesis ready, reminder, welcome)
- `54e9aff` feat: Phase 1.3 visual consistency — design tokens, dark-mode skeleton colors, icon utilities
- `0b31b33` feat: extract form creation to dedicated /admin/forms/new page
- `eeaa77f` feat: server-side draft persistence (Phase 4.2)
- `24ccc27` feat: convert sidebar to floating overlay panel
- `5966af8` feat: float-in action button on form items — more horizontal space
- `371a4a9` feat: Version History Timeline (Phase 5.1) + roadmap audit

### 🐛 Fixes
- `47149d1` fix: GOV.UK export (blob download), PDF uses rich structured HTML
- `ed4ce40` fix: ai/suggest — use valid OpenRouter model ID (gemini-flash-1.5)
- `1d8fd00` fix: guide — follow-up questions are suggestions, admin stays in control
- `fe7f772` fix: proper background removal via flood-fill from corners — no more white box
- `93dec3f` fix: guide modal — standard Delphi first, then Symphonia augmentation
- `cd34902` fix: summary page icons — Users/TrendingUp/ClipboardList, real logo in header
- `6cbb353` fix: redirect loop — clear access_token on 401, restore Bearer header as fallback
- `134cc7c` fix: transparent logo backgrounds — no more white box in either mode
- `dfe3e0c` fix: dark mode logo — invert+hue-rotate so white bg disappears, logo stays blue
- `6ada129` fix: widen form creation page to lg container (1024px)
- `c7613c5` fix: sidebar overlays content — remove marginRight push
- `891e428` fix: add missing sidebarOpen useState declaration

### 📝 Docs
- `2357bd7` docs: update roadmap — email templates + audit logging complete
- `3a9aaa0` docs: mark Phase 1.3 Visual Consistency complete
- `0a1ceae` docs: mark Phase 4.2 complete (server drafts + resume)

## 2026-02-21

### ♻️ Refactor
- `c1a9669` refactor: complete API client migration — zero raw fetch, zero any types, zero emoji in production
- `ac69106` refactor: FormPage API client migration, shared synthesis types, type cleanup

### ⚡ Performance
- `cd4de84` perf: code splitting + FormEditor modernization

### ✨ Features
- `4e6d13e` feat: Expert Voice Mirroring (Phase 3.2)
- `84ba0b9` feat: branded loading animation + version compare side-by-side
- `6e6caee` feat: Phase 2.3 UX fixes + logo upgrade (tuning fork Concept D)
- `f68d556` feat: redesign Existing Forms section — search, table polish, mobile cards
- `af615ad` feat: integrate Symphonia logo + design system docs
- `f13bc57` feat(design): implement top 28 fixes from 3-reviewer design synthesis
- `3d7dd69` feat: AI Devil's Advocate + Audience Translation (Phase 3.1 & 3.3)
- `9431dff` feat: system theme auto-detection, offline banner, keyboard shortcuts help, cleanup build artifacts
- `079f3a5` feat: PWA manifest, password toggle, print styles, API client migration
- `9b8ed54` feat(ux): ⌘K command palette, copy join codes, admin search, stagger animations
- `18c3a17` feat: question-first UX + response toggle redesign
- `f1600fe` feat: add WebSocket message forwarding to usePresence hook for auto-refresh
- `71e23d1` feat: integrate expert comments into synthesis generation
- `38d1a29` feat(ux): 404 page + dynamic document titles across all routes
- `4fdcc7f` feat(ux): toast notification system — replace all 9 alert() calls with themed toasts
- `7296cd7` feat(polish): skeleton loading states + React.memo performance optimization
- `a596cef` feat(a11y): add comprehensive keyboard navigation (6.2)
- `ec28e55` feat(frontend): 6.1 mobile responsive design - hamburger menu, sidebar fix, modal fullscreen, layout improvements
- `be578f9` feat(ui): vision QA polish — score 8/10
- `2d632ff` feat: View/Edit synthesis toggle + structured JSON for all synthesis modes
- `3870f91` feat(tests): add consensus library integration tests (task 5.2)
- `37f8383` feat(tests): add simulated E2E tests for full user journey (task 5.1)
- `c8af8ee` feat(4.4): Export to PDF/Markdown - ExportPanel with full synthesis export
- `3d481aa` feat: wire all Phase 1-4 components into SummaryPage.tsx
- `209dd97` feat(4.3): comment threads on synthesis sections
- `622b718` feat: response editing with optimistic locking & conflict resolution
- `c8b4a84` feat(4.1): real-time presence indicator (who's viewing)
- `3d3a5ad` feat(3.4): Minority report display — what was lost in synthesis
- `a8ce9e4` feat(3.3): emergence highlighting — surface insights not in any single response
- `9381cc3` feat(3.2): cross-matrix visualization for dimensional expert agreement/conflict
- `d13760c` feat(3.1): add persistent dimensional expert labels with multiple presets
- `ed4e5d5` feat(ui): dimensional expert labels with configurable names (Phase 3.1)

### 🎨 Design
- `1897eb1` design: converging waves design system — logo-compatible

### 🐛 Fixes
- `c705c2e` fix(seed): align synthesis_json field names with TypeScript types
- `e54be96` fix(router): move SummaryPage outside PageLayout to fix double header
- `2212e99` fix: WebSocket real-time features + favicon + meta tags
- `4e03133` fix: WebSocket connections broken — install uvicorn[standard] for Python 3.12
- `9ff7673` fix(ts): zero TypeScript errors — Vite types, aligned Round types, typed params, file-saver declaration
- `928e1af` fix: resolve critical rendering bugs in FormEditor, FormPage, and ResponsesModal

### 📝 Docs
- `dda4be4` docs: update roadmap — Phase 2.3 complete, logo done
- `452fd47` docs: update roadmap with P12 final polish completion
- `239751a` docs: update roadmap with P11 complete API migration & final cleanup
- `707d491` docs: update roadmap with P10 type safety & architecture completion
- `a475365` docs: update roadmap with P9 security hardening
- `64e8379` docs: update roadmap with P8 completion
- `9bf3af7` docs: update roadmap with 404 page + dynamic titles completion
- `adfc691` docs: update roadmap with toast notification completion
- `667c746` docs: mark 6.1 mobile responsive design complete
- `a0e52c2` docs: mark Phase 5 complete, add Vision QA log
- `961b235` docs: mark tasks 5.3 and 5.4 as complete
- `b74f944` docs: mark 4.2 & 4.3 complete, advance pulse to 4.4
- `9c6921d` docs: mark 3.3 emergence highlighting complete
- `4bc0ace` docs: mark 3.2 complete, advance pulse to 3.3
- `ca6b43d` docs: mark 3.1 complete, advance pulse to 3.2
- `25cee1c` docs: mark Phase 1 & 2 as complete, advance pulse to Phase 3.1

### 📦 Other
- `391ff04` Phase 2.3 + 5.1: Remove duplicate generate button, add empty state CTA, visual version selector
- `1b67c54` hardening: security headers, typed auth, selective logout, better errors
- `985f043` P7: Accessibility & expert UX improvements
- `2e94a1e` polish: AdminDashboard API client migration, dark mode auth fix, form accessibility
- `499c57c` P3: Decompose SummaryPage (1414→672 lines) + mobile responsiveness
- `73f76e7` P2 polish: duplicate footer cleanup, button consistency, error handling with retry
- `8c6a7cc` Remove OTP authentication completely
- `e4a38c8` Add debug logging to AdminDashboard.tsx
- `426f790` Add comprehensive debug logging to SummaryPage.tsx

### 🔄 Pulse
- `c39ee68` pulse: complete 4.4, advance to Phase 5

### 🔧 Chore
- `1ca51a7` chore: add reset_and_seed.py — wipes forms and seeds 10 fresh government consultations

### 🧪 Tests
- `f5f91dd` test(5.4): comprehensive error scenario coverage
- `112fd76` test(5.3): add synthesis output validation tests

## 2026-02-20

### ♻️ Refactor
- `3b68b90` refactor: rename backend/consensus → backend/core to avoid namespace conflict

### ✨ Features
- `e01ec32` feat: round navigation — enhanced RoundTimeline v2 with horizontal stepper + cards, RoundCard detail view
- `e5ec506` feat: wire synthesis mode selector + structured display into SummaryPage
- `dd01116` feat: integrate SynthesisDisplay with MarkdownRenderer, extend Round type, add RoundCard CSS
- `c607672` feat: overhaul SummaryPage, ResultPage, WaitingPage, FormPage with new UX
- `40afccd` feat: add UX components — LoadingButton, MarkdownRenderer, SynthesisProgress, RoundTimeline, StructuredSynthesis, SynthesisModeSelector
- `5eb15b7` feat: Hecate dimensional UI revamp (Layout + Visual + Motion)
- `7ff3f5c` feat: Byzantine-integrated consensus adapter (2 workers + integrator)
- `b4cc776` feat(auth): Add email OTP lockdown for Symphonia
- `827cf35` feat: add committee synthesis engine, follow-up system, and data model extensions
- `f5bc818` feat(theme): add 3-theme system with zero-flash switching

### 🐛 Fixes
- `ea97a07` fix: mock mode fallback for generate_summary when no OpenRouter API key
- `8c13e40` fix: parse JSON answers before accessing dict methods
- `c60edde` fix: correct consensus library repo URL (axiotic-ai/consensus)
- `5fb96b2` fix(ux): Complete user experience path

### 📝 Docs
- `23dc0b3` docs: add auto-rebuild step to pulse, Vision QA requirements
- `bf4d04a` docs: add Phase 5 Testing (Sam's directive) before Polish
- `00ab6c6` docs: add development roadmap with 5 phases
- `08183ab` docs: add Apple/Government theme option — trust-first design for gov deployments
- `c8234f9` docs: update PLAN.md — committee synthesis, dual UX flows, no external deps
- `34dd844` docs: add PLAN.md (redesign roadmap) and PROJECT_SPEC.md (original brief)

### 📦 Other
- `9060ed8` symphonia: OpenRouter-only synthesis path; remove Anthropic token pools; groundwork for OpenRouter as last bastion

### 🔧 Chore
- `0768cd2` chore: remove unused SynthesisDisplay import from SummaryPage, rebuild dist

## 2025-11-28

### 📦 Other
- `da33483` adding concordia

---

## Statistics

| Metric | Value |
|--------|-------|
| Total commits | 157 |
| First commit | 2025-11-28 |
| Last commit | 2026-02-24 |

*Maintained by Hephaestus 🔥*