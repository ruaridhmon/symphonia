# Five-figure assistant self-evaluation

The user explicitly accepted testing this assistant rather than the OpenRouter-backed platform model and prohibited further OpenRouter spending. The implementation uses the three already-saved authored consultations as source material. It does not call any model endpoint or modify the six source consultations.

## What the record contains

87 prepared condition records, not 87 independent model invocations: 15 summary-budget/panel-size conditions; 9 stage records; 24 perturbations; 12 information-deletion controls; 27 minority/decision conditions. Response text was authored in the current conversation and materialised with deterministic count sentences. Equivalent-input variants reuse reviewed prose. Self-assessed labels and numerical integrity checks are distinguishable in every record.

The five figure groups match the protocol's topics. They are a limited self-evaluation adaptation, not completion of the original multi-method, multi-family study. There is one assistant method, three four-claim scenarios, no independent semantic judges, no genuinely new 32/64-person panels, no independent decision readers and no empirical component ablations. The component-removal figure deletes eligible input fields instead. No fresh provider calls or fabricated replications occurred. The design hash is recorded, but this is not a preregistered confirmatory study.

## Interpretation

The short scenarios fit comfortably below 250 words, so compression does not produce measurable losses here. Counts are rendered from saved records, so perfect distribution reporting is expected by construction. Stage and minority fidelity are unblinded author labels, not independent measurements. Minority decisions follow an explicit loss table and are straightforward sanity checks. The model-family replication panel explicitly says it was not run. These limitations are visible on the page and in figure captions; none of the plots establishes model efficacy.

Probabilities are directly authored final-round supplements rather than conversions of confidence or platform-elicited estimates. They are absent from the round-two-only condition. Claim 4 is normative and excluded. The scenario truth labels for claims 1/2 support a purely descriptive reliability plot, without inference.

## Files and reproduction

- `scripts/self-study/answers.json`: authored response passages and reviews.
- `scripts/self-study/run.py`: materialise eligible inputs, outputs, counts, self-labels, hashes and CSV source tables. No network access.
- `scripts/self-study/figures.py`: generate five multi-panel SVG/PDF/600 dpi PNG figures.
- `scripts/self-study/check.py`: separately check arithmetic, denominators, entropy decomposition, omitted-claim penalties, word limits, decision losses, source isolation and export integrity.
- `frontend/public/evaluation/self-study/`: durable records and figures, mirrored to committed dist.

Run these with the existing plotting environment `backend/artefacts/evaluation-runtime/bin/python`. Do not replace the legacy frontend dist with a Vite build. The source consultations remain the user-visible platform record; the new conditions are inspectable in the evaluation page's Test records tab.
