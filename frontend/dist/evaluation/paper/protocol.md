# Information integrity in AI-mediated Delphi consultation

Protocol v1.0 · 2026-09-26 · prospective design, NOT preregistered

## Research question and proposed contribution
Does AI-mediated compression preserve the evidence that a deliberative decision depends on, and can an explicit evidence ledger prevent consequential distortion? Separate fidelity to what participants said from whether their beliefs are true. Agreement, factual correctness and summary fidelity are different outcomes.

The proposed contribution is a traceable evaluation framework plus a tested intervention: preserve stable claim IDs, participant-level stance counts, explicit missingness, conditions, source lineage and minority warnings in a ledger, then constrain the narrative to that ledger. Ledger constraints do not guarantee accurate claim extraction or truthful source evidence.

## Existing evidence, not confirmation
The retrospective matched analysis includes ALL completed v8 identical-transcript runs in the downloaded snapshot with panel size 8, budget 500, and methods direct, structured, staged or reference_fed: eight outputs, two generation repeats each, one scenario. The same initial transcript is verified byte-for-byte after canonical JSON serialization. Each staged method transforms that transcript before final summarization; the exact-table control additionally receives the reference table. Those information and compute differences must be retained in interpretation. This is a diagnostic comparison, not a fair cost-matched model leaderboard.

Numerical endpoints are recomputed from round-three ballots supplied to models. The 15 output rows are mapped to reference IDs using an unblinded assistant review of wording and conditions, not inferred from matching counts. Independent mapping review remains outstanding. Count-vector disagreement means at least one support/oppose/insufficient-evidence count differs. Claims and generation repeats are dependent observations within one scenario. No population interval or significance test is justified here.

The 43-record snapshot is incomplete relative to all paid calls. All status records are listed, including scheduled and failed runs. Different software versions, panel sizes and full-workflow tracks are excluded from the matched comparison. The v7 trace remains a separate engineering case study. No new paid model experiment was launched.

## Prospective experiment 1: stage-specific fidelity
Independent authors create cases in at least three policy domains. Each case has a fixed evidence inventory: decidable facts, unresolved facts, value claims, sources with shared lineage, explicit conditions and a consequential minority warning. Authors do not inspect tested outputs when constructing reference annotations. Reserve fresh cases for confirmation; current attendance case is development-only.

Within each case, run direct, structured, staged and ledger-constrained summaries on exactly the same eligible transcript. Prespecify short/medium/long word budgets; record actual words, audit tokens, model version, temperature, prompts, retries, cost and truncation. Use the exact-table method as a privileged positive control, not the intervention itself. Use at least two separately specified model families for replication when spending is authorized. Repeats estimate generation variability; they never increase the number of independent cases.

Primary endpoint: proportion of reference claims per case with a consequential fidelity error, adjudicated using the rubric below. Secondary endpoints: unsupported additions, stable-ID coverage, count-vector error, numerical support deviation, lost qualifiers, source-lineage inflation and minority-warning omission. Score errors separately at extraction, feedback and final summary. A changed proposition receives a new ID; never transfer original votes to it.

Two assessors independently score de-identified, randomized outputs with method and model names hidden. Match length budgets where practical. Report raw agreement and category-level reliability before adjudication; a third assessor resolves disagreements. Model judging may assist triage but cannot be sole ground truth. Assessors must not see condition expectations or their paired counterpart during initial annotation.

## Prospective experiment 2: evidence-invariant bias
Primary bias contrast: swap a high-prestige and neutral author label between the same two evidence contributions while holding every substantive word constant. Randomize which version is processed first. Outcome: change in the inclusion and faithful representation of the contribution under the swapped label, averaged at scenario level. A label effect is not established by a single omission.

Order reversal and matched-length verbosity edits are secondary contrasts. Keep evidence quality fixed within each pair. Independently vary minority size and evidence quality across cases so a correct minority warning is distinguished from an unsupported minority claim. Never reward retention of all minority claims indiscriminately. Verify perturbation invariance through a reference diff before generation.

## Prospective experiment 3: decision consequences
Randomly assign blinded readers to full evidence, ordinary summary, or ledger-constrained summary. Readers see only one version of a case to avoid carry-over. Block allocation by case and reader expertise. Use a prespecified action set and loss function only for cases with defensible factual outcomes; value judgements have no imposed universal correct policy.

Primary endpoint: expected decision loss compared with the full-evidence arm, using the frozen loss rule. Secondary: factual comprehension, confidence calibration, time and provenance retrieval. Record assignment, dropout and unusable responses. Human recruitment, consent and any applicable ethics review must precede data collection. No human study has been conducted by this page.

The current threshold plot is only a mechanical sensitivity calculation: support >= k out of 8, for every k from 1 to 8. It measures changed flags, not actual reader behaviour, decision utility, a recommended consensus threshold or a causal feedback effect.

## Sample size and inference
Do not choose a convenient case count and call it powered. Collect a separate multi-case pilot, estimate variance of the paired case-level effect and assessor disagreement, then freeze the smallest meaningful effect and target interval width before confirmatory collection. Choose the case count from those quantities; publish sensitivity over plausible variances. The present one-case pilot cannot estimate between-case variance.

For fidelity and bias, the independent unit is the scenario. Resample whole scenarios for paired confidence intervals, preserving methods, claims and repeats together; stratify by domain if prespecified. Report raw per-case points and domain-specific effects, with pooled effects secondary to heterogeneity. For reader outcomes use a design-aware crossed case/reader model or randomization-based inference. Do not treat all claim rows as independent n. Select one primary contrast per experiment; adjust a prespecified secondary family (for example Holm) and label exploratory analyses.

## Failures, exclusions and stopping
Freeze software and validate transport/schema paths before confirmatory collection. Keep technical failure rate as an outcome and report denominators before exclusion. Retries must be capped and logged; no selective regeneration based on a bad score. Unmappable outputs are scored as unassessable/coverage failures, never silently dropped or treated as no disagreement. Keep sensitivity bounds for missing results. Stop at the registered sample size or a prespecified sequential rule, never when significance appears.

## Figure plan
1. Study schematic and stage-resolved fidelity: independent case inventory -> extraction -> ratings -> feedback -> final output, with paired scenario estimates.
2. Evidence-invariant bias: paired prestige/order/verbosity contrasts, stratified by minority evidence quality.
3. Intervention and compression: ordinary vs ledger-constrained summaries across budgets, showing fidelity and token/cost trade-offs.
4. Decision consequences: randomized reader loss and comprehension, with scenario/reader uncertainty.
Extended data: failure accounting, judge reliability, all category scores, replication by domain/model, provenance traces and robustness analyses. Current archival figures are pilot/extended-data candidates, not stand-ins for these uncollected experiments.

## Data, code and reporting
Publish versioned synthetic evidence, prompts, generation metadata, assignment records, scored spans, adjudication history, source data, executable analysis and hashes. State access conditions for future human records and release de-identified data where permitted. Label prospective vs retrospective analyses and deviations explicitly. Follow Nature's reporting and code/data availability requirements; journal suitability also depends on novelty, importance and independent results, not graphics alone.
