# Worker A — Synthesis Adapter Design Notes

## Summary

Rewrote `synthesis.py` → `synthesis_worker_a.py` with focus on correctness, type safety, and proper library integration. 25 unit tests, all passing.

---

## Key Issues Found in Original Adapter

### 1. Wrong `ExpertResponse` construction (CRITICAL BUG)
The original adapter imported the domain `ExpertResponse` from `consensus.domain.models` and constructed it with `expert_id`, `expert_name`, `response_text` — but that class actually expects `response_id`, `claims`, `evidence` (structured tuples). The library uses **duck typing** throughout (checking `hasattr(response, "response")` and `hasattr(response, "expert_id")`) for "prose mode" input. The original code would fail at runtime because the attributes don't match.

**Fix:** Introduced a `ProseResponse` frozen dataclass with exactly the two attributes the library checks for: `expert_id: str` and `response: str`. This satisfies the duck-typing contract without fighting the structured domain model.

### 2. Wrong `TTDConfig` field name (BUG)
Original used `TTDConfig(n_trajectories=...)` but the actual field is `n_initial_drafts`. This would raise `TypeError` at runtime.

**Fix:** Use the correct field name `n_initial_drafts`.

### 3. Inline `MinimalContext` class (FRAGILE)
The original defined a bare class inside `run()` with class-level attributes. This works but is fragile — no type checking, no reuse, unclear protocol compliance.

**Fix:** Created `AdapterContext` as a proper frozen dataclass with all fields typed. Satisfies the library's `SynthesisContext` protocol explicitly.

### 4. No error handling (RISK)
The original had zero try/except around library calls. A library crash would propagate as an unhandled exception, giving the route handler no useful error info.

**Fix:** Three custom exception types:
- `SynthesisConfigError` — missing API key, bad prompts dir, invalid mode
- `SynthesisLibraryError` — wraps any error from the consensus library
- `SynthesisTimeoutError` — wraps `asyncio.TimeoutError` with context

The `run()` method catches each case and re-raises with context. Routes can catch these for appropriate HTTP status codes.

### 5. No timeout protection (RISK)
TTD synthesis can run for minutes (multiple LLM calls per trajectory × multiple trajectories × denoising steps). No timeout = potential hung request.

**Fix:** `asyncio.wait_for()` wraps the library call with a configurable `timeout_seconds` (default 600s).

### 6. Committee strategy handling (DESIGN)
The library's `CommitteeStrategy.run()` raises `NotImplementedError`. The original adapter silently fell back to TTD in the factory but the `ConsensusLibraryAdapter` itself didn't handle "committee" — it would raise `ValueError("Unknown strategy")`.

**Fix:** Committee is accepted at construction time, logged as a warning, and degrades to TTD. Both `strategy_name` (original request) and `_effective_strategy` (actual) are tracked in provenance.

### 7. Progress callback support (NEW)
The route handler passes a WebSocket progress callback. The original adapter accepted it but never called it.

**Fix:** The adapter now calls the progress callback at 4 stages: preparing, synthesising, mapping_results, complete. MockSynthesis also calls it.

---

## Design Decisions

| Decision | Rationale |
|----------|-----------|
| `ProseResponse` bridge type | Cleanest way to satisfy the library's duck-typing without misusing the structured `ExpertResponse` model |
| `@staticmethod` for pure helpers | `_build_prose_responses`, `_build_question_text`, `_extract_expert_ids` don't need `self` |
| Frozen dataclasses for `ProseResponse` + `AdapterContext` | Immutability matches the library's frozen domain model convention |
| `Synthesiser` runtime protocol | Enables duck-type checking in routes without import coupling |
| Deduplication in `_map_to_app_format` | Prevents duplicate agreements when a claim AND an area_of_agreement have the same text |
| Computed `confidence_map` | Instead of a hardcoded 0.75, compute actual consensus ratio from claims |
| Lazy init preserved | Avoids import cost until synthesis is actually requested |

---

## Test Coverage (25 tests)

- **MockSynthesis:** Valid result structure, expert ID bounds, progress callback, JSON serialisability
- **ProseResponse:** Required attributes, immutability
- **AdapterContext:** Protocol field compliance
- **_map_to_app_format:** Consensus→Agreement, Divided→Disagreement, deduplication, uncertainties→nuances
- **Factory:** All 4 modes, env var fallback, invalid mode rejection
- **Constructor:** Invalid strategy rejection
- **_build_prose_responses:** Dict with answers, flat dict, string, empty answers
- **_extract_expert_ids:** Normal E-format, malformed IDs
- **FlowMode:** Enum values
- **Backwards compat:** Alias verification

---

## Files Written

- `backend/core/synthesis_worker_a.py` — Implementation (≈500 lines)
- `backend/tests/test_synthesis_worker_a.py` — 25 tests (all passing)
- `backend/WORKER_A_NOTES.md` — This file
