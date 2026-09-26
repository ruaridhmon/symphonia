# Matched archival comparison and prospective paper protocol

The `/evaluation/#paper` page adds a comparison of all eight eligible completed
v8 identical-transcript, panel-eight, 500-word runs in the downloaded 43-record
archive snapshot. The one scenario and two generations per method are not
independent scenario replication. All previous figures and pages remain.

No new model calls or OpenRouter spending. Extraction and analysis are offline:

    python scripts/paper-study/prepare.py --archive archive.jsonl --out evidence
    python scripts/paper-study/analyse.py --evidence evidence/evidence.json --out results

The archive URL and decompressed SHA-256 are in the evidence export. Preparation
verifies identical original material across methods; analysis checks selection
completeness, material hashes and reference counts against actual final ballots.
Output-row mapping is a topical, unblinded assistant review, not a semantic
fidelity verdict. Independent mapping validation remains outstanding.

All six ordinary summaries have at least one count error; both exact-table
controls have none. The latter receive privileged information and are not a
cost/information-matched competitor. The threshold plot is derived sensitivity,
not observed reader decisions. No inferential intervals are claimed from n=1.

The prospective protocol and annotation rubric specify independent cases,
blinded adjudication, paired evidence-invariant bias contrasts, randomized reader
outcomes, sample-size planning, clustered inference, failure handling and the
main-paper figure plan. They are not preregistered and no confirmatory study ran.

Validation: 120 claim rows, threshold recomputation, original-input equality,
reference reconstruction, archive inclusion, public/dist byte equality, JS syntax,
local browser drilldown, nine original figures retained, and 390px overflow check.
