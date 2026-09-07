# Delphi review and completed synthetic demonstration

Live demo: https://symphonia-dev-488613.web.app/admin/form/16/summary

This is scripted fictional role-play, not independent experts, a representative UK sample, or scientific evidence. Ten contrasting roles supplied independent proposals about UK home energy upgrades. The app extracted four candidate claims. Nine participants then validated those claims and reconsidered them after shared feedback, using the same identities, wording and rating scale in both later rounds. All 28 submissions were entered through the live participant UI.

One first-round return URL was not retained during testing, so expert 1 did not continue. No replacement was added. The complete proposals, ratings and reasons are in `backend/tests/fixtures/warmer_homes_delphi.json`. No session tokens are included. The panel was purposefully varied, not randomly sampled.

The demo's declared agreement rule was at least 80% agreement among submitted ratings, including uncertain ratings in the denominator. It stops after three rounds; disagreement is a legitimate outcome. Ratings are equal-weighted. These are descriptive results, not statistical claims about the UK.

| Claim | Round 2 agree / oppose / uncertain | Round 3 agree / oppose / uncertain | Interpretation |
|---|---|---|---|
| Prioritise low-income households | 8 / 0 / 1 | 8 / 0 / 1 | Agreement retained; finance uncertainty remains |
| Insulation required before every heat pump | 3 / 5 / 1 | 1 / 8 / 0 | Universal requirement widely opposed |
| Council coordination of street programmes | 5 / 2 / 2 | 7 / 1 / 1 | Below the 80% agreement rule; some support is conditional |
| Protect tenants from grant-attributable rent increases | 7 / 2 / 0 | 8 / 1 / 0 | Agreement reached after clarifying attribution |

Six of 36 claim ratings changed between the two rating rounds. The reasons are recorded with each ballot. Movement resulted from reconsidering arguments and wording; no new empirical evidence was introduced. Revised policy wording would need a separate validation round rather than inheriting these scores.

## Implemented

- Added recorded response counts, explicit vote distributions and changes in percentage points for identical questions and scales.
- Separated agreement, disagreement, neutrality, uncertainty, unrecognised values and missing answers. The display does not infer votes from silence.
- Flagged empty-round and copied syntheses, including historical rounds. Form 15's Round 3 had a ten-person synthesis but zero submitted responses.
- Scoped custom synthesis prompts to each consultation. The new form initially inherited the citizens' assembly prompt; this was replaced before any generation.
- Added a tab-specific participant return link after the legacy thank-you redirect, plus manual refresh for recorded results.
- Preserved the existing patched dev bundle through small compatibility modules. A full rebuild currently risks losing deployed participant-flow fixes absent from the source.

## Next product priorities

1. Give claims stable IDs and explicit versions in the database; separate inferred positions from participant-confirmed ratings throughout the backend and exports. The first extraction put a plainly supportive consumer-researcher sentence under uncertainty; direct validation corrected it. The final LLM output was also truncated: the published synthesis was manually rebuilt from the complete recorded ratings and comments, then checked after reload.
2. Make the study protocol first-class: panel eligibility, agreement rule, minimum participation, stopping rule, attrition and final status. Record conditional support separately and expose minority reasons beside each result.
3. Use participant pseudonyms consistently in feedback. Current excerpts can include submitted names and roles; anonymous labels alone do not remove identifying prose.
4. Make “what changed, why, and what remains unresolved” the main results view; collapse model, cost and generation controls. Keep the participant flow to feedback, previous vote, current vote, optional reason, and persistent navigation.
5. Reconcile source and deployed UI, then remove legacy DOM patches. This is the prerequisite for a reliable broader visual redesign.

Validation: seven focused tests, TypeScript checking and a full source build passed. Live browser totals for all four claims match the fixture. No production deployment was made.

Methodological background: [CREDES reporting guidance](https://www.equator-network.org/reporting-guidelines/credes/) and [Delphi methodology: feedback, stability and stopping criteria](https://pmc.ncbi.nlm.nih.gov/articles/PMC8299905/).
