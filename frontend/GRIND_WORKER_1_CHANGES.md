# Grind Worker 1: Critical Bug Fixes — Change Log

**Date:** 2026-02-21
**Build status:** ✅ `npm run build` passes clean

---

## TASK 1: Fix "Next Round" Button (CRITICAL)

### Root Cause
The `startNextRound()` function in `SummaryPage.tsx` **never checked `res.ok`** after the POST to `/forms/{id}/next_round`. If the backend returned any error (403, 422, 500, etc.), the error was silently swallowed and the function proceeded to call `loadAll()`, which simply reloaded the current state — making it look like nothing happened. Zero user feedback on failure.

### Fixes Applied
1. **Added `res.ok` check** — if the backend returns a non-2xx status, the error response body is parsed and thrown as an Error with the server's detail message.
2. **Added `alert()` on failure** — the user now sees a clear error message when the round advance fails.
3. **Added proper `setLoading(true/false)` around the entire operation** — the "Start Next Round" button now shows a loading spinner during the POST + data reload, preventing double-clicks and giving visual feedback.
4. **Added `await loadResponses()` after `loadAll()`** — ensures the responses panel is also refreshed after advancing.
5. **Added `setSelectedRound(null)` on success** — clears stale round selection so the UI correctly shows the new active round.
6. **Applied same `res.ok` pattern to `saveSynthesis()`** — which had the same silent-failure bug.

### Files Changed
- `frontend/src/SummaryPage.tsx`

---

## TASK 2: Remove ALL console.log Statements

### Summary
Removed **65 `console.log` statements** across 3 files. Every single debug logging statement has been removed. Only `console.error` calls remain, and only in genuine error-handling catch blocks.

### Files Changed
- `frontend/src/SummaryPage.tsx` — removed ~52 console.log statements
- `frontend/src/AdminDashboard.tsx` — removed ~8 console.log statements
- `frontend/src/WaitingPage.tsx` — removed 2 console.log statements

### Remaining console.error calls (all legitimate)
- Error catches in fetch/API calls (SummaryPage, AdminDashboard, WaitingPage)
- WebSocket error/parse handlers (WaitingPage)
- ErrorBoundary component

---

## TASK 3: Fix WebSocket Memory Leak in WaitingPage

### Root Cause
The WebSocket was created inside an `async` function called from `useEffect`. The cleanup function (`return () => { ws.close(); }`) was returned from the async function, but since async functions return Promises, the cleanup was never received by React's useEffect. The WebSocket was never closed on unmount → memory leak + stale connections.

### Fix Applied
Restructured the `useEffect` to separate concerns:
1. **Fetch `/me`** — fire-and-forget with `.then()/.catch()` chain (no WebSocket dependency).
2. **WebSocket setup** — moved to the synchronous body of the `useEffect`, so the cleanup function (`return () => { ws.close(); }`) is properly returned to React.
3. **Added `useRef<WebSocket>`** — stores the WebSocket reference for potential access outside the effect.

### Files Changed
- `frontend/src/WaitingPage.tsx`

---

## Verification
```
$ cd frontend && npm run build
✓ 2183 modules transformed.
✓ built in 2.85s
```
No TypeScript errors. No build errors. Clean output.
