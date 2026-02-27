# Symphonia — Technical Architecture

> **Version:** 2.0  
> **Last Updated:** 2026-02-22  
> **Platform:** Symphonia by Axiotic AI  
> **Audience:** Engineers, system architects, deployment teams

---

## 1. System Overview

Symphonia is a self-contained Delphi-style expert consensus platform. The entire stack — frontend SPA, backend API, synthesis engine, and database — lives in a single repository and is deployable via Docker Compose.

```
┌──────────────────────────────────────────────────────────────────┐
│                        BROWSER (Client)                          │
│                                                                  │
│  React 18 + Vite + Tailwind CSS + TypeScript                    │
│  ThemeProvider (axiotic-light | axiotic-dark | apple)            │
│  React Router v6 (lazy-loaded routes, error boundaries)         │
│  WebSocket client (usePresence hook)                            │
│  httpOnly cookie auth + CSRF token header                       │
├──────────────────────────────────────────────────────────────────┤
│                        NGINX (Production)                        │
│  Static file serving for frontend dist/                         │
│  OR: FastAPI serves SPA via catch-all route (dev/simple deploy) │
├────────────────────────┬─────────────────────────────────────────┤
│     REST API           │          WebSocket                      │
│     FastAPI            │          /ws endpoint                   │
│     ┌──────────────────┴──────────────────┐                     │
│     │         Backend (FastAPI)            │                     │
│     │                                      │                     │
│     │  routes.py  — API endpoints          │                     │
│     │  auth.py    — JWT + Cookie + CSRF    │                     │
│     │  synthesis.py — Synthesis adapter    │                     │
│     │  ws.py      — WebSocket manager     │                     │
│     │  audit.py   — Audit logging         │                     │
│     │  email_templates.py — Branded emails │                     │
│     │  models.py  — SQLAlchemy ORM        │                     │
│     └──────────────┬──────────────────────┘                     │
│                    │                                             │
│     ┌──────────────┴──────────────────────┐                     │
│     │       SQLite (dev) / PostgreSQL      │                     │
│     │       symphonia.db / pg container    │                     │
│     └──────────────┬──────────────────────┘                     │
│                    │                                             │
│     ┌──────────────┴──────────────────────┐                     │
│     │     OpenRouter API (External)        │                     │
│     │     LLM synthesis, AI features       │                     │
│     │     Models: Claude Opus 4.6 default  │                     │
│     └─────────────────────────────────────┘                     │
└──────────────────────────────────────────────────────────────────┘
```

---

## 2. Frontend Architecture

### 2.1 Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | React | 18.x |
| Build Tool | Vite | 5.x |
| Language | TypeScript | 5.x |
| Styling | Tailwind CSS + CSS Custom Properties | 3.x |
| Routing | React Router | 6.x |
| Icons | Lucide React | Latest |
| Markdown | React Markdown with GFM plugin | Latest |

### 2.2 Project Structure

```
frontend/src/
├── components/           # Reusable UI components
│   ├── CommentThread.tsx       # Threaded synthesis comments
│   ├── CrossMatrix.tsx         # NxN dimensional agreement heatmap
│   ├── EmergenceHighlights.tsx # Cross-pollination insight cards
│   ├── LoadingButton.tsx       # Button with loading state variants
│   ├── MarkdownRenderer.tsx    # GFM markdown with raw HTML support
│   ├── MinorityReport.tsx      # Dissenting position display
│   ├── PresenceIndicator.tsx   # Who's-viewing avatar dots
│   ├── ResponseEditor.tsx      # TipTap editor with conflict detection
│   ├── RoundCard.tsx           # Round detail view with convergence
│   ├── RoundTimeline.tsx       # Horizontal round stepper
│   ├── StructuredSynthesis.tsx # Expandable synthesis sections
│   ├── SynthesisDisplay.tsx    # Card-based synthesis rendering
│   ├── SynthesisModeSelector.tsx # Strategy picker
│   └── SynthesisProgress.tsx   # WebSocket-driven progress bar
├── hooks/
│   └── usePresence.ts          # WebSocket presence hook
├── layouts/
│   ├── AuthLayout.tsx          # Centred card for login/register
│   ├── Container.tsx           # Max-width content wrapper
│   └── PageLayout.tsx          # Header + Footer shell
├── theme/
│   ├── ThemeProvider.tsx       # Theme context + CSS variable injection
│   └── ThemeToggle.tsx         # Theme switcher control
├── AdminDashboard.tsx          # Admin form management
├── AdminFormNew.tsx            # Dedicated form creation page
├── AdminSettings.tsx           # Settings page
├── App.tsx                     # Re-exports Dashboard
├── AppRouter.tsx               # Route definitions with lazy loading
├── AuthContext.tsx             # Auth state management
├── Dashboard.tsx              # Role-based dashboard (admin/user)
├── FormEditor.jsx             # Form question editor
├── FormPage.tsx               # Expert submission page
├── Header.tsx                 # Navigation with theme toggle
├── Login.tsx                  # Login form
├── Register.tsx               # Registration form
├── SummaryPage.tsx            # Synthesis workspace (admin)
├── UserDashboard.tsx          # Expert dashboard with form cards
├── WaitingPage.tsx            # Post-submission waiting room
├── config.ts                  # API base URL configuration
├── index.css                  # Global styles + CSS custom properties
└── main.tsx                   # App entry point
```

### 2.3 Routing Architecture

Routes are organised by layout shell and access level:

```
AuthLayout (centred card, no auth required)
├── /login
└── /register

PrivateRoute → PageLayout (Header + Footer)
├── /                    Dashboard (admin or user, role-detected)
├── /atlas               UX testing atlas
├── /waiting             Post-submission waiting room
├── /result              Synthesis result + feedback
├── /thank-you           Thank-you confirmation
└── /form/:id            Expert form submission

PrivateRoute (admin) → PageLayout
├── /admin/settings      Platform settings
├── /admin/forms/new     New form creation
└── /admin/form/:id      Form editor

PrivateRoute (admin) → No PageLayout (has own header)
└── /admin/form/:id/summary    Synthesis workspace

Catch-all
└── *                    404 page
```

All page components are lazy-loaded via `React.lazy` with a `RouteLoadingFallback` during load. Every route is wrapped in `ErrorBoundary` with retry capability.

### 2.4 Theme System

Three themes defined in `ThemeProvider.tsx`, applied via CSS custom properties on `<html>`:

```
localStorage('symphonia-theme')
  → found?  → apply stored theme
  → not found? → check prefers-color-scheme
    → dark? → axiotic-dark
    → light? → axiotic-light (default)
```

The `:root` block in `index.css` matches `axiotic-light` exactly to prevent flash-of-incorrect-theme. The `ThemeProvider` then overrides with the user's preference on mount.

### 2.5 Code Splitting Strategy

```
vendor-react    → React, ReactDOM (~45KB gz)
vendor-router   → React Router (~12KB gz)
vendor-ui       → Lucide, Radix primitives (~18KB gz)
initial         → App shell, router config (~18KB gz)
page-*          → Lazy-loaded pages (~5–30KB each)
```

---

## 3. Backend Architecture

### 3.1 Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | FastAPI | 0.100+ |
| ORM | SQLAlchemy | 2.x |
| Database | SQLite (dev) / PostgreSQL (prod) | — |
| Auth | python-jose (JWT), passlib (bcrypt) | — |
| WebSocket | FastAPI native WebSocket | — |
| Email | aiosmtplib | — |
| LLM Client | OpenAI SDK (pointed at OpenRouter) | — |

### 3.2 Module Structure

```
backend/
├── core/
│   ├── auth.py              # JWT creation, cookie config, CSRF, user resolution
│   ├── audit.py             # Lightweight audit logging helper
│   ├── db.py                # SQLAlchemy engine + session factory
│   ├── email_templates.py   # 6 branded HTML email templates
│   ├── models.py            # All SQLAlchemy ORM models (14 tables)
│   ├── routes.py            # All API endpoints (~1200 lines)
│   ├── synthesis.py         # Synthesis adapter (mock + library + factory)
│   ├── synthesis_worker_a.py # Byzantine worker A implementation
│   ├── synthesis_worker_b.py # Byzantine worker B implementation
│   └── ws.py                # WebSocket connection manager + presence
├── tests/                   # pytest test suites
├── main.py                  # FastAPI app, middleware, lifecycle, SPA serving
├── Dockerfile               # Multi-stage backend build
├── requirements.txt         # Python dependencies
└── seed_government_consultations.py  # Government consultation test data
```

### 3.3 Middleware Stack (applied in order)

1. **Security Headers** — `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, cache control
2. **CSRF Protection** — Double-submit cookie pattern on state-changing requests (POST/PUT/PATCH/DELETE)
3. **CORS** — Allows all origins with credentials (production should restrict)

### 3.4 API Endpoint Groups

| Group | Base Path | Auth | Description |
|-------|-----------|------|-------------|
| Auth | `/register`, `/login`, `/logout`, `/me` | Public / User | User registration and session management |
| Forms | `/forms/*`, `/create_form`, `/my_forms` | Admin / User | Form CRUD, unlock, listing |
| Rounds | `/forms/{id}/rounds`, `/forms/{id}/next_round` | Admin / User | Delphi round management |
| Responses | `/submit`, `/form/{id}/responses`, `/responses/{id}` | User / Admin | Expert response submission and editing |
| Drafts | `/forms/{id}/draft` | User | Server-side draft auto-save |
| Synthesis | `/forms/{id}/generate_summary`, `/forms/{id}/synthesise_committee` | Admin | Synthesis generation (simple + committee) |
| Versioning | `/forms/{id}/rounds/{id}/generate_synthesis`, `/synthesis_versions/*` | Admin / User | Versioned synthesis with activate/compare |
| Comments | `/forms/{id}/rounds/{id}/comments`, `/comments/{id}` | User | Threaded comments on synthesis |
| Follow-ups | `/forms/{id}/follow_ups`, `/follow_ups/{id}/respond` | User | Follow-up questions and responses |
| AI Features | `/ai/suggest`, `*/devil_advocate`, `*/translate`, `*/voice_mirror` | User | AI question assistant, devil's advocate, translation, voice mirroring |
| Email | `/email/invitation`, `/email/new-round`, `/email/synthesis-ready`, `/email/reminder` | Admin | Branded email sending |
| Audit | `/audit-log`, `/audit-log/actions` | Admin | Audit trail query |
| Settings | `/admin/settings` | Admin | Platform configuration |
| Expert Labels | `/forms/{id}/expert_labels` | Admin / User | Dimensional expert labelling |
| Atlas | `/atlas/seed` | Admin | UX testing data seeder |

---

## 4. Data Model

### 4.1 Entity Relationship

```
User (1) ──────── (N) Response
  │                     │
  │                     ├── form_id → FormModel
  │                     └── round_id → RoundModel
  │
  ├── (N) UserFormUnlock ── form_id → FormModel
  ├── (N) Feedback
  ├── (N) ArchivedResponse
  ├── (N) SynthesisComment
  └── (N) AuditLog

FormModel (1) ──── (N) RoundModel
  │                     │
  │                     ├── (N) Response
  │                     ├── (N) SynthesisVersion
  │                     ├── (N) SynthesisComment
  │                     ├── (N) FollowUp ── (N) FollowUpResponse
  │                     └── (N) Draft
  │
  └── expert_labels (JSON)

Setting (key-value store, no FK relationships)
```

### 4.2 Table Reference

| Table | Primary Purpose | Key Fields |
|-------|----------------|------------|
| `users` | Authentication + role | `email`, `hashed_password`, `is_admin`, `reset_token` |
| `forms` | Consultation definitions | `title`, `questions` (JSON), `join_code`, `allow_join`, `expert_labels` (JSON) |
| `rounds` | Delphi iteration state | `round_number`, `synthesis` (text), `synthesis_json` (JSON), `convergence_score`, `flow_mode` |
| `responses` | Expert submissions | `answers` (JSON), `version` (optimistic lock), `created_at`, `updated_at` |
| `archived_responses` | Immutable response archive | Same as responses + `email` denormalised |
| `user_form_unlocks` | Form access control | `user_id`, `form_id` |
| `follow_ups` | Follow-up questions | `author_type` (human/ai), `question`, `round_id` |
| `follow_up_responses` | Answers to follow-ups | `author_type`, `response`, `follow_up_id` |
| `synthesis_versions` | Versioned synthesis snapshots | `version`, `synthesis`, `synthesis_json`, `model_used`, `strategy`, `is_active` |
| `synthesis_comments` | Threaded discussion | `section_type`, `section_index`, `parent_id`, `body` |
| `drafts` | Auto-saved in-progress responses | `user_id`, `form_id`, `round_id`, `answers` (JSON) |
| `feedback` | Platform feedback | `accuracy`, `influence`, `usability`, `further_thoughts` |
| `audit_log` | Immutable admin action trail | `action`, `resource_type`, `resource_id`, `detail` (JSON), `ip_address` |
| `settings` | Global configuration | `key` (PK), `value` (text) |

### 4.3 JSON Data Shapes

**`FormModel.questions`** — Array of question objects:
```json
[
  {
    "id": "q1",
    "type": "text",
    "label": "What is your main concern?",
    "required": true
  }
]
```

**`RoundModel.synthesis_json`** — Structured synthesis output:
```json
{
  "narrative": "Prose summary...",
  "agreements": [
    {
      "claim": "...",
      "supporting_experts": [1, 2],
      "confidence": 0.85,
      "evidence_summary": "...",
      "evidence_excerpts": [
        {"expert_id": 1, "expert_label": "E1", "quote": "..."}
      ]
    }
  ],
  "disagreements": [
    {
      "topic": "...",
      "positions": [
        {"position": "...", "experts": [1], "evidence": "..."}
      ],
      "severity": "moderate"
    }
  ],
  "nuances": [...],
  "confidence_map": {"overall": 0.75},
  "follow_up_probes": [...],
  "emergent_insights": [...],
  "minority_reports": [...],
  "meta_synthesis_reasoning": "..."
}
```

**`FormModel.expert_labels`** — Dimensional labelling:
```json
{
  "preset": "temporal",
  "custom_labels": {"1": "Urðr (Past)", "2": "Verðandi (Present)", "3": "Skuld (Future)"}
}
```

---

## 5. Authentication System

### 5.1 Authentication Flow

```
1. User submits /login with email + password
                    │
2. Server verifies credentials (bcrypt)
                    │
3. Server creates JWT with {sub: user_id, is_admin: bool, exp: 24h}
                    │
4. Server sets two cookies:
   ├── session_token (httpOnly, Secure, SameSite=Lax) → JWT
   └── csrf_token (JS-readable, Secure, SameSite=Lax) → random 32-byte token
                    │
5. Response body also includes token (backward compat)
                    │
6. Subsequent requests:
   ├── Cookie-based: browser sends session_token automatically
   │   └── State-changing requests must include X-CSRF-Token header
   └── Bearer-based: client sends Authorization: Bearer <token>
       └── CSRF not required (token IS the proof)
```

### 5.2 Token Resolution Priority

```python
def _resolve_token(request, bearer_token):
    # 1. httpOnly cookie (preferred — immune to XSS)
    cookie_token = request.cookies.get("session_token")
    if cookie_token:
        return cookie_token
    # 2. Bearer header (backward compat)
    if bearer_token:
        return bearer_token
    return None
```

### 5.3 Role-Based Access

Two roles: **User** (expert) and **Admin** (facilitator).

- `get_current_user` — Requires valid JWT (any role)
- `get_current_admin_user` — Requires valid JWT + `is_admin=True`
- Admin routes protected in both frontend (PrivateRoute with `isAdminRoute`) and backend

---

## 6. WebSocket Architecture

### 6.1 Connection Manager

Single `/ws` endpoint managed by `ConnectionManager` in `ws.py`:

```
Client connects → ws_manager.connect(websocket)
                    │
Message received → ws_manager.handle_message(websocket, raw)
                    │
                    ├── presence_join   → Track user on form
                    ├── presence_leave  → Remove user tracking
                    └── presence_heartbeat → Update last_seen
                    
Disconnect → ws_manager.disconnect(websocket)
             └── Clean up presence tracking
```

### 6.2 Message Types

**Client → Server:**

| Type | Fields | Purpose |
|------|--------|---------|
| `presence_join` | `form_id`, `page`, `user_email` | Register presence on a form |
| `presence_leave` | `form_id` | Unregister presence |
| `presence_heartbeat` | `form_id` | Keep-alive (30s timeout) |

**Server → Client:**

| Type | Fields | Purpose |
|------|--------|---------|
| `presence_update` | `form_id`, `viewers[]` | Current viewers list broadcast |
| `summary_updated` | `summary` | New synthesis text pushed |
| `synthesis_progress` | `form_id`, `stage`, `step`, `total_steps` | Synthesis progress streaming |
| `synthesis_complete` | `form_id`, `round_id`, `version_id`, `synthesis_json` | Synthesis finished |
| `comment_added` | `form_id`, `round_id`, `comment` | New comment broadcast |

### 6.3 Presence Tracking Data Structure

```python
# Per-form presence map
presence: Dict[int, Dict[str, dict]] = {
    form_id: {
        "user@example.com": {
            "ws": WebSocket,
            "last_seen": timestamp,
            "page": "summary"
        }
    }
}

# Reverse lookup for cleanup
_ws_to_presence: Dict[WebSocket, (form_id, user_email)]
```

Stale entries cleaned every 10 seconds (30-second heartbeat timeout).

---

## 7. Synthesis Engine Architecture

### 7.1 Strategy Pattern

```
get_synthesiser(mode, model, ...)
    │
    ├── "mock"      → MockSynthesis (no API calls)
    ├── "simple"    → ConsensusLibraryAdapter(strategy="simple")
    │                  └── SinglePromptStrategy
    ├── "ttd"       → ConsensusLibraryAdapter(strategy="ttd")
    │                  └── DiffusionStrategy (TTDConfig)
    └── "committee" → ConsensusLibraryAdapter(strategy="ttd") + warning
                       └── Falls back to TTD (committee not yet in library)
```

All strategies implement the `Synthesiser` protocol:
```python
async def run(
    questions, responses, model, mode, progress_callback, comments_context
) -> SynthesisResult
```

### 7.2 Consensus Library Integration

```
App Response Dict
    │
    ├── _build_prose_responses() → ProseResponse (bridge type)
    │   └── Satisfies library's duck-typed contract
    │
    ├── _build_question_text() → Numbered prompt string
    │
    └── AdapterSynthesisContext → Library's SynthesisContext protocol
                │
    Library Strategy.run(context, responses)
                │
                ▼
    PipelineResult (library domain model)
                │
    _map_to_app_format() → SynthesisResult (app model)
        ├── Claims → Agreements + Disagreements
        ├── Areas → Deduplicated agreements/disagreements
        ├── Uncertainties → Nuances
        ├── Cross-pollination detection → Emergent Insights
        └── Minority/divided claims → Minority Reports
```

### 7.3 Progress Streaming

Synthesis progress is streamed to connected WebSocket clients:

```
preparing       → step 1/4
synthesising    → step 2/4
mapping_results → step 3/4
complete        → step 4/4
```

### 7.4 Simple Strategy (Direct LLM)

When using the `simple` strategy via the versioned endpoint, the backend constructs a prompt directly (no library) and asks the LLM to return structured JSON matching the `SynthesisResult` schema. The response is parsed, validated, and stored. Falls back to raw text if JSON parsing fails.

---

## 8. Data Flow Diagrams

### 8.1 Expert Submission Flow

```
Expert opens /form/:id
        │
        ├── GET /forms/{id}/draft → Load saved draft (if any)
        ├── GET /forms/{id}/active_round → Get current round + questions
        └── Previous round synthesis displayed
                │
Expert fills form (auto-save → PUT /forms/{id}/draft)
                │
Expert submits → POST /submit
        ├── Response saved to `responses` table
        ├── Archived copy saved to `archived_responses`
        ├── Draft deleted
        └── Redirect to /waiting
```

### 8.2 Synthesis Generation Flow

```
Admin triggers synthesis
        │
        ├── POST /forms/{id}/rounds/{id}/generate_synthesis
        │   ├── payload: {model, strategy, n_analysts, mode}
        │   │
        │   ├── Fetch questions + responses + comments
        │   ├── get_synthesiser(strategy, model) → Synthesiser
        │   ├── synthesiser.run() with progress_callback
        │   │   └── WebSocket: synthesis_progress events
        │   │
        │   ├── Create SynthesisVersion record (auto-activated)
        │   ├── Copy synthesis to RoundModel (backward compat)
        │   ├── WebSocket: synthesis_complete broadcast
        │   └── Return version + synthesis data
        │
        └── All connected clients auto-refresh
```

### 8.3 Authentication Flow

```
POST /login (email, password)
        │
        ├── Verify password (bcrypt)
        ├── Create JWT {sub: user_id, is_admin, exp: 24h}
        ├── Generate CSRF token (32 random bytes, URL-safe)
        │
        ├── Set-Cookie: session_token=<JWT> (httpOnly, Secure, SameSite=Lax)
        ├── Set-Cookie: csrf_token=<CSRF> (readable, Secure, SameSite=Lax)
        └── Response body: {access_token, csrf_token, is_admin, email}
                │
Subsequent state-changing request (POST/PUT/DELETE):
        │
        ├── CSRF Middleware checks:
        │   ├── GET/HEAD/OPTIONS? → Skip
        │   ├── Exempt path? → Skip
        │   ├── Bearer header present? → Skip (API client)
        │   ├── No session_token cookie? → Skip
        │   └── csrf_token cookie == X-CSRF-Token header? → Pass
        │       └── Mismatch → 403 CSRF error
        │
        └── Auth dependency resolves token:
            ├── Cookie first (httpOnly, XSS-proof)
            └── Bearer fallback (backward compat)
```

---

## 9. Deployment

### 9.1 Docker Compose

```yaml
services:
  backend:
    build: ./backend
    ports: ["8000:8000"]
    env_file: ./.env
    volumes: ["./backend/summaries:/app/summaries"]

  frontend:
    build: ./frontend
    ports: ["3000:80"]          # Nginx serves static files
    depends_on: [backend]

  db:
    image: postgres:15
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: ****
      POSTGRES_DB: postgres
    ports: ["5432:5432"]
    volumes: ["postgres_data:/var/lib/postgresql/data"]
```

### 9.2 Development Mode

```bash
# Backend (SQLite, auto-reload)
cd backend
source .venv/bin/activate
uvicorn main:app --host 0.0.0.0 --port 8766 --reload

# Frontend (Vite dev server with HMR)
cd frontend
npm run dev
```

The backend serves the frontend SPA in production mode via a catch-all route that returns `index.html` for client-side routing. Static assets under `/assets/` are served directly from the frontend `dist/` directory.

### 9.3 Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENROUTER_API_KEY` | For LLM features | OpenRouter API key |
| `SYNTHESIS_MODE` | No | `mock` for no-API testing |
| `SYNTHESIS_MODEL` | No | Default model override |
| `ADMIN_EMAIL` | No | Admin email (default: `antreas@axiotic.ai`) |
| `ADMIN_PASSWORD` | No | Admin password (default: `test123`) |
| `SMTP_HOST` | For email | SMTP server hostname |
| `SMTP_PORT` | For email | SMTP port (default: 587) |
| `SMTP_USER` | For email | SMTP username |
| `SMTP_PASS` | For email | SMTP password |
| `SMTP_FROM` | For email | From address (default: `info@colabintel.org`) |
| `COOKIE_SECURE` | No | Cookie Secure flag (default: `true`) |
| `CONSENSUS_PROMPTS_DIR` | No | Override consensus library prompts directory |

### 9.4 Database Initialisation

On startup, `main.py`:
1. Runs `Base.metadata.create_all()` (creates tables if not exist)
2. Ensures admin users exist (`antreas@axiotic.ai`, `samuel@axiotic.ai`)
3. Sets admin flag on existing users if needed

### 9.5 Production Considerations

- **Auth secret:** Replace `"your-jwt-secret"` in `auth.py` with a strong random secret
- **CORS:** Restrict `allow_origins` from `["*"]` to specific domains
- **HTTPS:** Ensure `COOKIE_SECURE=true` in production (requires HTTPS)
- **Database:** Switch from SQLite to PostgreSQL via Docker Compose
- **Tunnel:** Cloudflare Tunnel support planned for `symphonia.axiotic.ai`

---

## 10. Testing Architecture

### 10.1 Test Organisation

```
backend/tests/
├── test_synthesis.py           # Adapter + factory tests
├── test_synthesis_worker_a.py  # Byzantine worker A
└── test_synthesis_worker_b.py  # Byzantine worker B
```

### 10.2 Test Categories

| Category | Count | Coverage |
|----------|-------|----------|
| Consensus library integration | 48 | Factory, API, versioning, validation, AI-assisted, errors, multi-round, persistence |
| Synthesis output validation | 62 | Schema completeness, value ranges, cross-field consistency, edge cases, adapter mapping |
| Error scenarios | 61 | Auth, form, round, synthesis API, comments, response editing, synthesis library |
| E2E simulation | — | Full user journey simulation |
| Vision QA | 4 pages | Login 8.1, Register 8.0, Dashboard 8.2, Summary 7.9 (avg 8.05/10) |

### 10.3 Byzantine Integration

The synthesis engine was built using a Byzantine protocol — two independent implementations (`synthesis_worker_a.py`, `synthesis_worker_b.py`) merged by an integrator. Both worker notes (`WORKER_A_NOTES.md`, `WORKER_B_NOTES.md`) and integration notes (`INTEGRATION_NOTES.md`) are preserved in the repo.

---

*This document is the single source of truth for Symphonia's technical architecture. Update it when the stack, data models, or deployment topology changes.*
