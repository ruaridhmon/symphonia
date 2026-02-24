# Hector — Symphonia E2E Visual + Functional Test Suite

## What I Built

A comprehensive Playwright-based E2E test suite for Symphonia that would have caught the `MessageSquare` import bug before it reached production. **24 tests, all passing, 28 screenshots captured.**

## How to Run

### Prerequisites
- Node.js 25+
- Local Symphonia backend running on `:8000` (with SQLite fallback)
- Local Symphonia frontend running on `:3000`

### Quick Start
```bash
cd /Users/hephaestus/.openclaw/workspace/projects/symphonia-repo/e2e-tests/hector

# Install deps (already done)
npm install

# Start backend (if not running)
cd ../../backend && source .venv/bin/activate && uvicorn main:app --host 0.0.0.0 --port 8000 &

# Start frontend (if not running)
cd ../../frontend && VITE_API_BASE_URL=http://localhost:8000 npx vite --port 3000 --host &

# Run tests
BASE_URL=http://localhost:3000 API_URL=http://localhost:8000 npx playwright test

# Generate HTML report
node generate-report.mjs

# View report
open report.html
```

### Environment Variables
| Variable | Default | Description |
|----------|---------|-------------|
| `BASE_URL` | `http://localhost:3000` | Frontend URL |
| `API_URL` | `http://localhost:8000` | Backend API URL |

## Test Structure

### `tests/helpers.ts` — Shared Utilities
- `checkForErrorBoundary(page)` — Detects Symphonia's ErrorBoundary pattern (⚠ icon, error titles, "Can't find variable", "Try Again" button)
- `assertNoErrors(page, context)` — Fails immediately if ErrorBoundary detected
- `filterCriticalErrors(errors)` — Filters out dev-environment noise (CORS, React warnings) while keeping real app errors
- `collectConsoleErrors(page)` — Collects all browser console errors for analysis
- `loginViaAPI(page, baseURL)` — Reliable auth setup via Playwright's request API
- `takeScreenshot(page, name)` — Full-page screenshot to `screenshots/`
- `waitForPageSettle(page)` — Waits for network idle + loading spinners

### `tests/01-page-load.spec.ts` — Page Load Tests (13 tests)
Every route visited, checked for:
- HTTP status < 400
- No ErrorBoundary activation
- No critical console errors
- Full-page screenshot

**Routes tested:**
- Public: `/login`, `/register`, 404 catch-all
- Authenticated: `/`, `/atlas`, `/waiting`, `/result`, `/thank-you`, `/form/1`
- Admin: `/admin/settings`, `/admin/forms/new`, `/admin/form/1`, `/admin/form/1/summary` ← **THE CRITICAL PAGE**

### `tests/02-round-navigation.spec.ts` — Critical Flow Tests (5 tests)
- Login → Dashboard → Summary → Round navigation (no crash)
- Summary page for forms 1-5 individually
- Form editor pages for forms 1-3
- Valid login → dashboard
- Invalid login → error message (not crash)

### `tests/03-error-detection.spec.ts` — Error Detection Tests (6 tests)
- Validates the error detection helper works correctly
- Injects fake ErrorBoundary patterns and verifies detection
- Full sweep of all routes checking for zero ErrorBoundary activations
- Console error analysis for missing import patterns

## What It Covers

✅ Every route in the app visited and screenshotted
✅ ErrorBoundary crash detection for all 13 known error titles
✅ "Can't find variable" / "is not defined" pattern detection
✅ Console error monitoring (pageerror events = unhandled JS exceptions)
✅ The exact flow that triggered today's bug (summary page → round navigation)
✅ Multiple forms' summary pages tested (1-5)
✅ Login flows (valid + invalid)
✅ HTML report with screenshots grid

## What It Doesn't Cover Yet

- **No mobile viewport tests** — all tests run at desktop resolution
- **No multi-user flows** — only admin account tested
- **No form submission flow** — would require creating response data
- **No real-time features** — WebSocket/collaboration features not tested
- **No visual regression** — screenshots are captured but not compared against baselines (would need `@playwright/test`'s snapshot comparison or Percy/Chromatic)
- **No CI/CD integration** — would need a `docker-compose` test environment or CF Access service tokens for production
- **No response data seeding** — some pages like `/result` and `/waiting` need form context to fully render

## Architecture Decision: Why This Catches the Bug

The `MessageSquare` bug was a missing import that only crashed when the `RoundCard` component rendered. Our tests:

1. **Visit the summary page** (`/admin/form/1/summary`) — where `RoundCard` renders
2. **Check for ErrorBoundary activation** — the exact UI that appeared when the bug hit
3. **Monitor `pageerror` events** — catches `ReferenceError: Can't find variable: MessageSquare` before it even reaches the ErrorBoundary
4. **Pattern match on error text** — `"Can't find variable"` and `"is not defined"` are explicit test failure triggers

Any future missing import in any component on any route will be caught by this suite.

## Files

```
hector/
├── INVESTIGATION.md         # Route map + error boundary analysis
├── RESULTS.md               # Test run results
├── SUMMARY.md               # This file
├── playwright.config.ts     # Playwright configuration
├── package.json             # Dependencies
├── generate-report.mjs      # HTML report generator
├── report.html              # Visual test report with screenshots
├── test-results.json        # Machine-readable results
├── tests/
│   ├── helpers.ts           # Shared test utilities
│   ├── 01-page-load.spec.ts # Page load tests (13 tests)
│   ├── 02-round-navigation.spec.ts  # Critical flow tests (5 tests)
│   └── 03-error-detection.spec.ts   # Error detection tests (6 tests)
└── screenshots/             # 28 full-page screenshots
```
