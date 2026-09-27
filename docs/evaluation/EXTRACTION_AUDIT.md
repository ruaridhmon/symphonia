# Observed extraction audit

This is a retrospective audit of two saved native Symphonia v8 extraction calls
from one eight-person synthetic consultation. No fresh model calls were made.
Both completed call records have `truncated: true`, finish reason `length`, and
2,500 completion tokens. The downstream benchmark adapter failed; these records
are native text before adapter conversion or automatic claim alignment.

The 15 prespecified focal propositions are verified present in the source
paragraphs. Their source spans, explicit reviewed mappings, complete outputs,
requests and call metadata appear in audit.json. Six complete cards provisionally
pass an unblinded assistant review of core claim content; the seventh incomplete
card remains unresolved. This review does NOT validate expert lists, stance
attribution, People counts, status metadata or underlying factual truth. It is not
an exhaustive annotation of every incidental source assertion.

Displayed lower/upper values score the incomplete card without/with credit.
They are annotation bounds, not confidence intervals; they do not encompass
uncertainty in the six provisional positive labels. Independent review is needed.
Both repeats overlap numerically; they are not two independent consultations.

Reproduce with numpy and matplotlib:

1. Download and decompress the JSONL archive from
   https://symphonia-evaluation-20260926-h4znkmen4a-nw.a.run.app/experiment-record.jsonl.gz
2. Run `python build.py --archive experiment-record.jsonl --out results`.
3. Check the decompressed archive SHA-256 against audit.json.

The original 320-point design preview remains under extraction-preview and is
not included in the observed plot. No density estimate is fitted to this n=1 case.
