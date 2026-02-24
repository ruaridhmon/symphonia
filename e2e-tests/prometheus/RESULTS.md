# Prometheus QA Results

**Run timestamp:** 2026-02-24 00:04:49 UTC
**Duration:** 125.7s

## Summary

| Metric | Count |
|--------|-------|
| Total scenarios | 37 |
| ✅ Passed | 28 |
| ❌ Failed | 1 |
| ⚠️ Warnings | 8 |
| ⏭️ Skipped | 0 |

## Scenario Results

### ✅ login-page-smoke [CRITICAL]
*Verify login page loads correctly with email/password fields*
- **Verdict:** PASS
- **Steps:** 3/3
- **Duration:** 4977ms
- **Vision Analysis:**
  - [PASS] Heuristic analysis: No errors detected (confidence: 50%, method: dom_heuristic)
- **Screenshots:**
  - `01-login-page.png`

### ✅ register-page-smoke [HIGH]
*Verify registration page loads correctly*
- **Verdict:** PASS
- **Steps:** 3/3
- **Duration:** 3102ms
- **Vision Analysis:**
  - [PASS] Heuristic analysis: No errors detected (confidence: 50%, method: dom_heuristic)
- **Screenshots:**
  - `02-register-page.png`

### ⚠️ auth-flow [CRITICAL]
*Full authentication flow: login with admin credentials, verify redirect to dashboard*
- **Verdict:** WARNING
- **Steps:** 5/5
- **Duration:** 8579ms
- **Vision Analysis:**
  - [PASS] Heuristic analysis: No errors detected (confidence: 50%, method: dom_heuristic)
  - [WARNING] Heuristic analysis: No errors detected (confidence: 50%, method: dom_heuristic)
    - Anomaly: Very little visible text — possibly blank/broken page
- **Screenshots:**
  - `03-auth-before-login.png`
  - `04-auth-after-login.png`

### ✅ dashboard-smoke [CRITICAL]
*Verify dashboard loads and shows form list*
- **Verdict:** PASS
- **Steps:** 4/4
- **Duration:** 2817ms
- **Vision Analysis:**
  - [PASS] Heuristic analysis: No errors detected (confidence: 50%, method: dom_heuristic)
- **Screenshots:**
  - `05-dashboard.png`

### ✅ dynamic-form-editor-1 [MEDIUM]
*Editor page for form 1*
- **Verdict:** PASS
- **Steps:** 3/3
- **Duration:** 2660ms
- **Vision Analysis:**
  - [PASS] Heuristic analysis: No errors detected (confidence: 50%, method: dom_heuristic)
- **Screenshots:**
  - `editor-form-1.png`

### ✅ dynamic-summary-1 [CRITICAL]
*Summary page for form 1 — tests round navigation and icon rendering*
- **Verdict:** PASS
- **Steps:** 3/3
- **Duration:** 2780ms
- **Vision Analysis:**
  - [PASS] Heuristic analysis: No errors detected (confidence: 50%, method: dom_heuristic)
- **Screenshots:**
  - `summary-form-1-initial.png`

### ✅ round-navigation-form-1-round-1 [CRITICAL]
*Round 1 navigation on form 1 summary*
- **Verdict:** PASS
- **Steps:** 3/3
- **Duration:** 0ms
- **Vision Analysis:**
  - [PASS] Heuristic analysis: No errors detected (confidence: 50%, method: dom_heuristic)
- **Screenshots:**
  - `round-nav-form-1-round-1.png`

### ✅ round-navigation-form-1-round-2 [CRITICAL]
*Round 2 navigation on form 1 summary*
- **Verdict:** PASS
- **Steps:** 3/3
- **Duration:** 0ms
- **Vision Analysis:**
  - [PASS] Heuristic analysis: No errors detected (confidence: 50%, method: dom_heuristic)
- **Screenshots:**
  - `round-nav-form-1-round-2.png`

### ✅ dynamic-form-editor-10 [MEDIUM]
*Editor page for form 10*
- **Verdict:** PASS
- **Steps:** 3/3
- **Duration:** 2601ms
- **Vision Analysis:**
  - [PASS] Heuristic analysis: No errors detected (confidence: 50%, method: dom_heuristic)
- **Screenshots:**
  - `editor-form-10.png`

### ✅ dynamic-summary-10 [CRITICAL]
*Summary page for form 10 — tests round navigation and icon rendering*
- **Verdict:** PASS
- **Steps:** 3/3
- **Duration:** 2978ms
- **Vision Analysis:**
  - [PASS] Heuristic analysis: No errors detected (confidence: 50%, method: dom_heuristic)
- **Screenshots:**
  - `summary-form-10-initial.png`

### ✅ round-navigation-form-10-round-1 [CRITICAL]
*Round 1 navigation on form 10 summary*
- **Verdict:** PASS
- **Steps:** 3/3
- **Duration:** 0ms
- **Vision Analysis:**
  - [PASS] Heuristic analysis: No errors detected (confidence: 50%, method: dom_heuristic)
- **Screenshots:**
  - `round-nav-form-10-round-1.png`

### ✅ round-navigation-form-10-round-2 [CRITICAL]
*Round 2 navigation on form 10 summary*
- **Verdict:** PASS
- **Steps:** 3/3
- **Duration:** 0ms
- **Vision Analysis:**
  - [PASS] Heuristic analysis: No errors detected (confidence: 50%, method: dom_heuristic)
- **Screenshots:**
  - `round-nav-form-10-round-2.png`

### ✅ dynamic-form-editor-11 [MEDIUM]
*Editor page for form 11*
- **Verdict:** PASS
- **Steps:** 3/3
- **Duration:** 2580ms
- **Vision Analysis:**
  - [PASS] Heuristic analysis: No errors detected (confidence: 50%, method: dom_heuristic)
- **Screenshots:**
  - `editor-form-11.png`

### ✅ dynamic-summary-11 [CRITICAL]
*Summary page for form 11 — tests round navigation and icon rendering*
- **Verdict:** PASS
- **Steps:** 3/3
- **Duration:** 2793ms
- **Vision Analysis:**
  - [PASS] Heuristic analysis: No errors detected (confidence: 50%, method: dom_heuristic)
- **Screenshots:**
  - `summary-form-11-initial.png`

### ✅ round-navigation-form-11-round-1 [CRITICAL]
*Round 1 navigation on form 11 summary*
- **Verdict:** PASS
- **Steps:** 3/3
- **Duration:** 0ms
- **Vision Analysis:**
  - [PASS] Heuristic analysis: No errors detected (confidence: 50%, method: dom_heuristic)
- **Screenshots:**
  - `round-nav-form-11-round-1.png`

### ✅ round-navigation-form-11-round-2 [CRITICAL]
*Round 2 navigation on form 11 summary*
- **Verdict:** PASS
- **Steps:** 3/3
- **Duration:** 0ms
- **Vision Analysis:**
  - [PASS] Heuristic analysis: No errors detected (confidence: 50%, method: dom_heuristic)
- **Screenshots:**
  - `round-nav-form-11-round-2.png`

### ✅ dynamic-form-editor-12 [MEDIUM]
*Editor page for form 12*
- **Verdict:** PASS
- **Steps:** 3/3
- **Duration:** 2609ms
- **Vision Analysis:**
  - [PASS] Heuristic analysis: No errors detected (confidence: 50%, method: dom_heuristic)
- **Screenshots:**
  - `editor-form-12.png`

### ✅ dynamic-summary-12 [CRITICAL]
*Summary page for form 12 — tests round navigation and icon rendering*
- **Verdict:** PASS
- **Steps:** 3/3
- **Duration:** 2649ms
- **Vision Analysis:**
  - [PASS] Heuristic analysis: No errors detected (confidence: 50%, method: dom_heuristic)
- **Screenshots:**
  - `summary-form-12-initial.png`

### ✅ round-navigation-form-12-round-1 [CRITICAL]
*Round 1 navigation on form 12 summary*
- **Verdict:** PASS
- **Steps:** 3/3
- **Duration:** 0ms
- **Vision Analysis:**
  - [PASS] Heuristic analysis: No errors detected (confidence: 50%, method: dom_heuristic)
- **Screenshots:**
  - `round-nav-form-12-round-1.png`

### ✅ round-navigation-form-12-round-2 [CRITICAL]
*Round 2 navigation on form 12 summary*
- **Verdict:** PASS
- **Steps:** 3/3
- **Duration:** 0ms
- **Vision Analysis:**
  - [PASS] Heuristic analysis: No errors detected (confidence: 50%, method: dom_heuristic)
- **Screenshots:**
  - `round-nav-form-12-round-2.png`

### ✅ dynamic-form-editor-13 [MEDIUM]
*Editor page for form 13*
- **Verdict:** PASS
- **Steps:** 3/3
- **Duration:** 2626ms
- **Vision Analysis:**
  - [PASS] Heuristic analysis: No errors detected (confidence: 50%, method: dom_heuristic)
- **Screenshots:**
  - `editor-form-13.png`

### ✅ dynamic-summary-13 [CRITICAL]
*Summary page for form 13 — tests round navigation and icon rendering*
- **Verdict:** PASS
- **Steps:** 3/3
- **Duration:** 2763ms
- **Vision Analysis:**
  - [PASS] Heuristic analysis: No errors detected (confidence: 50%, method: dom_heuristic)
- **Screenshots:**
  - `summary-form-13-initial.png`

### ✅ round-navigation-form-13-round-1 [CRITICAL]
*Round 1 navigation on form 13 summary*
- **Verdict:** PASS
- **Steps:** 3/3
- **Duration:** 0ms
- **Vision Analysis:**
  - [PASS] Heuristic analysis: No errors detected (confidence: 50%, method: dom_heuristic)
- **Screenshots:**
  - `round-nav-form-13-round-1.png`

### ✅ round-navigation-form-13-round-2 [CRITICAL]
*Round 2 navigation on form 13 summary*
- **Verdict:** PASS
- **Steps:** 3/3
- **Duration:** 0ms
- **Vision Analysis:**
  - [PASS] Heuristic analysis: No errors detected (confidence: 50%, method: dom_heuristic)
- **Screenshots:**
  - `round-nav-form-13-round-2.png`

### ✅ round-navigation-form-13-round-3 [CRITICAL]
*Round 3 navigation on form 13 summary*
- **Verdict:** PASS
- **Steps:** 3/3
- **Duration:** 0ms
- **Vision Analysis:**
  - [PASS] Heuristic analysis: No errors detected (confidence: 50%, method: dom_heuristic)
- **Screenshots:**
  - `round-nav-form-13-round-3.png`

### ✅ round-navigation-form-13-round-4 [CRITICAL]
*Round 4 navigation on form 13 summary*
- **Verdict:** PASS
- **Steps:** 3/3
- **Duration:** 0ms
- **Vision Analysis:**
  - [PASS] Heuristic analysis: No errors detected (confidence: 50%, method: dom_heuristic)
- **Screenshots:**
  - `round-nav-form-13-round-4.png`

### ✅ round-navigation-form-13-round-5 [CRITICAL]
*Round 5 navigation on form 13 summary*
- **Verdict:** PASS
- **Steps:** 3/3
- **Duration:** 0ms
- **Vision Analysis:**
  - [PASS] Heuristic analysis: No errors detected (confidence: 50%, method: dom_heuristic)
- **Screenshots:**
  - `round-nav-form-13-round-5.png`

### ✅ round-navigation-form-13-round-6 [CRITICAL]
*Round 6 navigation on form 13 summary*
- **Verdict:** PASS
- **Steps:** 3/3
- **Duration:** 0ms
- **Vision Analysis:**
  - [PASS] Heuristic analysis: No errors detected (confidence: 50%, method: dom_heuristic)
- **Screenshots:**
  - `round-nav-form-13-round-6.png`

### ✅ atlas-smoke [MEDIUM]
*Verify Atlas (UX atlas) page loads*
- **Verdict:** PASS
- **Steps:** 3/3
- **Duration:** 2727ms
- **Vision Analysis:**
  - [PASS] Heuristic analysis: No errors detected (confidence: 50%, method: dom_heuristic)
- **Screenshots:**
  - `06-atlas.png`

### ❌ waiting-page-smoke [MEDIUM]
*Verify waiting room page loads*
- **Verdict:** FAIL
- **Steps:** 3/3
- **Duration:** 2584ms
- **DOM Errors:**
  - `ErrorBoundary detected: 'Waiting Page Error'`
  - `ErrorBoundary detected: 'Page Error'`
  - `Warning icon (⚠) found — possible ErrorBoundary render`
  - `'Try Again' button found — ErrorBoundary is rendered`
  - `ErrorBoundary detected: 'Waiting Page Error'`
  - `ErrorBoundary detected: 'Page Error'`
  - `Warning icon (⚠) found — possible ErrorBoundary render`
  - `'Try Again' button found — ErrorBoundary is rendered`
- **Vision Analysis:**
  - [FAIL] Heuristic analysis: ERRORS FOUND (confidence: 70%, method: dom_heuristic)
    - Error: ErrorBoundary detected: 'Waiting Page Error'; ErrorBoundary detected: 'Page Error'; Warning icon (⚠) found — possible ErrorBoundary render; 'Try Again' button found — ErrorBoundary is rendered; Page text contains: 'Try Again'
- **Screenshots:**
  - `07-waiting.png`

### ⚠️ result-page-smoke [MEDIUM]
*Verify result page loads*
- **Verdict:** WARNING
- **Steps:** 3/3
- **Duration:** 2725ms
- **Vision Analysis:**
  - [WARNING] Heuristic analysis: No errors detected (confidence: 50%, method: dom_heuristic)
    - Anomaly: Very little visible text — possibly blank/broken page
- **Screenshots:**
  - `08-result.png`

### ⚠️ thankyou-page-smoke [LOW]
*Verify thank-you page loads*
- **Verdict:** WARNING
- **Steps:** 3/3
- **Duration:** 2609ms
- **Vision Analysis:**
  - [WARNING] Heuristic analysis: No errors detected (confidence: 50%, method: dom_heuristic)
    - Anomaly: Very little visible text — possibly blank/broken page
- **Screenshots:**
  - `09-thankyou.png`

### ⚠️ admin-settings-smoke [MEDIUM]
*Verify admin settings page loads*
- **Verdict:** WARNING
- **Steps:** 3/3
- **Duration:** 2674ms
- **Vision Analysis:**
  - [WARNING] Heuristic analysis: No errors detected (confidence: 50%, method: dom_heuristic)
    - Anomaly: Very little visible text — possibly blank/broken page
- **Screenshots:**
  - `10-admin-settings.png`

### ⚠️ admin-new-form-smoke [MEDIUM]
*Verify admin new form page loads*
- **Verdict:** WARNING
- **Steps:** 3/3
- **Duration:** 2667ms
- **Vision Analysis:**
  - [WARNING] Heuristic analysis: No errors detected (confidence: 50%, method: dom_heuristic)
    - Anomaly: Very little visible text — possibly blank/broken page
- **Screenshots:**
  - `11-admin-new-form.png`

### ⚠️ not-found-page [LOW]
*Verify 404 page renders correctly (not a crash)*
- **Verdict:** WARNING
- **Steps:** 3/3
- **Duration:** 2708ms
- **Vision Analysis:**
  - [WARNING] Heuristic analysis: No errors detected (confidence: 50%, method: dom_heuristic)
    - Anomaly: Very little visible text — possibly blank/broken page
- **Screenshots:**
  - `12-not-found.png`

### ⚠️ summary-page-round-navigation [CRITICAL]
*CRITICAL: Tests the exact bug path — Summary Page with round navigation. RoundCard uses MessageSquare, BarChart3, HelpCircle icons. Missing imports cause crashes when viewing previous rounds.*
- **Verdict:** WARNING
- **Steps:** 4/4
- **Duration:** 2734ms
- **Vision Analysis:**
  - [WARNING] Heuristic analysis: No errors detected (confidence: 50%, method: dom_heuristic)
    - Anomaly: Very little visible text — possibly blank/broken page
- **Screenshots:**
  - `13-summary-page-entry.png`

### ⚠️ full-admin-journey [HIGH]
*Full admin workflow: dashboard → pick a form → editor → summary*
- **Verdict:** WARNING
- **Steps:** 3/3
- **Duration:** 2697ms
- **Vision Analysis:**
  - [WARNING] Heuristic analysis: No errors detected (confidence: 50%, method: dom_heuristic)
    - Anomaly: Very little visible text — possibly blank/broken page
- **Screenshots:**
  - `14-journey-dashboard.png`

## Assessment

🔴 **1 scenario(s) FAILED.** Immediate attention required.