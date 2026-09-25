# Consultation workspace redesign

The dev frontend uses a maintained compatibility build. This update preserves its authenticated API client, participant access rules, generation/publishing callbacks, exports and round transition paths. Source and compatibility build share the new workspace, response reader, presence connection and submission receipt.

## Product changes

- Compact consultation identity, explicit round stages, findings/responses/analysis navigation and question preview.
- Invitation link beside the consultation title. The dialog retains existing access/consent policy, keyboard dismissal, focus handling and a manual-copy fallback.
- Searchable participant inbox with a separate reading pane. Phones use list → reader → back. Exact claim wording, ratings, explanations, supporting fields and unmatched answers remain readable without nested disclosures.
- Quieter dashboard actions, authoring surfaces and participant controls. Question navigation retains full accessible labels; the active claim has a visible heading.
- Submission receipt retains context after refresh, checks published results and newly opened rounds, and reports temporary update failures without implying a lost submission.
- Presence connections no longer restart when render callbacks change; cleanup closes connecting sockets and retries are bounded. Network interruptions and unexpected proxy HTML no longer erase authentication state; confirmed 401/Cloudflare redirects retain the existing login flow.

## Verification

- TypeScript check and development source build into `/tmp/symphonia-source-build`, preserving the committed dev mirror.
- Focused Vitest coverage of presentation, navigation, original answer preservation, clipboard failure, dialog dismissal, receipt recovery, callback stability and bounded reconnects.
- Backend `test_research_ai_simulation.py` and `test_delphi_continuity.py`: real authenticated isolated API simulation, 8 fictional participants × 3 rounds = 24 submissions; published feedback, identical rating claims, identity continuity, stale-round protection, admin publication restrictions and prevention of a fourth Delphi round.
- Browser checks on the maintained build: dashboard → summary; round selection; participant reading; invite dialog; participant rating and reasoning; draft save and advance; missing required-answer rejection; successful submission; published-results receipt. All writes were confined to an isolated local SQLite database.
- The public `/examples/research-ai.html` example uses saved, explicitly synthetic data. Its responses and claim ratings are never mixed into live consultation records. This checks application behaviour, not scientific validity or AI synthesis quality.

## Reproduce

From `frontend`, after installing the lockfile dependencies:

```
node scripts/build-consultation-workspace.cjs
node scripts/build-workspace-reliability.cjs
node scripts/build-research-example.cjs
npx tsc --noEmit
npx vite build --mode development --outDir /tmp/symphonia-source-build
npx vitest run src/utils/ src/api/client.resilience.test.ts src/examples/synthesisControlsFixture.test.tsx
```

The build scripts version the summary, app entry, presence and waiting page in the existing import map. Do not replace the mirror with the source build without reconciling its earlier participant patches.

The local simulation is reproducible with `scripts/seed-workspace-qa.py`; it refuses non-temporary/non-SQLite databases. See its module docstring for environment setup. Synthetic answers and synthesis are scripted, with no external model or email calls.

## Follow-up: one canvas and a comparative panel

The form creation route now uses `AdminFormNew.tsx` as a single canvas. Title and question labels are editable in place; actual participant controls remain on the page. Participant mode removes editing controls, preserves test answers, and applies imported conditional visibility. Drafts save locally per signed-in email and survive failed requests/reloads. The template/document editor remains available in Settings. Rebuild the compatibility chunk with `node scripts/build-form-canvas.cjs` after the other workspace scripts; it reuses the host React, ReactDOM, router and API and preserves the prior builder as an immutable module.

Responses default to all participants for the selected question. By person expands multiple people inline. Across rounds aligns identical question wording and exact participant identities, retains original ratings/reasoning, and shows position changes. Anonymous records are not merged. Search covers all original fields; unmatched answers remain selectable. Neutral ratings are not styled as disagreement. Editing and confirmed partial-success deletion remain under Manage.

A new dev consultation, form 20, contains ten fictional research experts, three rounds and thirty submissions about selecting AI-generated hypotheses for laboratory testing. Every response and summary is authored synthetic content, not an empirical study or independent model experiment. The real guest-session, published feedback, continue-round and submission endpoints were exercised; identity counts, identical rating claims and final public-submission closure were verified. The reproducible fixture and restricted dev/local runner are in `scripts/fixtures/hypothesis-panel.json` and `scripts/create-hypothesis-panel.py`. The private resume checkpoint is deliberately outside the repository.

## Simplified summary navigation

The workspace now exposes only Summary and Responses, with a compact round dropdown. Stage aliases, agreement-category filters, repeated round counts and final-round guidance were removed. `quietSummary` places the original synthesis behind an accessible disclosure when recorded claim results are present; the original DOM/editor and publishing callbacks are preserved. The synthesis remains visible when no claim result can replace it. Tests cover disclosure state, editor/publish preservation, all-claim visibility and round selection without changing the live round. Browser checks verified opening/closing synthesis and clean Summary/Responses switching.
