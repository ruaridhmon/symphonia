# Roadmap Agent 2 — Phase 3: AI Devil's Advocate + Audience Translation

**Date:** 2026-02-21
**Status:** ✅ Complete

## What Was Built

### 1. AI Devil's Advocate (Phase 3.1)

**Backend:** `POST /forms/{form_id}/rounds/{round_id}/devil_advocate`
- Reads all expert responses and current synthesis for the round
- Calls Claude Sonnet 4 via OpenRouter to generate 3-5 steel-man counterarguments
- Returns structured JSON with `argument`, `rationale`, and `strength` (strong/moderate/weak)
- Includes mock mode fallback when no API key is configured
- Available to all authenticated users (not just admins)

**Frontend:** `DevilsAdvocate.tsx` component
- Card with header "🤖 AI Counterpoints" with orange theme
- Prominent disclaimer: "These counterarguments are AI-generated and do not represent expert views"
- "Generate" button that calls the endpoint; becomes "Regenerate" after first use
- Counterarguments displayed as cards with strength badges (color-coded)
- Collapsible section with loading and error states
- Integrated into `SummaryPage.tsx` right after the Structured Analysis section

### 2. Audience Translation Toggle (Phase 3.3)

**Backend:** `POST /forms/{form_id}/rounds/{round_id}/translate`
- Accepts `audience` (policy_maker | technical | general_public | executive | academic) and `synthesis_text`
- Each audience has a carefully crafted system prompt:
  - **Policy Maker:** Actionable policy recommendations with regulatory framing
  - **Technical:** Preserves precise terminology, uncertainties, and caveats
  - **General Public:** Plain language, analogies, avoids jargon
  - **Executive:** Bottom-line summary, max 3 bullets, key risks and opportunities
  - **Academic:** Methodology notes, epistemic uncertainty, citation framing
- Returns translated text with audience label
- Includes mock mode fallback

**Frontend:** `AudienceTranslation.tsx` component
- Dropdown selector: "Reading as: [Select audience…]" with emoji icons for each audience
- Translated version appears BELOW original synthesis with a styled "Lens" badge
- Original synthesis always remains visible
- Loading spinner while translating
- Clear button (X) to dismiss translation
- Integrated into the Structured Analysis card header in `SummaryPage.tsx`

## Files Changed

### Backend
- `backend/core/routes.py` — Added two new endpoint sections:
  - `POST /forms/{form_id}/rounds/{round_id}/devil_advocate`
  - `POST /forms/{form_id}/rounds/{round_id}/translate`

### Frontend
- `frontend/src/components/DevilsAdvocate.tsx` — New component
- `frontend/src/components/AudienceTranslation.tsx` — New component
- `frontend/src/components/index.ts` — Added exports
- `frontend/src/api/synthesis.ts` — Added API functions + types
- `frontend/src/SummaryPage.tsx` — Imported and integrated both components

## Architecture Notes

- Both endpoints use the existing `get_openai_client()` pattern with OpenRouter
- Both support mock mode (no API key or `SYNTHESIS_MODE=mock`)
- Model: `anthropic/claude-sonnet-4` for both features (fast, cost-effective)
- Devil's Advocate reads synthesis_json when available, falls back to raw synthesis text
- Audience Translation receives the full synthesis text from the frontend (constructed from structured data)
- Frontend follows existing component patterns (cards, badges, loading states)
