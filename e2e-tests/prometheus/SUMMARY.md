# Prometheus — Vision-Powered QA System for Symphonia

## What This Is

An agentic testing system that combines **Playwright browser automation**, **Claude Vision analysis**, **DOM heuristics**, and **static analysis** to catch bugs that would escape traditional unit tests. Built in response to the production `MessageSquare` crash on the Summary Page.

## Architecture

```
prometheus/
├── test_runner.py          — Orchestrator: runs scenarios, coordinates modules
├── browser_agent.py        — Playwright: navigate, authenticate, screenshot, DOM inspection
├── vision_analyst.py       — Claude Vision: screenshot analysis (with DOM heuristic fallback)
├── test_scenarios.py       — Scenario definitions: what flows to test
├── report.py               — HTML + Markdown report generation
├── static_analysis.py      — Import/dependency checker (catches missing icon bugs)
├── screenshots/            — All captured screenshots
├── vision_reports/         — Individual vision analysis JSON reports
├── report.html             — Full HTML report with embedded screenshots
├── RESULTS.md              — Markdown summary of findings
├── INVESTIGATION.md        — Route/component investigation notes
└── static_analysis_results.md — Static analysis findings
```

### Key Design Decisions

1. **API token injection for auth** — The site has Cloudflare Access in front and FastAPI routes that conflict with SPA paths (`/login`, `/register`). Solution: call the login API directly, inject the JWT token into `localStorage` and cookies, then navigate the SPA normally.

2. **Client-side navigation for conflicting routes** — For paths like `/login` and `/register` where the FastAPI backend intercepts GET requests, we use `history.pushState` + `popstate` event to trigger React Router navigation without a server round-trip.

3. **Dual analysis: Vision + DOM heuristics** — Claude Vision provides human-like visual QA when an API key is available. DOM heuristics provide reliable fallback: checking for ErrorBoundary text, error patterns, warning icons, "Try Again" buttons.

4. **Static analysis layer** — Catches the exact class of bug that caused the crash (missing icon imports) at analysis time, without needing a browser. Scans for PascalCase identifiers used in JSX that are not imported.

5. **Dynamic form discovery** — After loading the dashboard, discovers all form IDs via API and tests each form's editor and summary page, including round-by-round navigation.

## How To Run

```bash
cd /path/to/e2e-tests/prometheus

# Full run (all scenarios + vision analysis if API key available)
python3 test_runner.py

# Skip vision (faster, DOM heuristics only)
python3 test_runner.py --no-vision

# Run specific scenario
python3 test_runner.py --scenario summary

# Headed browser (for debugging)
python3 test_runner.py --headed

# Static analysis only (no browser needed)
python3 static_analysis.py
```

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `SYMPHONIA_URL` | `http://localhost:8766` | Frontend/SPA URL |
| `SYMPHONIA_API_URL` | `http://localhost:8766` | Backend API URL |
| `SYMPHONIA_ADMIN_EMAIL` | `antreas@axiotic.ai` | Admin login email |
| `SYMPHONIA_ADMIN_PASSWORD` | `test123` | Admin login password |
| `ANTHROPIC_API_KEY` | (none) | For Claude Vision analysis |

### Prerequisites

- Python 3.9+
- `pip install playwright anthropic`
- `playwright install chromium`

## What Was Found

### Run Results (2026-02-24 00:04 UTC)

| Metric | Count |
|--------|-------|
| Total scenarios tested | 37 |
| ✅ Passed | 28 |
| ❌ Failed | 1 |
| ⚠️ Warnings | 8 |

### Bug #1: Waiting Page URL Construction Error (FOUND BY RUNTIME TEST)
- **Severity:** MEDIUM
- **Page:** `/waiting`
- **Error:** `"Failed to construct 'URL': Invalid URL"`
- **ErrorBoundary rendered:** Yes — "Waiting Page Error"
- **Root cause:** The WaitingPage component tries to construct a `URL` object with an invalid or missing value (likely a WebSocket URL or API endpoint not configured for the dev environment).

### Bug #2: RoundCard Missing Icon Imports (FOUND BY STATIC ANALYSIS)
- **Severity:** CRITICAL (same class as the MessageSquare crash)
- **File:** `frontend/src/components/RoundCard.tsx`
- **Details:** `BarChart3` (line 44) and `HelpCircle` (line 49) are used in JSX but not imported. The import line only includes: `{ Users, TrendingUp, ClipboardList, FileText, MessageSquare }`.
- **Impact:** Crash when viewing a non-active round that has a non-null `convergence_score` or `questions` array. This is the EXACT SAME class of bug as the original MessageSquare crash.
- **Fix:** Add `BarChart3, HelpCircle` to the lucide-react import line.

### Bug #3: Unused Imports in RoundCard.tsx (FOUND BY INVESTIGATION)
- **Severity:** LOW
- **File:** `frontend/src/components/RoundCard.tsx`
- **Details:** `Users`, `TrendingUp`, `ClipboardList` are imported but never used in the component body. Indicates the file has gone through edits without cleanup.

### Additional Observations
- **14 forms discovered** and tested across editors and summary pages
- **Round navigation tested** across 5 forms, including a form with 3 rounds (form 13)
- **No ErrorBoundary crashes** detected on any summary page during round navigation (the forms tested may not have the specific data conditions that trigger the BarChart3/HelpCircle code paths)
- **Auth flow works** via API token injection, bypassing Cloudflare Access

## What To Add Next

1. **Claude Vision API integration** — Set `ANTHROPIC_API_KEY` in the environment. The system is already built for it — `vision_analyst.py` will use the Anthropic SDK when a key is available, falling back to DOM heuristics otherwise.

2. **CI/CD integration** — Run `python3 test_runner.py --no-vision` in GitHub Actions for fast DOM-based testing. Run with vision on a schedule for deeper visual QA.

3. **Static analysis in pre-commit** — Add `python3 static_analysis.py` to pre-commit hooks. Zero dependencies, catches missing imports instantly. Needs refinement to reduce false positives on TypeScript types.

4. **Targeted round-data testing** — Create test scenarios that specifically exercise rounds with convergence scores and questions to trigger the BarChart3/HelpCircle code paths.

5. **Visual regression baselines** — Save "golden" screenshots and diff against them on each run.

6. **WebSocket/real-time testing** — Test the presence system, synthesis_complete events, and real-time updates.

7. **Performance budget** — Add load time assertions (currently captured but not enforced).

## The Core Insight

The original bug was a **missing import** — trivial to fix, impossible to catch without either:
- Running the specific code path in a browser (E2E test), OR
- Statically analyzing the import graph (static analysis)

Unit tests won't catch this. TypeScript compilation alone won't catch it if tree-shaking is involved. You need either a tool that runs the actual app (Prometheus's browser automation) or one that checks references against imports (Prometheus's static analysis). This system provides both.
