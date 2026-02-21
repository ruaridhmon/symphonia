# GRIND WORKER 5: Synthesis Versioning & Historical Round Synthesis

**Status:** ✅ Complete  
**Date:** 2026-02-21

## What Was Built

### 1. Backend — `SynthesisVersion` Model (`backend/core/models.py`)

New SQLAlchemy model `SynthesisVersion` added with:
- `id`, `round_id` (FK → rounds.id), `version` (integer, auto-incremented per round)
- `synthesis` (text), `synthesis_json` (JSON) — stores both formats
- `model_used` (string), `strategy` (string — "simple"/"committee"/"ttd")
- `created_at` (datetime), `is_active` (boolean — which version is published)
- Relationship back to `RoundModel` via `backref="synthesis_versions"`

Table auto-created on startup via `Base.metadata.create_all()` — no migration needed.

### 2. Backend — New Endpoints (`backend/core/routes.py`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/forms/{form_id}/rounds/{round_id}/synthesis_versions` | User | List all versions for a round |
| `POST` | `/forms/{form_id}/rounds/{round_id}/generate_synthesis` | Admin | Generate NEW synthesis for ANY round (not just active) |
| `PUT` | `/synthesis_versions/{version_id}/activate` | Admin | Set version as active; copies to Round model for backward compat |
| `GET` | `/synthesis_versions/{version_id}` | User | Get specific version details |

**Key behaviors:**
- `generate_synthesis` works on ANY round, not just active — enables historical re-synthesis
- Supports all three strategies: `simple` (single LLM prompt), `committee` (multi-agent via CommitteeSynthesiser), and mock mode
- Version numbers auto-increment per round (1, 2, 3…)
- `activate` deactivates all other versions for that round, then copies synthesis text + JSON back to the Round model for backwards compatibility with existing UI

### 3. Frontend — Version Selector UI (`frontend/src/SummaryPage.tsx`)

Added to the admin sidebar:

- **"Synthesis Versions" card** appears below AI-Powered Synthesis section
- **Version dropdown** showing `v1, v2, v3…` with:
  - Active version marked with ★
  - Strategy label (simple/committee/ttd)
  - Timestamp (short format)
- **Version details panel** showing model, strategy, and active status
- **"Publish vN" button** — activates a draft version (hidden when already active)
- **"Generate New Version" button** — creates a new versioned synthesis using the selected model + strategy
- **Main content area** shows the selected version's synthesis with:
  - Markdown rendering of text synthesis
  - Structured synthesis display (StructuredSynthesis component) when `synthesis_json` is available
  - Version badge and metadata header

**Behavior:**
- Versions load automatically when a round is selected (via RoundTimeline or sidebar)
- Auto-selects the active version, or latest if none active
- Works on any round — not just the active one

## Files Modified

1. `backend/core/models.py` — Added `SynthesisVersion` model
2. `backend/core/routes.py` — Added 4 new endpoints + `SynthesisVersion` import
3. `frontend/src/SummaryPage.tsx` — Added version state, fetch logic, selector UI, and version preview

## Verification

- ✅ `npm run build` — frontend builds clean
- ✅ Backend model imports successfully
- ✅ All 4 new routes registered (verified via route inspection)
- ✅ Backend starts with uvicorn, serves /docs
