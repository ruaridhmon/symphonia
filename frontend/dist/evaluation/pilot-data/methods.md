# Authored feedback workflow pilot

Three constructed scenarios; eight fictional identities per scenario; two cloned arms; three rounds; four claims. All text and reconsiderations were authored by the same Codex assistant. Claims and feedback were saved using the normal dev consultation APIs. Platform model generation was never invoked. OpenRouter usage for this pilot is zero.

## Provenance and analysis
The export is retrieved from saved platform responses. The analysis checks paired baseline identity, eight responses per round, identical round-two/three questions, exact submitted text and feedback hashes. CSV rows identify the scenario, live form, arm, round, participant and claim. Feedback consists of exact counts and all authored explanations; the control receives only an instruction to revisit its own material. The author cannot be blinded to the other arm; this is not an independent experiment.

The first two propositions are decidable against constructed evidence. Correctness includes all 16 factual ratings per scenario/arm/round in the denominator. Unable-to-judge ratings are reported separately. The third proposition is unresolved and has no truth score. The fourth is normative and has no truth score. No p-values, confidence intervals, causal effects or independent semantic fidelity scores are reported. The source scenarios and trajectories were intentionally authored rather than independently sampled.

## Scope
This verifies a stored product workflow and provides inspectable descriptive figures. It does not evaluate platform AI extraction, model-generated synthesis or autonomous participant reconsideration. Manual claim traceability is available but cannot establish extraction performance. It cannot support a claim of superiority, human behaviour, decision benefit or publication readiness. Existing paid results are archived separately.

## Reproduction
Run scripts/analyse-authored-feedback-pilot.py on the saved final export to regenerate all figures. Vector SVG/PDF and 600 dpi PNG are provided. Do not rerun the seeding scripts against another environment or start paid models without fresh user authorization. Review three-round integrity and source-data mappings before interpreting the figures.
