# Symphonia — Feature Reference

> **Version:** 2.0  
> **Last Updated:** 2026-02-22  
> **Platform:** Symphonia by Axiotic AI  
> **Purpose:** Complete feature inventory for developers, stakeholders, and deployment planning

---

## Overview

Symphonia is a Delphi-style expert consensus platform that combines structured expert input with AI-powered synthesis to produce transparent, high-signal policy artefacts. Experts answer structured questions independently; an AI synthesis engine identifies agreements, disagreements, and nuance; experts review and iterate until convergence.

---

## 1. Core Delphi Protocol

### 1.1 Multi-Round Iteration
- Structured iterative rounds: experts submit → AI synthesises → experts review → next round
- Admin controls round progression with configurable questions per round
- Previous round synthesis displayed prominently when starting a new round
- Convergence score computed automatically from claim-level agreement ratios

### 1.2 Structured Expert Input
- Questions defined as structured objects with type metadata (`text`, `textarea`, `select`, `rating`)
- Required/optional field marking per question
- Experts submit independently (no cross-contamination of responses)
- Response versioning with optimistic locking for concurrent edit detection

### 1.3 Join Code Access Control
- Each form has a unique join code for expert access
- Experts unlock forms by entering the join code
- Admin can toggle `allow_join` to close enrollment
- `UserFormUnlock` model tracks per-user form access

### 1.4 Follow-Up System
- **Human follow-ups:** Experts post follow-up questions after viewing synthesis
- **AI follow-ups:** In `ai_assisted` mode, the synthesis engine generates targeted probes
- Threaded responses on follow-up questions
- Follow-up context fed into subsequent synthesis rounds

---

## 2. Synthesis Engine

### 2.1 Three Synthesis Strategies

| Strategy | Description | Best For |
|----------|-------------|----------|
| **SinglePrompt** (`simple`) | One-shot LLM synthesis with structured JSON output | Fast iteration, small panels |
| **TTD / Diffusion** (`ttd`) | Iterative refinement with fitness evaluation via `DiffusionStrategy` | High-quality synthesis, large panels |
| **Committee** (`committee`) | Multi-agent synthesis (falls back to TTD with warning; full committee not yet in library) | Future: maximum robustness |

All strategies produce the same `SynthesisResult` schema for UI compatibility.

### 2.2 Structured Synthesis Output
Every synthesis produces:
- **Agreements** — Claims with supporting experts, confidence scores (0–1), evidence summaries, and per-expert evidence excerpts (direct quotes)
- **Disagreements** — Topics with opposing positions, expert attribution, severity rating (`low`/`moderate`/`high`)
- **Nuances** — Contextual qualifications and uncertainties with relevant expert links
- **Emergent Insights** — Cross-pollination ideas that emerge from combining multiple expert perspectives
- **Minority Reports** — Dissenting positions that were outvoted, with counterpoints and original evidence preserved
- **Follow-Up Probes** — AI-generated questions targeting specific experts to resolve ambiguity
- **Confidence Map** — Overall consensus ratio, agreement/disagreement counts, per-category scores
- **Provenance** — Full traceability: strategy used, model, prompt version, code version
- **Narrative** — Prose summary of the synthesis

### 2.3 Synthesis Versioning
- Every synthesis generation creates a new `SynthesisVersion` record (v1, v2, v3…)
- Side-by-side version comparison in the UI
- Version history timeline showing all past syntheses
- Admin can activate/publish any version — deactivates all others
- Model and strategy recorded per version for audit

### 2.4 Mock Synthesis Mode
- Returns pre-baked realistic synthesis data for UX testing without API costs
- Activated automatically when `OPENROUTER_API_KEY` is unset or `SYNTHESIS_MODE=mock`
- Produces all synthesis section types (agreements, disagreements, emergent insights, minority reports)

### 2.5 Expert Discussion Comments in Synthesis
- Expert comments posted on synthesis sections are collected and formatted as additional context
- Fed into the next synthesis generation as "Expert Discussion Comments"
- LLM integrates discussion points naturally (e.g., "In discussion, experts also noted…")
- Grouped by section type (agreement, disagreement, nuance, emergence)

---

## 3. AI Features

### 3.1 AI Question Assistant
Three modes for designing better Delphi consultation questions:
- **Suggest** — Generate N new question suggestions based on consultation title/description (count configurable via settings)
- **Critique** — Review existing questions for weaknesses with severity ratings (`low`/`medium`/`high`)
- **Improve** — Rewrite existing questions to be better Delphi questions with explanations

Uses the configured synthesis model (default: Claude Opus 4.6). Informed by Delphi methodology principles built into the system prompt.

### 3.2 AI Devil's Advocate
- Generates 3–5 steel-man counterarguments for the current synthesis
- Identifies blind spots, missing perspectives, and unrepresented positions
- Each counterargument rated by strength (`strong`/`moderate`/`weak`)
- Uses expert responses + current synthesis as context

### 3.3 Audience Translation
Translates synthesis output for five audience lenses:
| Audience | Style |
|----------|-------|
| **Policy Maker** | Actionable recommendations, regulatory framing, risk assessment |
| **Technical** | Precise terminology, confidence intervals, methodological limitations |
| **General Public** | Plain language, analogies, practical implications |
| **Executive** | Bottom-line up front, 3 key bullets, decision-oriented |
| **Academic** | Epistemic uncertainty, citation-style references, hedging language |

### 3.4 Expert Voice Mirroring
- Clarifies expert statements for accessibility without changing meaning
- Simplifies jargon with parenthetical explanations
- Breaks complex sentences into shorter, clearer ones
- Preserves all caveats, qualifications, and uncertainty language
- Will not add information the expert didn't provide or strengthen/weaken claims

---

## 4. Collaboration Features

### 4.1 Real-Time Presence
- WebSocket-based presence tracking: see who's viewing the same form
- Deterministic color assignment per user (MD5 hash of email → 10-color palette)
- Heartbeat keep-alive with 30-second timeout for stale connection cleanup
- Page-level presence (which page each user is on)
- `usePresence` React hook with auto-reconnect

### 4.2 Synthesis Comments
- Threaded comments on specific synthesis sections (agreement, disagreement, nuance, emergence, general)
- One level of nesting (replies to top-level comments)
- Real-time broadcast via WebSocket when new comments are posted
- Author attribution with email
- Edit own comments, delete own (or admin can delete any)
- Comments integrated into next synthesis generation as additional context

### 4.3 Response Editing with Conflict Resolution
- Admin can edit participant responses with optimistic locking
- Version tracking on responses (incremented on each edit)
- 409 Conflict returned if response was modified by another user since last fetch
- Force-edit option available for admins to override conflicts

### 4.4 Server-Side Draft Persistence
- Auto-save of in-progress expert responses to the server
- One draft per user per form (for the active round)
- Draft loaded automatically when returning to a form
- Draft deleted on successful submission
- `PUT /forms/{id}/draft`, `GET /forms/{id}/draft`, `DELETE /forms/{id}/draft` endpoints

---

## 5. Export & Reporting

### 5.1 GOV.UK-Styled Report Export
- Rich structured HTML report generation styled for government consumption
- Blob download (client-side file generation, no server round-trip)
- Includes all synthesis sections: agreements, disagreements, nuances, emergent insights, minority reports
- Structured with proper headings, evidence excerpts, confidence scores

### 5.2 PDF/Markdown Export
- `ExportPanel` component with comprehensive Markdown export
- Browser-native PDF via styled print dialog
- Print-specific CSS styles for clean document output

---

## 6. Security

### 6.1 httpOnly Cookie Authentication
- JWT stored as httpOnly cookie (`session_token`) — immune to XSS
- CSRF token set as readable cookie (`csrf_token`) — JS reads and sends as `X-CSRF-Token` header
- Double-submit cookie pattern for CSRF protection on state-changing requests
- Bearer token fallback for backward compatibility during migration
- 24-hour token expiry, configurable via `ACCESS_TOKEN_EXPIRE_MINUTES`

### 6.2 CSRF Protection Middleware
- Applied to all state-changing HTTP methods (POST, PUT, PATCH, DELETE)
- Exempt paths: `/login`, `/register`, `/logout`, `/ws`
- Skipped when Authorization: Bearer header is present (API clients)
- Returns 403 with clear error message on CSRF token mismatch

### 6.3 Security Headers
Applied to every response:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`
- Aggressive caching for `/assets/` (1 year, immutable)
- No-store for `/api/` responses

### 6.4 Audit Logging
- Immutable `AuditLog` table for all admin state-changing actions
- Recorded fields: timestamp, user ID/email, action type, resource type/ID, detail JSON, IP address
- Actions logged: `create_form`, `update_form`, `delete_form`, `generate_summary`, `send_invitation`
- Admin-only query API with filtering by action type and user ID
- Pagination support (limit/offset)

---

## 7. Admin Tools

### 7.1 Settings Page
Configurable platform settings (stored in `Setting` model as key-value pairs):

| Setting | Default | Description |
|---------|---------|-------------|
| `synthesis_model` | `anthropic/claude-opus-4-6` | LLM model for synthesis and AI features |
| `synthesis_strategy` | `single_prompt` | Default strategy: `single_prompt`, `ttd`, or `committee` |
| `convergence_threshold` | `70` | Convergence percentage target |
| `max_rounds` | `3` | Maximum Delphi rounds |
| `default_anonymous` | `false` | Anonymous responses by default |
| `allow_late_join` | `true` | Allow experts to join after round 1 |
| `ai_suggestions_count` | `5` | Number of AI question suggestions to generate |

### 7.2 Form Management
- CRUD operations on consultation forms
- Dedicated form creation page (`/admin/forms/new`)
- Search and filter across existing forms
- Table layout with mobile-responsive card fallback
- Form editor with question management

### 7.3 Round Management
- Open next round with optional new questions
- View responses per round (current or all rounds)
- Trigger synthesis with model/strategy selection
- Push synthesis results to participants
- Archived response history

### 7.4 Expert Labels (Dimensional Search)
- Assign dimensional labels to experts for structured analysis
- Presets: `default`, `temporal` (Past/Present/Future), `methodological`, `stakeholder`, `custom`
- Custom labels per expert (stored as JSON on `FormModel`)
- Dimension-coded chips in synthesis display

### 7.5 Audit Log Viewer
- Paginated admin view of all audit log entries
- Filter by action type and user
- Distinct action types endpoint for filter dropdowns
- IP address tracking

---

## 8. Branded Email System

Six branded email templates with consistent Symphonia styling:

| Template | Endpoint | Purpose |
|----------|----------|---------|
| **Invitation** | `POST /email/invitation` | Invite an expert to a consultation |
| **New Round** | `POST /email/new-round` | Notify experts a new round is open |
| **Synthesis Ready** | `POST /email/synthesis-ready` | Notify participants synthesis is available |
| **Reminder** | `POST /email/reminder` | Gentle reminder to experts who haven't responded |
| **Welcome** | — | Welcome email on registration |
| **Preview** | `GET /email/preview/{name}` | Preview any template with sample data |

All templates use:
- Brand blue (`#2563eb`) accent color
- Clean card layout with 600px max width
- Outlook-safe VML button fallbacks
- Responsive design for mobile email clients
- Axiotic AI branding in footer

---

## 9. UX & Interface

### 9.1 Theme System
Three themes with full CSS custom property support:

| Theme | Background | Accent | Character |
|-------|-----------|--------|-----------|
| **axiotic-light** | `#ffffff` | `#2563eb` (brand blue) | Default; clean professional |
| **axiotic-dark** | `#0a0f1e` | `#3b82f6` (lighter blue) | Deep navy cosmos |
| **apple** | `#f5f5f7` | `#007aff` (Apple blue) | System/government look |

- `localStorage` persistence with `prefers-color-scheme` fallback
- Zero-flash: theme applied before first paint
- Toggle in header (desktop and mobile menu)

### 9.2 Branded Loading Animation
- Custom orbital animation on the waiting page
- 4-dot orbit with brand colors
- Displayed while synthesis is running with WebSocket progress updates

### 9.3 Synthesis Display Components
- **StructuredSynthesis** — Expandable sections for agreements, disagreements, nuances
- **SynthesisDisplay** — Card-based rendering with color-coded types (green/red/amber/blue/grey)
- **CrossMatrix** — NxN heatmap for dimensional expert agreement/conflict
- **EmergenceHighlights** — Shimmer-border cards for cross-pollination insights
- **MinorityReport** — Preserved dissenting positions with counterpoints
- **RoundTimeline** — Horizontal stepper with convergence scores
- **RoundCard** — Detail view with convergence bar, questions, synthesis
- **SynthesisModeSelector** — Strategy picker in sidebar

### 9.4 Floating Sidebar Overlay
- Sidebar overlays content instead of pushing it (no `marginRight`)
- Provides synthesis controls, expert labels, and mode selection
- Responsive: collapses on mobile

### 9.5 Command Palette
- `⌘K` keyboard shortcut to open command palette
- Quick access to navigation, admin actions, and search

### 9.6 Toast Notifications
- Replaced all 9 `alert()` calls with themed toast notifications
- Consistent styling across all notification types

### 9.7 404 Page + Dynamic Titles
- Custom 404 page for unknown routes
- Dynamic `document.title` updates across all routes

---

## 10. Accessibility (WCAG 2.2 AA)

### 10.1 Keyboard Navigation
- Skip-to-main link for screen reader users
- Global `focus-visible` rings on all interactive elements
- `RoundTimeline` roving tabindex with arrow key navigation
- `StructuredSynthesis` ARIA accordion pattern
- Modal focus traps with Escape-to-close
- `aria-live="polite"` error regions

### 10.2 Screen Reader Support
- Logo marks with `alt="Symphonia"` (decorative marks `aria-hidden="true"`)
- Skeleton loaders with `aria-hidden="true"` and `aria-busy` on parent
- Status badges with `aria-label` for non-colour meaning
- `aria-expanded`, `aria-controls`, `aria-label` on all toggles

### 10.3 Mobile Accessibility
- Minimum 44×44px touch targets on all interactive elements
- `font-size: 16px` on inputs (prevents iOS auto-zoom)
- Safe-area insets for bottom bars
- `@media (hover: none)` to disable hover effects on touch devices
- Hamburger menu with focus management

### 10.4 Colour Contrast
- All text/background pairs meet WCAG AA (4.5:1 minimum)
- Primary text on background: 16.4:1 (exceeds AAA)
- Muted text on background: 5.3:1 (meets AA)

---

## 11. Performance

### 11.1 Code Splitting
- `React.lazy` + `Suspense` for all route components
- Vite `manualChunks` for vendor separation (React, Router, UI libraries)
- `RouteLoadingFallback` during lazy load

### 11.2 Memoisation
- `React.memo` on heavy components: `MarkdownRenderer`, `RoundCard`, `SynthesisDisplay`, `CrossMatrix`
- Skeleton loading states replace spinners (perceived performance)

### 11.3 Error Boundaries
- All routes wrapped in `ErrorBoundary` with retry
- FormPage has dedicated error state with retry + back navigation

---

## 12. Guide & Onboarding

### 12.1 In-App Guide
- Full feature walkthrough covering:
  - Standard Delphi methodology
  - Symphonia AI augmentation (heatmap, cross-analysis, voice mirroring)
  - Three synthesis strategies explained
  - Follow-up question flow (AI suggestions vs admin control)
- Modal-based presentation
- Designed for first-time users and stakeholder demos

---

## 13. Developer & Testing Tools

### 13.1 Atlas (UX Testing Seeder)
- `POST /atlas/seed` — Seeds database with test forms and responses
- Three form templates: fresh form, form with responses, multi-round Delphi
- Creates test users automatically

### 13.2 Government Consultation Seeder
- `seed_government_consultations.py` — Seeds 10 government-style consultation forms
- `reset_and_seed.py` — Wipes and re-seeds for clean testing

### 13.3 Test Suite
- Backend: pytest for synthesis engine, API endpoints, error scenarios
- 48 consensus library integration tests
- 62 synthesis output validation tests
- 61 error scenario tests
- Vision QA loop (Playwright screenshots → vision model scoring)

---

*This document is the single source of truth for Symphonia's feature set. Update it when features are added, modified, or deprecated.*
