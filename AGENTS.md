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
- **2026-04-16:** Hardened required-answer validation for imported survey responses across frontend and backend. The participant submit path now normalizes legacy answer payloads (for example numeric slider scores or alternate keys like `value` / `selectedScore`) into canonical structured responses before validation/submission, and backend `_extract_answer_position()` now accepts those legacy/scalar shapes too. This fixes cases where a visibly answered survey question could still be rejected at submit with `Please answer "..." before submitting.` Deployed to production hosting and Cloud Run revision `symphonia-api-00205-w59`.
- **2026-04-16:** Removed participant-facing leakage of conditional routing notes like `Shown when "Other" is selected ...` from imported questionnaire forms. New rich-fillable template generation no longer appends those notes to helper text, and frontend rich-template rendering now strips the legacy sentence from already-saved templates so existing forms clean up without re-importing. Deployed to production hosting and Cloud Run revision `symphonia-api-00206-v97`.
- **2026-04-16:** Fixed rich-fillable imported survey alignment when saved `document_template` fields drift from `active_round.questions`. Some older imports carried orphan follow-up fields in the HTML template (for example `Q0b_other`) that were not present in `questions`, which shifted draft/save keys and caused submit-time errors like `Please answer "Staff AI literacy, capability, and training" before submitting.` even though the visible slider was filled. Frontend rich-template rendering now maps fields by `questionId -> qN` from the active question list, skips orphan template fields, auto-remaps legacy template-order drafts when detected, and validates rich-fillable submissions against `questions` instead of raw template order. Deployed to production hosting.
- **2026-04-09:** Added a second document-template subtype: editable document copies. `document_template` still remains a single string field, but templates prefixed with `<!-- symphonia-document-mode: editable -->` are treated as rich editable documents instead of placeholder-based fill-in forms. Backend `.docx` import now supports `mode=editable` and preserves basic Word structure as HTML; participant responses for this mode are stored as a single document answer (`q1.position`) so drafts/submission stay on the existing response model. Placeholder-based document templates continue to work unchanged.
- **2026-04-09:** Upgraded editable-document authoring to use richer frontend `.docx` import with Mammoth plus Tiptap table support. Editable-copy imports now preserve substantially more Word structure in-browser (headings, lists, tables, inline emphasis) before the facilitator shares the consultation. The older backend extraction route still exists for placeholder/fill-fields mode.
- **2026-04-15:** Aligned editable document-template authoring with participant rendering by routing the admin editor through the same `DocumentTemplateResponse` shell used on live forms. Slider UI for survey/document fields now shows a simpler numeric 0-10 style scale (no top-left “Choose a score” label and no midpoint label by default), and questionnaire-imported plain `Other` options now generate a neutral follow-up field label instead of auto-inserting “Please specify” unless the source option explicitly asked for it.
- **2026-08-26:** Added custom synthesis prompt support on `develop` / dev hosting only. The admin synthesis selector now exposes `Custom`, the UI sends `prompt` for custom generation, and `backend/core/routes.py` accepts `strategy: "custom"` (plus legacy `question_summaries` mapped to custom) using `_resolve_synthesis_model(db, payload.model)` and OpenRouter. Dev Firebase continues to deploy the committed `frontend/dist` mirror with a small patched SummaryPage chunk, so future rebuilds should preserve the source implementation before replacing that dist snapshot.

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
- **2026-09-07:** Added `DelphiProgressPanel` with counts from recorded ratings and exact wording/scale comparisons. Empty-round and copied synthesis notes apply to historical rounds too. Dev still deploys a patched dist mirror: `src/legacy/delphiProgress.ts` is the compatibility entry, bundled with esbuild to `dist/delphi-progress.js`; it reuses the existing deployed rounds API module. Remove the compatibility entry when the dev frontend returns to source builds. Do not replace the entire dist directory without reconciling existing participant-flow patches.
- **2026-09-07:** Completed the warmer-homes synthetic demo (form 16): 10 first-round proposals, 9 returning ballots in each subsequent round. Fixture and review are committed without session tokens. Scoped legacy custom prompts by consultation route and added a tab-scoped post-submission return link. Legacy progress data supports manual refresh and visible-tab periodic refresh; its DOM cache marker contains only a revision, not response data.
- **2026-09-07:** The live entry `index-HJquNmhn.js` imports `SummaryPage-nowaffle-CaerDev.js`, not the similarly named devfast snapshot. An import map in the committed index versions that exact summary import to `SummaryPage-nowaffle-delphi-v2.js` so immutable browser caches cannot retain the global prompt key. Keep the shared app entry URL unchanged to avoid duplicate React/app initialization. A future source rebuild should remove this compatibility mapping.
- **2026-09-07:** Summary refinement uses native disclosure panels for generation/history and scoped `summary-refinement.css`. Run `node scripts/polish-summary-bundle.cjs` from frontend to reproduce the v3 legacy summary chunk; index import map points to v3. Source builds include the same disclosures and stylesheet. Validate source builds outside committed dist until mirror reconciliation is complete.
- **2026-09-07:** `renderDelphiInsights.ts` is shared by the source React wrapper and legacy recorded-results module. It renders direct stance counts, exact-wording history, matched identity changes and unmodified comments. Display bands (80% mostly agree/disagree) are descriptive, not an inferred study protocol. `delphiDemo.ts` is a read-only, explicitly synthetic explorer using verified isolated API output from `test_public_ai_simulation.py`; it never writes to a live form or changes access. Dev index loads both root modules, built with esbuild. The dashboard example links to existing form 17 with `?demo=public-ai`; live form 17 remains without demo submissions.
- **2026-09-07:** `legacy/usability.ts` and `usability.css` simplify response reading and authoring without changing saved values. In the dev mirror, mobile responses use list → full-width reader → back; selection/delete remain behind Manage responses. Builder reasoning fields and sharing/consent are expandable, with current access state visible. Source accordion gets unconstrained scrolling/readable answers; existing source/mirror response layouts still differ. `public/responsive-preview.html` (mirrored in dist) provides same-origin 320/390/768px iframes for real CSS viewport QA with existing authentication, no access bypass. Rebuild the root usability module with esbuild and preserve the existing dist app entry.
- **2026-09-08:** Claim workspace adds majority display bands, compact recent change with expandable history, earlier omitted claims, and a reviewed next-round planner shared by source/dev mirror. `delphiPlanning.ts` retains original IDs/wording/scales, adds new UUID claims with parentClaimId/parentClaimText/claimRationale/introducedRound, and never transfers votes. The existing next_round API persists arbitrary question metadata and accepts expected_round_number for stale-round protection. Draft planner DOM survives results refresh/filter changes but is not saved across page reloads. Demo planner only previews; live planner opens exactly the reviewed package using the existing authenticated client. No automatic AI proposal generation is claimed. Root claim-workspace.css and the two Delphi modules must be mirrored after edits.
- **2026-09-07 (supersedes linked proposals):** User selected a fixed three-round Delphi: R1 expert input, R2/R3 identical extracted claims and scales plus “Justify your position”. Removed adaptive proposal planner/demo proposal. `buildFixedDelphiRound` reuses the R2 questionnaire and adds R2 reasoning as feedback; original comments remain readable. The legacy setup modal loads saved R2 questions rather than regenerating from a later synthesis, and hides setup once R3 exists. Backend rejects altered claim signatures and fourth Delphi rounds; no historical ballots are rewritten. Justifications remain optional, as before.
- **2026-09-07:** Added form 18, “Synthetic Delphi — AI in UK university research”, with a single independent-input question and no extra reasoning requirements. Completed scripted eight-person simulation lives separately at `?demo=research-ai`, generated via the isolated authenticated API test (24 submissions, stable four-claim questionnaire). The saved live form remains an empty template; the UI explicitly links to the completed synthetic explorer. Dashboard example link now uses this survey. Explanation copy is “What led you to this view?” with a short evidence/experience/concern hint; legacy public participant and setup preview show a visible label, while existing answer values/optional flags are preserved.
- **2026-09-07:** Response reading now uses shared `utils/responseReading.ts`: full question/claim wording, exact rating, paired explanation, and separate evidence/reservations. Positional and stable-ID answers plus unknown fields/orphaned answers remain visible. Editing uses the existing ResponseEditor path. Dev summary is versioned to `SummaryPage-responses-v4.js` by `scripts/polish-responses.cjs` and imports root `response-reading.js`; preserve import-map mapping when rebuilding legacy summary assets. `response-reading.css` supplies the narrower reading column and flatter list. Identity transport prefixes are hidden in display only; original names remain in title attributes and stored records.
- **2026-09-07:** Dashboard research example must not rely on form 18: the backend returned Form not found. It now opens `/examples/research-ai.html`, a self-contained saved synthetic explorer with no API/auth dependency. Legacy `?demo=research-ai` links redirect there. Rebuild with `node scripts/build-research-example.cjs` plus the root delphiDemo bundle; public assets ensure source builds retain the page. No live access controls or data are changed.
- **2026-09-08:** Product polish removes full document reloads from dashboard Edit/Summary links using React Router Link, preloads Summary code, and replaces unrelated skeleton cards with one quiet loading shell. `productPresentation.ts` keeps Summary/Share visible and places existing Edit/Download/Delete actions in a keyboard-accessible More disclosure. `productUI.ts` adds Summary/Responses/Analysis navigation using the existing controlled select; values and data are unchanged. `product.css` unifies header width/height, dashboard rows, mobile controls and builder spacing. `scripts/polish-product.cjs` produces versioned entry/dashboard/summary assets. IMPORTANT: the index import map now maps **every old app entry import** to the same new entry URL used by the script tag; this prevents duplicate app initialization while allowing the route fallback to change. Preserve all three import-map mappings and old assets. Source build validated outside dist; three targeted interaction tests pass. Existing mirror participant-flow patches are retained.
- **2026-09-08 QA:** Live SPA navigation announces the destination without restarting auth; Summary/Responses/Analysis controls, response round filtering and mobile list/detail/back work. Create → Preview → Back to edit checked without saving a consultation. Follow-up CSS aligns response names when selection controls are hidden, keeps More within 320px screens, and uses the existing account menu consistently on mobile (including its theme/language options).
- **2026-09-08:** User prefers the prior Consultations dashboard appearance. Restored its original card/table, search, banner, spacing, header and visible Edit/Summary/Download/Share/Delete actions. Dashboard Link navigation and Summary preloading remain, so the full-page reload fix is retained. Product CSS now excludes the dashboard; other screens retain their refinements. Legacy dashboard is versioned as Dashboard-classic-v2.js.

- **2026-09-08:** Responses now opens the viewed round by default, with an expert-only chooser and a quieter reading pane. All-round filtering retains round labels; search still includes full answers. Shared response rendering pairs compact ratings with claim headings and preserves every answer. Dashboard appearance is unchanged. Mirror root usability/response-reading modules and stylesheet after edits.

- **2026-09-08:** Multi-answer reading uses native accessible disclosures: all question/claim titles and exact ratings remain visible, first explanation opens initially, with expand/collapse all. Single written answers remain directly visible. Respondent changes reset disclosure state. Six targeted tests cover preservation and disclosure interactions. Smaller search controls and removal of the redundant answered badge improve mobile reading.

- **2026-09-08:** Consultation inbox enhancement makes rows open their existing Summary link; mobile actions use a visible menu, long press or left swipe. Gestures only reveal actions, never delete. Native dialog forwards existing handlers, with cancellation and focus return. Scroll cancels the long press. Summary now uses one connected column with compact inline controls; empty rounds no longer claim to be first-round input. Three gesture/action tests pass. Rebuild product-ui.js and delphi-progress.js plus mirror product.css.

- **2026-09-08:** Unified claim presentation links saved synthesis excerpts to rating cards only by unique exact wording (whitespace normalized). Recorded replies/history and synthesis excerpts remain separately labelled; excerpts never affect counts. Matching lower synthesis cards are hidden in preview, unmatched content remains. A compact Synthesis actions disclosure forwards existing publishing/editor actions and retains publication status; edit reveals the original editor. Three tests cover exact matching, preservation, filtered claims and action forwarding. Root product-ui/delphi-progress and product.css must be mirrored.

- **2026-09-08:** Refined unified claims to retain the original evidence-card hierarchy: numbered bold heading, measured rating bar/counts, and directly accessible supporting/opposing/uncertain excerpt disclosures. Removed the extra enclosing Synthesis excerpts disclosure. History/full responses follows the excerpts; provenance and original text remain. Card accent follows recorded rating category, not the synthesis classification.

- **2026-09-13:** Compact claim summary uses one numbered heading with a fixed-width agreement column, a proportional stacked bar and plain stance counts. Category totals live in filter buttons; change is a short percentage-point label and respondent movement stays in history. Original excerpts use slim native disclosures and remain open on result refresh; their counts never become ratings. First-round evidence keeps original synthesis counts without inventing a measured percentage. Rebuild root delphi-progress/product-ui/delphi-demo modules, mirror product.css, and run scripts/build-research-example.cjs for the standalone explorer. Source build, TypeScript and fifteen targeted rating/evidence/planner/inbox tests pass. Added explicit return/mock types to resolve two pre-existing type-check failures without changing behaviour.

- **2026-09-13 follow-up:** User prefers the original synthesis cards. Matched claim cards again use individual rounded borders, inline numbered headings, stance pills and shaded evidence disclosures, with the recorded agree/disagree bar directly below the heading. Preserve original first-round synthesis styling; do not infer rating percentages from extracted excerpts.

- **2026-09-13 refinement:** Simplified matched cards to a strong claim/percentage row, full-width slim rating bar and plain stance counts. Replaced stacked shaded excerpt headers with a compact row of labelled disclosure buttons, each opening its original full-width text below. Counts remain synthesis excerpt counts; rating logic is untouched. Native details retain refresh/expand-all behaviour, while buttons expose aria-expanded and aria-controls. TypeScript, ten targeted tests and development build pass.

- **2026-09-13 claim emphasis:** Matched synthesis cards restore inline numbered claim headings. Agreement is secondary: a 220px, 4px bar and normal 12px percentage below the claim. Removed the matched-card history/full-response disclosure; original excerpt controls and rating calculations remain intact. Mirror product-ui.js/product.css and example CSS; test absence of history alongside excerpt toggling.

- **2026-09-14 scanning refinement:** Claims share a quiet list border, numbered text column and fixed-width recorded-agreement column. Small bars use the same scale; excerpt controls sit below each claim and expand across the row. Mobile stacks ratings beneath the claim. Source and demos use the same row layout; matched synthesis continues to omit history.

- **2026-09-14 workspace refinement:** Synthesis disclosure triggers stay in the toolbar; one floating settings panel opens below with Close/Escape/outside dismissal and retained native controls. Claim rows are tighter, excerpt counts remain in accessible labels rather than repeating visually, and zero-change labels are omitted. Responses now use shared `createResponseWorkspace`: full-width searchable list → single reader with back/previous/next, preserved filters and focus return. The legacy adapter injects its existing React, ResponseEditor and delete API; bulk deletion preserves partial-success state and its confirmation. Rebuild `response-workspace.js`, product-ui, Delphi bundles and mirrored CSS; `scripts/polish-workspace.cjs` produces SummaryPage-workspace-v2.js without replacing the existing app. Preserve the index import map. The public synthetic workspace fixture previews both surfaces without API calls.
- **2026-09-14:** Simplified synthesis draft headers to round/title/status with brief provenance and conditional edit actions. Generator uses labelled model/method fields, one draft action and collapsed usage details; preserves prompt storage, generation, publish and editor callbacks. `scripts/clean-synthesis-controls.cjs` versions only the deployed summary chunk to workspace-v3 and extracts inert synthetic component fixtures for preview/tests. Preserve this mapping when changing the legacy mirror.
- **2026-09-14:** Connected summary navigation and results with a compact toolbar: native generation/history triggers plus existing refresh/action handlers, with the redundant results heading visually hidden. Empty generation status spacing is removed. Legacy recorded-progress detection accepts both original and shortened synthesis headings so ratings keep loading after the editor title change.
- **2026-09-14:** Fixed toolbar/filter overlap at desktop widths: the old `xl:top-24` sticky-sidebar utility remained effective after changing position to relative. The summary toolbar now explicitly resets all insets. The synthetic fixture carries the deployed sidebar classes, breakpoint offset and nested layout so this regression is visible during browser review.
- **2026-09-14:** Round navigation uses direct labelled segments for up to three existing rounds, with separate selected/current states. Longer consultations use a select. Shared React-injected `roundSelector.ts` preserves original IDs and view callbacks; making an earlier round current remains a separate optional action. `direct-round-selector.cjs` versions the legacy summary chunk to workspace-v4 and imports round-selector.js.

- **2026-09-14:** Responses expand inline within the searchable participant list, retaining filters, edit/delete paths, and normal scrolling. Round 1 reads as original prose with optional supporting details; later rounds retain claim/rating context. `scripts/inline-responses.cjs` patches only workspace-v4 into v5 and rebuilds shared response modules/CSS, preserving other dev mirror patches and import mappings.

- **2026-09-25:** Redesigned dev consultation workspace and response reading. Shared React-injected `consultationWorkspace`, `responseWorkspace`, `presenceConnection`, and `submissionReceipt` utilities serve source and compatibility build. Responses use a desktop participant inbox with a direct prose/claim reader, switching to list/back navigation on phones. `workspace.css` supplies shared neutral surfaces, compact stages, invite dialog, participant question presentation and receipt styling. `participantPresentation` preserves existing controls while adding full accessible question labels. Build with `build-consultation-workspace.cjs`, `build-workspace-reliability.cjs`, then `build-research-example.cjs`. Preserve the updated import map (summary v6, index-workspace-v1, presence-workspace-v1 and waiting-workspace-v1). Source builds remain outside committed dist. Network failures no longer invalidate auth; confirmed auth failures retain redirects. Presence callbacks no longer trigger reconnect loops. See `docs/WORKSPACE_REDESIGN_QA.md` for simulation and validation.

- **2026-09-25 authoring and panel follow-up:** `AdminFormNew.tsx` is now the single form canvas using actual SurveyQuestionInput/StructuredInput controls with inline question/title editing, local per-account drafts, inline settings and same-canvas participant mode. Older template/document tooling is preserved in LegacyAdminFormNew. `build-form-canvas.cjs` bundles the canvas against the deployed React/router/API singletons and maps the old route chunk to AdminFormNew-canvas-v2; retain the immutable legacy copy to avoid import-map recursion. Responses now default to all participants for one question, with inline expandable people and exact-question/exact-identity cross-round comparison; no list/detail/back navigation at any width. Rebuild consultation workspace, form canvas and research example. `scripts/create-hypothesis-panel.py` creates/resumes only the expressly synthetic ten-person dev/local panel using private temporary checkpoints, then closes public responses. Dev form 20 has 30 authored submissions; generated comments are not real expert evidence.
- **2026-09-25 round clarity:** Across rounds includes each identity's round-one opening responses as explicitly separate context, then the selected claim's first/revisited ratings. Compact excerpts expand in place; full stored text remains available. Exact equal ratings with differing explanation text say “Same rating · explanation changed,” not “Position unchanged.” Question preview groups consecutive shared section titles and shows an identical scale once; rating and explanation retain their own required/optional state. Rebuild consultation workspace and research example.
- **2026-09-25 simpler navigation:** Workspace navigation is now Summary/Responses plus a single round select; Analysis and the Perspectives/Rating/Reflection stage strip are removed from visible navigation. Results render all claims without category filters, duplicate round counts or the final-round/methodology blocks. `quietSummary.ts` collapses the original synthesis card only when recorded claim results exist, retaining the exact editor/publish handlers, restoring it for editing or when it is the only result, and cleaning up its toggle on view changes. Build-consultation-workspace also rebuilds delphi-progress. Round data and Delphi transitions are unchanged.
- **2026-09-25 canvas alignment and edit parity:** Dashboard now shares the header's centred 1120px axis. `AdminFormNew` exposes `FormCanvas`; `FormEditor` loads active-round questions and uses that same canvas, with saved/unsaved feedback, failed-save retention, inline answer-type choice and participant preview. Answered/drafted rounds keep questions read-only to preserve positional response meaning. Existing document forms continue through `LegacyFormEditor`; templates remain intact. The current update API does not accept introduction or join settings, so those controls remain create-only. `build-form-canvas.cjs` maps creator to canvas-v5 and editor to canvas-v3 with immutable legacy fallbacks and shared host singletons. Never overwrite dist with a source Vite build.
- **2026-09-25 simplification pass:** Dashboard starts with consultations; the example is a small trailing link. Simulation prefixes are presented as a separate explicit demo label without changing saved titles or response identities. Summary leads with recorded results and a deterministic change sentence; generation controls follow results. The empty-round summary editor is optional. FormCanvas now handles both questions and documents for Create/Edit; DocumentTemplateEditor retains its import/field/editor logic with formatting and guidance disclosures, removing repeated studio headings and nested decorative surfaces. The deployed route chunks are creator canvas-v8 and editor canvas-v6. API limitations for introduction/join editing remain; the connected gcloud account could not access the dev Cloud Run service, so no backend deployment was performed. Build source outside dist, then run the three maintained build scripts.
- **2026-09-25 focused response toolbar:** Responses inherit the parent round selection and no longer repeat its selector. Search is revealed on demand; management keeps its accessible name behind an ellipsis. Question selection uses short numbered labels with the full question shown once. `quietSummary` now switches Claims/Full summary as mutually exclusive surfaces while keeping original editor/publication nodes. Create has an explicit title label and a short next-step guide. Creator chunk canvas-v9, editor canvas-v7. 84 relevant tests pass; verified switches and mobile creation without overflow.
- **2026-09-25 unified response reading:** Removed By question/By person/Across rounds modes. One question selector displays all current answers, with nearest exact-question prior rating changes inline. Per-person history expands under the current answer; round-one unmatched prose is explicitly opening context. Never match anonymous identities, different claim wording, or future rounds. Search/manage and partial-delete handling remain. Rebuild consultation workspace and research example. 86 tests, TypeScript and source build pass; local desktop/mobile history and parent-round checks passed.
