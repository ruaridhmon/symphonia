# Retrospective information-integrity audit

Published under `/evaluation/#integrity`. All nine pre-existing figures are retained.
No network or model calls are made by this analysis. Two completed v7 engineering
runs share one synthetic scenario (pilot-000/A), eight replay participants and a
500-word budget. This is an exploratory selected-case audit, not an estimate of
live-product performance or independent replication.

Findings: structured feedback has 12/15 incorrect claim count vectors; final
output has 2/15. The adapter admits 3/15 unique reference IDs to replay and has
32/56 missing displayed-claim ballot slots. A quoted final output turns missing
ballots into a panel judgement. Alignment errors and adapter conversion artefacts
preclude attributing all loss to the summarizer.

Reproduce in the repository:

    backend/artefacts/evaluation-runtime/bin/python scripts/integrity-audit/build.py

Or download `integrity/evidence.json` and `integrity/build.py`, install matplotlib
and numpy, then run:

    python build.py --evidence evidence.json --out reproduced

Hashes in the repository build identify original input files; the standalone
build hashes the downloaded evidence bundle instead. Numerical outputs are equal.
The analysis deduplicates participant/reference pairs and rejects conflicting
ballots. Each output is compared to its corresponding input round. Nulls stay
missing. Claim IDs in the reported audit text determine count-vector matches.

The three figures provide SVG, PDF and 600 dpi PNG, plus CSV/JSON source data.
The page separately proposes randomized paired bias and blinded decision studies;
those are not claimed to have run. No p-values or population intervals are used.
