# Integration Notes — Byzantine Consensus (2 Workers + Integrator)

## Summary

Merged two independent implementations of the synthesis adapter into a single final implementation. 57 tests, all passing.

---

## Convergences (Validated — Both Workers Agreed)

These decisions appeared independently in both implementations and are treated as high-confidence validated choices:

| Decision | Description |
|----------|-------------|
| **ProseResponse bridge type** | Both created a frozen `ProseResponse(expert_id, response)` dataclass to satisfy the library's duck-typing contract. Avoids misusing the structured `ExpertResponse` domain model. |
| **Synthesis context dataclass** | Both created a frozen dataclass for the `SynthesisContext` protocol (vs the original bare inner class). |
| **Custom exception hierarchy** | Both built a hierarchy rooted at `SynthesisError` with specific sub-types. |
| **FlowMode enum** | Identical: `HUMAN_ONLY = "human_only"`, `AI_ASSISTED = "ai_assisted"`. |
| **Data structures** | Identical `Agreement`, `Disagreement`, `Nuance`, `Probe`, `SynthesisResult` dataclasses. |
| **SynthesisResult.to_dict()** | Both use `dataclasses.asdict()`. |
| **MockSynthesis** | Nearly identical mock data (same claims, confidence values, provenance). |
| **Committee → TTD fallback** | Both degrade committee to TTD with a logged warning. |
| **Factory resolution order** | Both: `mode → strategy → SYNTHESIS_MODE env → "simple"`. |
| **Backwards compat aliases** | Both define `CommitteeSynthesiser = ConsensusLibraryAdapter` and `OpenRouterSynthesis = ConsensusLibraryAdapter`. |
| **Result mapping logic** | Both map consensus/majority → Agreement (0.9/0.7 confidence), divided/minority → Disagreement, uncertainties → Nuance. Both deduplicate areas with claims. |
| **Lazy initialisation** | Both defer heavy library imports to first use. |
| **Logging over print** | Both use `logging.getLogger(__name__)` (fixing the original's `print()` statements). |
| **`_extract_expert_ids`** | Both parse "E1" → 1 format, skip malformed IDs. |
| **Computed confidence map** | Both compute from actual data instead of hardcoding 0.75. |

---

## Divergences and Resolutions

### 1. Exception Class Names

- **Worker A:** `SynthesisConfigError`, `SynthesisLibraryError`, `SynthesisTimeoutError`
- **Worker B:** `ConfigurationError`, `LibraryError`, `ResponseMappingError`

**Resolution:** Used Worker A's prefix convention (`Synthesis*`) for namespace clarity — these classes might be imported alongside other library errors. Added Worker B's `ResponseMappingError` concept as `SynthesisResponseError`. Kept Worker A's `SynthesisTimeoutError`. Final set: `SynthesisConfigError`, `SynthesisLibraryError`, `SynthesisTimeoutError`, `SynthesisResponseError`.

### 2. Timeout Protection

- **Worker A:** Wraps library call with `asyncio.wait_for()` (configurable `timeout_seconds`, default 600s).
- **Worker B:** No timeout.

**Resolution:** Kept Worker A's timeout. TTD can run for minutes (multiple LLM calls × trajectories × denoising). A hung request with no timeout is a production risk.

### 3. Empty Response Guard

- **Worker A:** No upfront validation.
- **Worker B:** Rejects empty responses with `ResponseMappingError`.

**Resolution:** Kept Worker B's guard. Fail-fast is always better than failing deep inside the library.

### 4. Committee Handling Location

- **Worker A:** Adapter accepts "committee" at construction, internally degrades to TTD, preserves both `strategy_name` (original) and `_effective_strategy` (actual) in provenance.
- **Worker B:** Factory handles committee→ttd before creating adapter. Adapter only sees "simple"/"ttd".

**Resolution:** Kept Worker A's approach. Preserving the original request in provenance is valuable for debugging and audit trails.

### 5. Context Class Name

- **Worker A:** `AdapterContext`
- **Worker B:** `AdapterSynthesisContext`

**Resolution:** Used Worker B's `AdapterSynthesisContext` — more descriptive, avoids ambiguity.

### 6. `_build_prose_responses` Signature

- **Worker A:** `_build_prose_responses(questions, responses)` — questions param unused.
- **Worker B:** `_build_prose_responses(responses)` — clean.

**Resolution:** Kept Worker B's signature. Don't accept parameters you don't use.

### 7. Question Text Formatting

- **Worker A:** Unnumbered lines.
- **Worker B:** Numbered lines (`1. What matters?`).

**Resolution:** Kept Worker B's numbered format — slightly better for LLM parsing.

### 8. None/Whitespace Filtering in Responses

- **Worker A:** `if val:` — filters falsy values.
- **Worker B:** `if val is not None and str(val).strip()` — filters None + whitespace.

**Resolution:** Kept Worker B's more defensive filter. Whitespace-only values shouldn't produce Q/A pairs.

### 9. Confidence Map Computation

- **Worker A:** Ratio from raw claims: `consensus+majority / total_claims`.
- **Worker B:** Ratio from mapped results: `n_agreements / (n_agreements + n_disagreements)`.

**Resolution:** Kept Worker A's claims-based ratio as the primary "overall" metric (more accurate — based on raw signal before area deduplication) AND included Worker B's mapped `agreement_ratio` as an additional field. Both perspectives are useful.

### 10. Progress Callback Stages

- **Worker A:** 4 stages (preparing, synthesising, mapping_results, complete) and mock with 2 stages.
- **Worker B:** 3 stages (preparing, mapping_results, complete) and mock with 1 stage.

**Resolution:** Kept Worker A's 4 stages — more granular feedback for WebSocket streaming.

### 11. TTDConfig Field Name

- **Worker A:** `n_initial_drafts` — explicitly identified original `n_trajectories` as a bug.
- **Worker B:** `n_trajectories` — didn't flag this issue.

**Resolution:** Kept Worker A's `n_initial_drafts`. Worker A specifically called this out as a runtime TypeError bug fix. If incorrect, it will fail at init time with a clear error rather than silently.

### 12. Prompts Dir Environment Override

- **Worker A:** No env override.
- **Worker B:** Supports `CONSENSUS_PROMPTS_DIR` env var (highest priority).

**Resolution:** Kept Worker B's env override — more configurable for deployment flexibility.

### 13. Provenance Fields

- **Worker A:** Includes `effective_strategy` and `adapter_version`.
- **Worker B:** Minimal provenance.

**Resolution:** Kept Worker A's richer provenance — useful for debugging.

### 14. Evidence in Disagreement Positions

- **Worker A:** Extracts actual quotes from sources.
- **Worker B:** Hardcodes "From synthesis".

**Resolution:** Kept Worker A's approach — preserves actual evidence rather than discarding it.

### 15. `_map_to_app_format` as Instance vs Static Method

- **Worker A:** Instance method — accesses `self.strategy_name` and `self._effective_strategy`.
- **Worker B:** Static method — takes `strategy_name` as parameter.

**Resolution:** Kept as instance method (Worker A). Needs access to both `strategy_name` and `_effective_strategy` for provenance, and the instance method is cleaner than passing multiple params.

### 16. Synthesiser Protocol

- **Worker A:** Defines `@runtime_checkable class Synthesiser(Protocol)`.
- **Worker B:** No protocol.

**Resolution:** Kept Worker A's protocol — enables duck-type checking in routes without import coupling.

### 17. Result Mapping Error Wrapping

- **Worker A:** No try/except around `_map_to_app_format`.
- **Worker B:** Wraps in try/except with `LibraryError`.

**Resolution:** Kept Worker B's defensive wrapping — a mapping error should be a `SynthesisLibraryError`, not an unhandled exception.

### 18. API Key Propagation in Factory

- **Worker A:** Sets `os.environ["OPENROUTER_API_KEY"] = api_key` if passed and not already set.
- **Worker B:** Doesn't propagate.

**Resolution:** Kept Worker A's approach — ensures lazy init can find the key.

---

## Final Architecture

```
synthesis.py
├── Exceptions: SynthesisError → SynthesisConfigError
│                               → SynthesisLibraryError
│                               → SynthesisTimeoutError
│                               → SynthesisResponseError
├── Data: FlowMode, Agreement, Disagreement, Nuance, Probe, SynthesisResult
├── Protocol: Synthesiser (runtime_checkable)
├── Bridge: ProseResponse (frozen dataclass, duck-types for library)
├── Context: AdapterSynthesisContext (frozen dataclass, SynthesisContext protocol)
├── MockSynthesis: Zero-cost mock with progress callbacks
├── ConsensusLibraryAdapter:
│   ├── Lazy init (import + construct on first use)
│   ├── Prompts dir resolution (env → package → dev-install)
│   ├── Response prep (_build_prose_responses, _build_question_text)
│   ├── Timeout-guarded library call
│   ├── Result mapping with deduplication
│   └── Committee → TTD fallback with provenance
├── Helper: _extract_expert_ids
├── Factory: get_synthesiser(mode/strategy/env → mock/simple/ttd/committee)
└── Compat: CommitteeSynthesiser, OpenRouterSynthesis aliases
```

## Test Coverage (57 tests, all passing)

| Area | Tests |
|------|-------|
| MockSynthesis | 6 (valid result, expert scaling, progress callback, no callback, counts, analyst reports) |
| Serialisation | 2 (JSON-safe, expected keys) |
| ProseResponse | 2 (duck-typing, immutability) |
| AdapterSynthesisContext | 2 (protocol fields, immutability) |
| _build_prose_responses | 8 (dict+answers, multiple IDs, flat dict, empty, None filter, string, non-dict, whitespace) |
| _build_question_text | 4 (label, text fallback, id fallback, plain string) |
| _map_to_app_format | 10 (consensus, majority, divided, dedup agreements, dedup disagreements, narrative, claims_raw, empty, provenance, truncation) |
| Factory | 10 (mock, simple, ttd, committee, unknown, env var, alias, n_analysts, timeout, api_key) |
| Error handling | 5 (bad strategy, empty responses, missing key, default timeout, custom timeout) |
| _extract_expert_ids | 3 (valid, malformed, empty) |
| FlowMode | 1 |
| Backwards compat | 2 |
| Synthesiser protocol | 2 |

## Files

- `backend/core/synthesis.py` — Final integrated implementation (~600 lines)
- `backend/tests/test_synthesis.py` — Merged test suite (57 tests)
- `backend/INTEGRATION_NOTES.md` — This file
