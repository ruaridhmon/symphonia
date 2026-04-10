# AGENTS.md — Symphonia Build Notes

> For Hephaestus, sub-agents, and build pulses working in this repo.
> Keep this file updated with architectural decisions, known constraints, and active work.

---

## Current State

- **Backend:** FastAPI · SQLite (dev) / PostgreSQL (prod) · port 8000
- **Frontend:** React + Vite · built to `frontend/dist/` · served by backend in prod
- **Running:** `uvicorn main:app --host 0.0.0.0 --port 8000` from `backend/`
- **Frontend dev:** `vite` from `frontend/` on port 5173

---

## AI Model Configuration — CRITICAL

### How model resolution works

All AI features (synthesis, translate to audience, counterarguments, probing questions, clarify responses) resolve their model through `_resolve_synthesis_model(db)` in `backend/core/routes.py`.

**Priority chain (highest to lowest):**
1. `payload.model` — if the caller explicitly passes a model in the request body
2. **DB setting** (`Setting` table, key `"synthesis_model"`) — what the admin sets in the UI
3. `SYNTHESIS_MODEL` env var — `.env` override
4. Hard default: `anthropic/claude-opus-4-6`

### What this means in practice

**If Father sets a model in Admin → Settings → `synthesis_model`, ALL AI features use it.**

This is intentional. Never hardcode a model string in a new AI endpoint. Always call `_resolve_synthesis_model(db)`.

### History

- **2026-02-24:** Discovered `translate_synthesis`, `counterarguments`, `generate_probe_questions`, and `clarify_responses` all had `model="anthropic/claude-sonnet-4"` baked in — bypassing the settings entirely. Fixed: all 4 now call `_resolve_synthesis_model(db)`. Backend restarted. (Directive: Antreas)
- **2026-02-27:** Added branch-aware Firebase Hosting deploy flow: `develop` now builds frontend with Vite `--mode development` and deploys to Firebase/GCP dev project; `main` builds with `--mode production` and deploys to prod. Added `frontend/.env.development` + `frontend/.env.production` (both default to `/api`) and set `.firebaserc` aliases (`dev`, `prod`).
- **2026-02-27:** Added split Firebase Hosting configs by environment (`firebase.dev.json`, `firebase.prod.json`) so each branch can target a different Cloud Run `serviceId`. GitHub Actions copies the correct config to `firebase.json` before deploy.
- **2026-02-28:** Updated dev Firebase project ID from legacy dev project to `symphonia-dev-488613` in `.firebaserc` alias and GitHub Actions deploy `projectId` fields.
- **2026-02-28:** Replaced single conditional merge deploy workflow with two explicit branch workflows: `.github/workflows/deploy-dev.yml` (`develop`) and `.github/workflows/deploy-prod.yml` (`main`). PR previews remain in `firebase-hosting-pull-request.yml`.
- **2026-02-28:** Dev Hosting rewrite now targets Cloud Run `serviceId: "symphonia-api"` (not `symphonia-dev`) to match current Cloud Build default `_SERVICE` in `cloudbuild.yaml` unless overridden in the dev trigger.
- **2026-03-03:** Reworked document export reliability paths. `Open Professional Report (PDF)` now hard-validates backend `Content-Type: application/pdf` before opening/downloading, and `Responses` export moved to a backend endpoint (`GET /forms/{form_id}/export_responses`) that generates downloadable DOCX server-side (plus markdown/json), replacing brittle client-side DOCX generation-in-browser-tab behavior.
- **2026-03-03:** Improved `export_synthesis?format=pdf` visual quality with a print-first A4 stylesheet (page numbering, typography, table/code styling, heading hierarchy) and hardened `export_responses?format=docx` generation with XML-control-character sanitization plus a fuller DOCX package (`docProps`, `styles`, document relationships) to prevent Word-open failures on downloaded files.
- **2026-03-03:** Added AI deliberation visibility control to `Workflow Actions` on SummaryPage. The sidebar now has a `View/Hide AI Deliberation Tools` toggle, matching the existing Responses panel hide/show workflow instead of relying on only the in-panel collapsible header.
- **2026-03-03:** Fixed login UX where invalid credentials could incorrectly surface as session expiry. `frontend/src/api/client.ts` no longer forces expiry redirect for `401` responses from `/login`; AuthContext now shows a clearer message: “Incorrect email or password. Please try again.”
- **2026-03-03:** Summary UX updates: manual synthesis editing now supports explicit `Save`/`Revert` controls with unsaved-change tracking, and switching from `Edit` back to `View` auto-saves pending edits for the active round via `POST /forms/{form_id}/push_summary`. Round navigation in the sidebar now uses previous/next arrow controls (`Round X of N`) instead of relying on clicking a full round list.
- **2026-04-03:** Production hosting split finalized: Firebase Hosting now serves only the SPA, while production frontend builds target `https://api.symphonia.caer.org.uk` directly for REST/WebSocket traffic. Added backend support for configurable cross-origin cookie/CORS settings (`AUTH_COOKIE_DOMAIN`, `CSRF_COOKIE_DOMAIN`, `CORS_ALLOW_ORIGINS`) so split-domain cookie auth works without Firebase rewrites.
- **2026-04-03:** Fixed a cross-questionnaire synthesis contamination risk in `backend/core/synthesis.py`. The consensus adapter was hardcoding all runs to the same checkpoint context (`runtime/1/q1`), which could let diffusion artefacts leak between consultations. Runtime synthesis now uses real `form_id`/`round_id`, content-derived context keys, and `force_restart=True` so each admin-triggered synthesis starts from a clean checkpoint scope.
- **2026-04-09:** Added first-class structured rating support for survey consultations. `QuestionConfig` / `ConfigurableQuestion` now support `inputType: "likert"` plus `allowUnsure`, the admin survey builder can configure Likert / select / slider / text fields directly, questionnaire import recognises common five-point Likert specs, and participant rendering supports compact Likert response cards with optional `Don't know / unsure`. Verified with Playwright on questionnaire import and manual Likert create/answer flows.
- **2026-04-09:** Required-question enforcement now runs on both client and server for survey/document-template submissions. `optional` question flags are honoured during submit validation, uploaded questionnaire forms can leave only optional fields blank, and document-template placeholders now support an `optional:` prefix (for example `{{optional:long:Primary concern}}`) so compulsory sections are blocked before submit while optional sections remain skippable.
- **2026-04-08:** Added questionnaire `.docx` import for survey-style forms. In `Question form` + `Survey` mode, admins can upload a questionnaire spec and the frontend parser converts the first round into typed questions (`single_select`, `multi_select`, `slider`, `text/textarea`) while preserving help text/routing notes where possible. Dynamic later-round/question-list generation is skipped with warnings instead of creating broken fields. Frontend participant rendering now supports these typed survey controls, and Playwright coverage in `frontend/e2e/document-template.spec.ts` exercises the real upload -> create -> join -> submit flow. Local verification for this path requires a frontend build with `VITE_API_BASE_URL=/api` when serving from the backend locally.
- **2026-04-08:** Polished imported survey UX and admin sharing controls. Imported questionnaire sections now render as grouped section blocks instead of flattening all context into per-question helper text, survey free-text fields use a softer ChatGPT-style input treatment, and slider questions were compacted to a tighter scale layout. Admin dashboard cards now expose `Share` and `Delete` actions alongside `Edit` and `Summary`; `Share` opens a sheet-style modal with direct join link, join code copy, and quick WhatsApp/email/Telegram/device-share options using the magic join route (`/join/{code}`). Playwright coverage in `frontend/e2e/document-template.spec.ts` now includes the admin dashboard share/delete flow.
- **2026-04-08:** Document-template QA pass added browser coverage in `frontend/e2e/document-template.spec.ts` for create, edit, and participant draft-restore flows. Also fixed `frontend/src/AuthContext.tsx` to use the shared `API_BASE_URL` helper instead of reading `import.meta.env.VITE_API_BASE_URL` directly, so local `/api` builds and split-domain/prod builds resolve `/me` consistently.
- **2026-04-08:** Added first-cut document-template consultations. `FormModel.document_template` stores a plain-text template (including placeholders like `{{long:Executive summary}}` / `{{short:Organisation}}`), while `questions` continues to store the derived fillable fields so drafts/submissions still persist in the existing JSON answer model. Admin create/edit flows now support document-template mode and can import `.docx` files into editable plain text via `POST /forms/document-template/extract`.
- **2026-04-10:** Hardened questionnaire-to-fillable-document autobuild for large imported surveys. The frontend parser now preserves `same list as Q1` option reuse across long forms, maps routed follow-ups like `Only if "Other" selected in Q5` into conditional rich-document fields, generates inline follow-up text fields for `Other (...)` / `self-describe (...)` options, and skips dynamic repeated blocks like `Q4`/`Q4a`/`Q4b`/`Q4c` instead of creating broken static fields. Rich fillable templates now serialize `questionId` plus conditional metadata through to backend question derivation/required-answer validation and frontend participant visibility. Verified with Vitest and Playwright against pasted questionnaire autobuild flows.
- **2026-04-09:** Added a second document-template subtype: editable document copies. `document_template` still remains a single string field, but templates prefixed with `<!-- symphonia-document-mode: editable -->` are treated as rich editable documents instead of placeholder-based fill-in forms. Backend `.docx` import now supports `mode=editable` and preserves basic Word structure as HTML; participant responses for this mode are stored as a single document answer (`q1.position`) so drafts/submission stay on the existing response model. Placeholder-based document templates continue to work unchanged.
- **2026-04-09:** Upgraded editable-document authoring to use richer frontend `.docx` import with Mammoth plus Tiptap table support. Editable-copy imports now preserve substantially more Word structure in-browser (headings, lists, tables, inline emphasis) before the facilitator shares the consultation. The older backend extraction route still exists for placeholder/fill-fields mode.

### Template for any new AI endpoint

```python
@router.post("/forms/{form_id}/your-new-feature")
def your_feature(
    form_id: int,
    payload: YourPayload,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    resolved_model = _resolve_synthesis_model(db)  # ← ALWAYS do this
    ...
    completion = openai_client.chat.completions.create(
        model=resolved_model,  # ← NEVER hardcode
        messages=[...]
    )
```

---

## Backend Structure

```
backend/
├── main.py                    # FastAPI app entry point
├── core/
│   ├── routes.py              # ALL API endpoints (~4500+ lines)
│   ├── models.py              # SQLAlchemy models (User, FormModel, RoundModel, Response, Setting, …)
│   ├── synthesis.py           # Synthesis engine (TTD strategy)
│   ├── synthesis_worker_a.py  # Worker A implementation
│   ├── synthesis_worker_b.py  # Worker B implementation
│   ├── auth.py                # JWT auth helpers
│   ├── db.py                  # DB session factory
│   └── ws.py                  # WebSocket manager
└── .env                       # OPENROUTER_API_KEY, SYNTHESIS_MODEL, etc.
```

## Frontend Structure

```
frontend/src/
├── App.tsx / AppRouter.tsx     # Router
├── SummaryPage.tsx             # Admin: synthesis + AI tools panel
├── AdminDashboard.tsx          # Form management
├── FormPage.tsx                # Expert response submission
├── ResultPage.tsx              # Expert results view
└── ...
```

---

## Environment Variables

| Variable | Purpose | Default |
|---|---|---|
| `OPENROUTER_API_KEY` | OpenRouter API key for all LLM calls | *(required)* |
| `SYNTHESIS_MODEL` | Fallback model if DB setting not set | `anthropic/claude-opus-4-6` |
| `SYNTHESIS_MODE` | Set to `mock` to disable real LLM calls | *(unset = live)* |
| `SECRET_KEY` | JWT signing key | *(required in prod)* |
| `ADMIN_EMAIL` | Admin account email | `admin@example.com` |
| `ADMIN_PASSWORD` | Admin account password | `change-me-now` |
| `AUTH_COOKIE_DOMAIN` | Optional domain attribute for the httpOnly session cookie | *(unset = host-only)* |
| `CSRF_COOKIE_DOMAIN` | Domain attribute for the readable CSRF cookie in split-domain prod | *(unset = host-only)* |
| `CORS_ALLOW_ORIGINS` | Comma-separated browser origins allowed to call the backend with credentials | `localhost` dev origins + `https://symphonia.caer.org.uk` |

---

## Known Constraints

- **Do NOT restart backend and edit config in the same command** — if the config is wrong you lose the process
- **routes.py is large (~4500+ lines)** — use `grep -n` to locate functions before editing
- **Frontend must be rebuilt** after any `.tsx/.jsx` changes for prod: `cd frontend && npm run build`
- **SQLite in dev** — the DB file is `backend/symphonia.db`. In prod this is PostgreSQL (see docker-compose.yml)
- **OpenRouter key** is stored in `backend/.env` — never commit it

---

## Active Pulses / Cron

Any build pulses for this repo should read this file first. Key rules:
1. Model changes → update DB setting via `PATCH /admin/settings`, not by editing routes.py
2. New AI endpoints → always use `_resolve_synthesis_model(db)`
3. After backend changes → `kill <uvicorn_pid>` then restart from `backend/` directory
4. Frontend changes → `npm run build` in `frontend/`, then restart backend (serves dist/)
5. Split-domain prod (`symphonia.caer.org.uk` + `api.symphonia.caer.org.uk`) requires `CSRF_COOKIE_DOMAIN=symphonia.caer.org.uk` and matching `CORS_ALLOW_ORIGINS`
