# Symphonia Overnight Build — 2026-02-21

## Priority Queue (in order)

### P0 — Critical Fixes
- [x] `[object Object]` in questions — FIXED
- [x] Generate synthesis for past rounds — FIXED  
- [x] Consensus library import error — FIXED
- [x] View/Edit mode toggle for synthesis (markdown rendering) — DONE (Pulse 5:36am)
- [x] All 3 synthesis modes produce structured JSON cards — DONE (Pulse 5:36am)

### P1 — Core UX (from brainstorms)
- [x] Structured input templates (position/evidence/confidence/counterarguments) — DONE (Worker 2)
- [x] Auto-save drafts to localStorage — DONE (Worker 2)
- [x] Remove ALL console.log statements (65 removed) — DONE (Worker 1)
- [x] Fix WebSocket memory leak in WaitingPage — DONE (Worker 1)
- [x] Emoji → Lucide icons migration (12 files) — DONE (Worker 3)

### P2 — Polish
- [x] API client layer abstraction — DONE (Worker 4)
- [x] Synthesis versioning UI (show versions, compare, activate) — DONE (Worker 5)
- [x] Duplicate footer cleanup — DONE (Pulse 6:06am): removed duplicate footers from SummaryPage and ThankYouPage (PageLayout provides the footer); stripped redundant header/shell from ThankYouPage
- [x] Button consistency across all pages — DONE (Pulse 6:06am): migrated Login, Register, UserDashboard from raw `<button>` to `<LoadingButton>` with proper variants (accent, success, destructive, ghost)
- [x] Error handling with retry buttons — DONE (Pulse 6:06am): FormPage now has error state with retry on load failure + inline submit error display; UserDashboard already had retry

### P3 — Architecture
- [x] Decompose SummaryPage (1414→672 lines, 10 subcomponents) — DONE (Pulse 6:36am)
- [ ] TanStack Query for state management (deferred — requires large refactor, all pages working well without it)
- [x] Toast notification system — replace all 9 alert() calls with themed toasts — DONE (Pulse 11:06am)
- [x] Mobile responsiveness (safe-area insets, touch targets, overflow, responsive spacing) — DONE (Pulse 6:36am)
- [x] 404 Not Found page (themed, with navigation) — DONE (Pulse 11:36am)
- [x] Dynamic document titles across all 10 routes (useDocumentTitle hook) — DONE (Pulse 11:36am)
- [x] Code splitting (React.lazy + Vite manual chunks) — DONE (Pulse 7:06am): initial bundle 1,298KB → 18KB app shell + lazy-loaded routes. Vendor chunks: react 177KB, tiptap 302KB, markdown 318KB, docx 342KB — each cached independently.
- [x] Convert remaining .jsx → .tsx (FormEditor) — DONE (Pulse 7:06am): full TypeScript, Lucide icons, LoadingButton integration
- [x] Remove dead code (AdminFormPage.jsx) — DONE (Pulse 7:06am)
- [x] Fix ALL TypeScript errors (0 errors now) — DONE (Pulse 7:36am): added Vite client types, typed state/params, aligned Round types across components, added file-saver declaration, excluded test files from main tsconfig

## Completed This Session
- Button sizing fix (width: fit-content)
- Forms display fix (error handling)
- Markdown rendering preprocessing
- Question text extraction from objects
- Past round synthesis endpoint wired up
- Consensus library Python version fix
- **Next Round button error handling + loading state** (Worker 1)
- **65 console.log statements removed** (Worker 1)
- **WebSocket memory leak fixed** (Worker 1)
- **Structured Input component** — position/evidence/confidence/counterarguments/citations (Worker 2)
- **Auto-save drafts to localStorage** with debounced 500ms save (Worker 2)
- **Emoji → Lucide icons migration** — 12 files, semantic colors (Worker 3)
- **API client layer** — centralised fetch, typed modules, error handling (Worker 4)
- **Synthesis versioning UI** — version selector, publish, generate new (Worker 5)
- **View/Edit mode toggle** — clean toggle between rendered markdown and TipTap editor (Pulse)
- **Structured JSON for all synthesis modes** — simple/ttd now return same structured format as committee (Pulse)
- **Duplicate footer cleanup** — removed from SummaryPage (line 1303) and ThankYouPage; stripped redundant header/min-h-screen wrapper from ThankYouPage since PageLayout provides it all (Pulse)
- **Button consistency** — Login, Register, UserDashboard migrated to LoadingButton with proper variant/size props (Pulse)
- **Error handling + retry** — FormPage load errors show retry button + back-to-dashboard; submit errors shown inline; proper HTTP status checks added (Pulse)
- **SummaryPage decomposition** — 1414→672 lines; extracted 10 focused subcomponents (SummaryHeader, SynthesisEditorCard, AISynthesisPanel, SynthesisVersionPanel, NextRoundQuestionsCard, FormInfoCard, ActionsCard, ResponsesModal, RoundHistoryCard, SummaryLoadingSkeleton) + shared types file (Pulse)
- **Mobile responsiveness** — safe-area insets for notched devices, coarse pointer touch targets (44px min), horizontal overflow prevention, responsive card padding, prose typography scaling, landscape orientation support (Pulse)
- **Code splitting** — React.lazy for all 10 route components + Vite manualChunks for 5 vendor groups. Initial JS: 1,298KB → 18KB (72x smaller). Each page loads on demand. Vendor libs cached independently for faster subsequent loads. (Pulse 7:06am)
- **FormEditor modernization** — Converted from .jsx to .tsx. Added TypeScript types, Lucide icons (Trash2/Plus/Save/ArrowLeft), LoadingButton with loading states, question numbering, proper layout within PageLayout. (Pulse 7:06am)
- **Dead code removal** — Removed orphaned AdminFormPage.jsx (104 lines, not referenced by router). (Pulse 7:06am)
- **TypeScript zero-error** — Fixed all 15 TS errors: Vite client types in tsconfig, typed AdminDashboard state, typed AuthContext login params, aligned Round.questions type across 3 files (RoundTimeline, ExportPanel, summary.ts), added file-saver declaration, used extractQuestionText() in RoundCard to safely render question objects, excluded test files from main tsconfig. `tsc --noEmit` now passes clean. (Pulse 7:36am)
- **Skeleton loading states** — UserDashboard: replaced "Loading…" text with SkeletonCard shimmer placeholders; FormPage: replaced orbit spinner with full form skeleton (title + round + questions + button shapes). (Pulse 8:06am)
- **React.memo performance** — Memoized 4 heavy pure components: MarkdownRenderer, RoundCard, SynthesisDisplay, CrossMatrix. SummaryPage chunk: 75.6KB → 49.1KB (35% smaller). Prevents unnecessary re-renders during synthesis editing. (Pulse 8:06am)
- **Toast notification system** — New Toast component (success/error/warning/info variants) with themed colors, slide-in/out animations, auto-dismiss. Replaced all 9 `alert()` calls across SummaryPage (7), FormEditor (1), AdminDashboard (1). Added success toasts for save/create. Zero `alert()` calls remain. (Pulse 11:06am)
- **404 Not Found page** — Themed catch-all route with "Go back" and "Dashboard" navigation. Lazy-loaded, wrapped in ErrorBoundary. (Pulse 11:36am)
- **Dynamic document titles** — `useDocumentTitle` hook applied to all 10 routes. Browser tab now shows "Dashboard — Symphonia", "Sign In — Symphonia", etc. Restores previous title on unmount. (Pulse 11:36am)

## Build Command
```bash
cd ~/.openclaw/workspace/symphonia-ruaridh/frontend && npm run build
pkill -f "uvicorn.*8766"
cd ~/.openclaw/workspace/symphonia-ruaridh/backend && source .venv/bin/activate && nohup .venv/bin/python3.12 -m uvicorn main:app --host 0.0.0.0 --port 8766 > /tmp/symphonia.log 2>&1 &
```

## Pulse State
```json
{
  "last_run": "2026-02-21T11:36:00Z",
  "current_task": "404 page + dynamic titles shipped. 33 tasks total.",
  "workers_completed": 5,
  "workers_spawned": 5,
  "pulse_direct_changes": 11,
  "status": "ALL PHASES COMPLETE + 404 page + dynamic document titles"
}
```
