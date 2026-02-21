# Symphonia Overnight Build — 2026-02-21

## Priority Queue (in order)

### P0 — Critical Fixes
- [x] `[object Object]` in questions — FIXED
- [x] Generate synthesis for past rounds — FIXED  
- [x] Consensus library import error — FIXED
- [ ] View/Edit mode toggle for synthesis (markdown rendering)
- [ ] All 3 synthesis modes produce structured JSON cards

### P1 — Core UX (from brainstorms)
- [ ] Structured input templates (position/evidence/confidence/counterarguments)
- [ ] Auto-save drafts to localStorage
- [ ] Remove ALL console.log statements
- [ ] Fix WebSocket memory leak in WaitingPage
- [ ] Emoji → Lucide icons migration

### P2 — Polish
- [ ] API client layer abstraction
- [ ] Synthesis versioning UI (show versions, compare, activate)
- [ ] Duplicate footer cleanup
- [ ] Button consistency across all pages
- [ ] Error handling with retry buttons

### P3 — Architecture
- [ ] Decompose SummaryPage (560 lines → smaller components)
- [ ] TanStack Query for state management
- [ ] Mobile responsiveness

## Completed This Session
- Button sizing fix (width: fit-content)
- Forms display fix (error handling)
- Markdown rendering preprocessing
- Question text extraction from objects
- Past round synthesis endpoint wired up
- Consensus library Python version fix

## Build Command
```bash
cd ~/.openclaw/workspace/symphonia-ruaridh/frontend && npm run build
pkill -f "uvicorn.*8766"
cd ~/.openclaw/workspace/symphonia-ruaridh/backend && source .venv/bin/activate && nohup .venv/bin/python3.12 -m uvicorn main:app --host 0.0.0.0 --port 8766 > /tmp/symphonia.log 2>&1 &
```

## Pulse State
```json
{
  "last_run": null,
  "current_task": "P0 - View/Edit mode toggle",
  "workers_completed": 0,
  "workers_spawned": 5
}
```
