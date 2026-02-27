# ATHENA — Participant Journey Test Design Results

> Generated: 2026-02-24
> Architect: Athena (sub-agent)

---

## Summary

Designed and implemented **13 test scenarios** covering the full participant (non-admin) journey through Symphonia, from empty dashboard through form submission to the thank-you confirmation page.

## Output Files

| File | Purpose |
|------|---------|
| `hector/tests/06-participant-journey.spec.ts` | Playwright spec — 13 scenarios across 6 test groups |
| `prometheus/participant_scenarios.py` | 4 Prometheus scenario classes + 2 dynamic step generators |
| `ATHENA_RESULTS.md` | This file — design decisions, visual assertions, known issues |

---

## Test Coverage Matrix

### A. User Dashboard States

| # | Scenario | Screenshot | Visual Assertions |
|---|----------|------------|-------------------|
| A1 | Empty dashboard | `participant-A1-dashboard-empty` | "No consultations yet" message, 📭 icon, "Join a New Form" heading, join code input field |
| A2 | Invalid join code | `participant-A2-invalid-join-code` | "Invalid join code." error text in red, input field still visible |
| A3 | Valid join code | `participant-A3-valid-join-code` | Form title appears in "My Forms" list after joining |
| A4 | Form list item | `participant-A4-form-list-item` | Form title visible, "Enter" action button, status badges (Round N, Awaiting response) |

### B. Form Filling

| # | Scenario | Screenshot(s) | Visual Assertions |
|---|----------|---------------|-------------------|
| B5 | Form page loads | `participant-B5-form-page-load` | Form title visible, questions rendered, no ErrorBoundary |
| B6 | Form pre-fill state | `participant-B6-form-prefill-state` | All questions have textarea/input fields (StructuredInput components) |
| B7 | Fill and submit | `participant-B7-before-fill`, `B7-after-fill`, `B7-after-submit` | Textareas populated → Submit button clicked → redirect to /waiting or success |
| B8 | Already submitted | `participant-B8-already-submitted` | "Submitted" badge, pre-filled answers in read-only mode, "Review" button |

### C. Waiting Page

| # | Scenario | Screenshot | Visual Assertions |
|---|----------|------------|-------------------|
| C9 | Waiting page loads | `participant-C9-waiting-page` | "Thank you for your submission" heading, orbit animation, auto-update note |
| C10 | Error state (known bug) | `participant-C10-waiting-error-state` | ⚠ ErrorBoundary with "Waiting Page Error" — documented as known issue |

### D. Result Page

| # | Scenario | Screenshot | Visual Assertions |
|---|----------|------------|-------------------|
| D11 | Result page | `participant-D11-result-page` | Synthesis content area OR redirect to /waiting (no synthesis) OR redirect to /thank-you (already gave feedback) |

### E. Thank You Page

| # | Scenario | Screenshot | Visual Assertions |
|---|----------|------------|-------------------|
| E12 | Thank you page | `participant-E12-thank-you-page` | ✓ CheckCircle icon, "Thank you for your submission", "Your reflections have been recorded" |

### F. Multi-User Scenario

| # | Scenario | Screenshot(s) | Visual Assertions |
|---|----------|---------------|-------------------|
| F13 | Full API-driven flow | `participant-F13-dashboard-with-form`, `F13-form-page` | Admin creates form → new user registers → joins via code → dashboard shows form → form page shows questions |

---

## Known Bugs Documented

### 1. WaitingPage URL Construction Error (CRITICAL)

**Location:** `frontend/src/WaitingPage.tsx` line ~28, `ResultPage.tsx` line ~60

**Root cause:** Both pages construct a WebSocket URL with:
```javascript
const wsUrl = `${protocol}://${new URL(API_BASE_URL).host}/ws`;
```

When `API_BASE_URL` is empty string (default from `config.ts` when `VITE_API_BASE_URL` env var is not set), `new URL('')` throws `TypeError: Invalid URL: ''`.

**Effect:** ErrorBoundary catches the error and renders "Waiting Page Error" / "Result Page Error" with the ⚠ icon and "Try Again" button.

**Impact:** Blocks the entire post-submission flow in dev environments where `VITE_API_BASE_URL` is not explicitly set.

**Fix suggestion:** Guard the URL construction:
```javascript
const host = API_BASE_URL
  ? new URL(API_BASE_URL).host
  : window.location.host;
```

**Test handling:** Tests C9/C10 and D11 detect this bug, annotate it as `known-bug`, and capture screenshots of the error state without failing the test suite.

### 2. ResultPage Redirect Cascade

**Observation:** `/result` performs a chain of redirects:
- If no token → `/` (dashboard)
- If feedback already submitted → `/thank-you`
- If no synthesis available → `/waiting` (which may also crash per bug #1)

**Impact:** Testing `/result` in isolation is nearly impossible without synthesis data. The test documents whatever state it lands on.

---

## Design Decisions

### Auth Strategy
- Used `loginAsUser()` helper that hits `POST /login` via Playwright's request API (bypasses CORS), then injects token into `localStorage`
- This matches the existing `loginViaAPI()` pattern from helpers.ts but supports non-admin users
- Fresh users created per-test where isolation matters (B7, B8) via unique emails with `Date.now()` suffix

### Test Isolation
- Tests A1, B7, B8, F13 use **unique users** to avoid state contamination
- Tests that only read state (A2, A3, A4, B5, B6) share the `PARTICIPANT_EMAIL` account
- Form creation uses `Date.now()`-suffixed join codes to prevent collisions across runs

### API-First Setup
- `createFormAsAdmin()` and `unlockFormViaAPI()` helpers set up test data via API, not UI
- This is faster and more reliable than clicking through admin forms
- Tests focus on verifying the participant UI, not re-testing admin CRUD

### Screenshot Naming
- Pattern: `participant-{group}{number}-{descriptive-name}`
- Examples: `participant-A1-dashboard-empty`, `participant-B7-after-submit`
- Matches the existing `01-login`, `02-register` convention but namespaced for participant tests

---

## Prometheus Scenarios

Four scenario classes following the existing `test_scenarios.py` pattern:

| Class | Scenarios | Notes |
|-------|-----------|-------|
| `ParticipantDashboardEmptyScenario` | Empty dashboard smoke test | Asserts "No consultations yet" text |
| `ParticipantJoinFormScenario` | Join code invalid + valid | Requires pre-created form with known join_code |
| `ParticipantFormSubmissionScenario` | Load → fill → submit | Requires form already unlocked by participant |
| `ParticipantWaitingPageScenario` | Waiting page + error state | Documents known ErrorBoundary bug |

Plus two dynamic step generators:
- `get_participant_form_steps(form_id)` — for testing any specific form
- `get_participant_already_submitted_steps(form_id)` — for testing re-visit after submission

---

## Gaps & Future Work

1. **WebSocket synthesis push test** — C9 doesn't test the actual WebSocket-driven navigation from `/waiting` → `/result`. Would require admin to push synthesis mid-test.
2. **Feedback form on /result** — The ResultPage has accuracy/influence/usability/furtherThoughts fields, but testing them requires synthesis data to exist. Needs an admin synthesis push scenario.
3. **Multi-round flow** — Participant submits round 1 → admin synthesizes → participant gets round 2. Not covered; needs coordinated admin+participant actions.
4. **Concurrent participants** — Testing multiple participants on the same form simultaneously. Requires Playwright browser contexts.
5. **Real-time presence indicators** — FormPage has a `usePresence` hook showing other viewers. Not tested.
6. **Draft auto-save** — FormPage has debounced draft saving (`saveDraft`). Not verified in these tests.
7. **Mobile viewport** — All tests use desktop viewport. The UserDashboard has responsive breakpoints (`sm:hidden`, `sm:flex`).
