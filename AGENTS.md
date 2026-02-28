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
