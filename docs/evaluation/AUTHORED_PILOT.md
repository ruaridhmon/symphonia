# Authored platform workflow pilot

The user asked for an in-platform pilot without spending OpenRouter credits. Three fictional scenarios were authored in this conversation: school attendance, health appointments, and support after release. There are two actual consultations per scenario: feedback and no-feedback (dev forms 23–28). All six have three saved rounds, eight stable fictional identities each, identical first two rounds within each pair, and identical round-two/three questions. Final public submissions are closed.

The normal platform APIs handled creation, guest sessions, submissions, round transitions and publication. No model endpoint was called. The same assistant authored the claims, original positions, feedback assembly and reconsiderations. The latter were written after reviewing the saved round-two feedback. This is an inspectable workflow fixture, not independently generated participant behaviour or causal evidence about Symphonia.

## Validation

- 144 retrieved submissions and 384 individual rating rows.
- Exact paired baseline equality and unchanged rating questionnaires.
- Saved responses and reasons match the authored fixture.
- Each final-round guest session was checked for the intended feedback before submission.
- Control feedback has no peer positions or reasons.
- No session capabilities appear in public exports.
- Normal live response reader verified with a changed rating and its full explanation.
- Four figures render; source data and vector PDF/SVG plus 600 dpi PNG exports provided.
- 390px preview has no horizontal page overflow.
- Six recorded-progress unit tests pass, including the uncertainty-label regression.

## Scope of figures

1. Design and provenance; 2. exact stance counts; 3. every participant's rating transitions; 4. factual correctness and uncertainty by scenario and arm. Claims with unknown outcomes and normative preferences are excluded from factual accuracy. These three authored scenarios do not justify p-values, confidence intervals, population generalisation or a publication-level efficacy claim. Independent extraction fidelity was not measured because the platform model was intentionally not called.

## Reproduction

The immutable authored fixture is in `scripts/fixtures/authored-feedback-pilot.json`. Saved, sanitised platform records and figure data are in `frontend/public/evaluation/pilot-data`, mirrored to the committed dist. The analysis script can use that durable saved record when its temporary final-export file is absent. Seeding is resumable only with its private checkpoint; do not delete that checkpoint and rerun, or duplicate consultations would be created. Do not invoke platform generation controls or restart the paid jobs under the current no-spend instruction.
