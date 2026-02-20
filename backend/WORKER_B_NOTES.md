# Worker B — Synthesis Adapter Design Notes

## Critical Bug Found in Original Adapter

The existing `synthesis.py` constructs `ExpertResponse` objects with **wrong field names**:

```python
# ORIGINAL (broken):
ExpertResponse(
    expert_id=f"E{i+1}",       # ← doesn't exist on the frozen dataclass
    expert_name=f"Expert {i+1}",# ← doesn't exist
    response_text=answers_text, # ← doesn't exist
)
```

The library's `ExpertResponse` is a frozen dataclass with fields `response_id`, `claims`, `evidence`, `uncertainties`, `suggestions` — all tuples. This would crash with a `TypeError` at runtime on construction.

## Key Design Decision: ProseResponse Bridge

The consensus library uses **duck typing** throughout. Its code checks `hasattr(response, "response")` to detect "ProseResponse-like" objects vs structured `ExpertResponse`. This is used in:
- `consensus.diffusion.retrieval.HybridRetriever`
- `consensus.diffusion.graph_tasks.GraphDraftGenerator`
- `consensus.summarise.template_utils.format_expert_response`

My solution: a minimal frozen `ProseResponse` dataclass with just `expert_id` and `response` (the two fields the library duck-types for). This lets the library's own extraction pipeline do the parsing, rather than us fabricating claims/evidence tuples from raw text (which would be lossy and fragile).

## Other Design Choices

### 1. Proper SynthesisContext dataclass (`AdapterSynthesisContext`)
The original used an inner `class MinimalContext` with bare class attributes (not instance attributes). I made it a frozen dataclass that properly satisfies the `SynthesisContext` protocol.

### 2. Error hierarchy
Added three specific error types:
- `ConfigurationError` — missing API key, bad strategy name, missing prompts dir
- `ResponseMappingError` — can't convert app responses to library format
- `LibraryError` — wraps any exception from the consensus library

All inherit from `SynthesisError`. Routes can catch `SynthesisError` for a single handler, or be specific.

### 3. Prompts directory resolution
The original had a fragile two-path search. I added:
- `CONSENSUS_PROMPTS_DIR` environment variable override (highest priority)
- Package-relative path
- Dev-install-relative path
- Proper logging of which path was resolved

### 4. Logging over print
Replaced all `print()` statements with `logging.getLogger(__name__)`. This integrates with FastAPI/uvicorn's logging configuration rather than writing to stdout.

### 5. Computed confidence map
The original hardcoded `{"overall": 0.75}`. I compute it from the agreement/disagreement ratio: `n_agreements / (n_agreements + n_disagreements)`, defaulting to 0.5 when there are no claims.

### 6. Progress callbacks
The `run()` method actually calls the progress callback at three stages: preparing, mapping_results, complete. The original accepted the callback but never used it.

### 7. Empty response guard
The `run()` method rejects empty response lists upfront with a clear `ResponseMappingError`, rather than letting it fail somewhere deep in the library.

### 8. Strategy validation at construction time
`ConsensusLibraryAdapter.__init__` validates the strategy name immediately, rather than deferring the error to `_lazy_init()` at call time.

## Test Coverage (43 tests, all passing)

| Area | Tests | What's covered |
|------|-------|---------------|
| MockSynthesis | 6 | Return type, counts, provenance, narrative, progress callback, serialisation |
| ProseResponse | 2 | Duck-typing contract, immutability |
| AdapterSynthesisContext | 2 | Protocol fields, immutability |
| Response mapping | 6 | Basic dict, multiple IDs, flat dict, empty, None filtering, string passthrough |
| Question flattening | 3 | Label, text fallback, plain strings |
| Result mapping | 8 | Consensus→agreement, majority→agreement, divided→disagreement, uncertainties→nuances, deduplication, narrative, claims_raw, empty synthesis |
| Factory | 8 | mock/simple/ttd/committee/unknown modes, env var, strategy alias, n_analysts |
| Error propagation | 3 | Bad strategy, empty responses, missing API key |
| Helper | 3 | Expert ID extraction, non-expert IDs, empty |
| Backwards compat | 2 | CommitteeSynthesiser alias, OpenRouterSynthesis alias |

All tests are pure-unit with no network calls, no filesystem side-effects, and no dependency on the consensus library being installed (fake domain models used).

## Files Written

- `backend/core/synthesis_worker_b.py` — Full adapter implementation
- `backend/tests/test_synthesis_worker_b.py` — 43 unit tests
- `backend/WORKER_B_NOTES.md` — This file
