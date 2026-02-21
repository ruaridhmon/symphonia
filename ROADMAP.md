# Symphonia Roadmap

> Autonomous development pulse runs every 3 hours
> Last updated: 2026-02-21

## Phase 1: UX Foundation ✅ COMPLETE
**Goal:** Make it feel collaborative, not like a prison

- [x] 1.1 Progress indicator during synthesis (spinner + stages) — SynthesisProgress component + WebSocket integration in SummaryPage
- [x] 1.2 Button feedback states (hover, active, loading, disabled) — LoadingButton component with micro-interactions, used throughout SummaryPage
- [x] 1.3 Markdown rendering for synthesis output — MarkdownRenderer with GFM + raw HTML support, used in RoundCard & SynthesisDisplay
- [x] 1.4 Round navigation timeline/stepper — RoundTimeline v2 with horizontal stepper + card list + convergence scores
- [x] 1.5 Larger, more readable round cards — RoundCard detail view with convergence bar, questions, structured/markdown synthesis

## Phase 2: Structured Synthesis Display ✅ COMPLETE
**Goal:** Surface the rich data from consensus library

- [x] 2.1 Synthesis mode selector (Simple / Committee / TTD) — SynthesisModeSelector component wired into SummaryPage sidebar
- [x] 2.2 Agreements section with count badge + confidence — StructuredSynthesis: expandable agreements with confidence bars
- [x] 2.3 Disagreements section with severity indicators — StructuredSynthesis: severity badges (low/moderate/high) + position breakdowns
- [x] 2.4 Nuances section (collapsible) — StructuredSynthesis: collapsible nuances section with context
- [x] 2.5 Follow-up Probes section (things to work on) — StructuredSynthesis: probe cards with rationale + target experts
- [x] 2.6 Expert attribution (who said what) — Expert chips (E1, E2...) on agreements, disagreements, and probes

## Phase 3: Dimensional Search Integration
**Goal:** Implement DSM/Hecate patterns in the UI

- [x] 3.1 Dimensional expert labels (Past/Present/Future or custom) — Expert Labels sidebar panel with presets (temporal/methodological/stakeholder/custom), dimension-coded chips, backend persistence
- [x] 3.2 Cross-matrix visualization (which dimensions agree/conflict) — CrossMatrix component with NxN heatmap, pairwise agreement/disagreement scoring, hover tooltips, dimension-colored headers
- [x] 3.3 Emergence highlighting (insights not in any single response) — EmergenceHighlights component with shimmer-border cards, type badges, expert attribution
- [ ] 3.4 Minority report display (what was lost in synthesis)

## Phase 4: Collaboration Features
**Goal:** Make multi-user interaction smooth

- [ ] 4.1 Real-time presence (who's viewing)
- [ ] 4.2 Response editing with conflict resolution
- [ ] 4.3 Comment threads on synthesis sections
- [ ] 4.4 Export to PDF/Markdown

## Phase 5: Testing & Validation
**Goal:** Prove it works (Sam's directive + Father's Vision QA)

- [ ] 5.1 Simulated E2E tests (full user journey)
- [ ] 5.2 Consensus library integration tests
- [ ] 5.3 Synthesis output validation tests
- [ ] 5.4 Error scenario coverage
- [ ] 5.5 Vision QA loop (Playwright screenshots → vision model → iterate until 8+/10)

## Phase 6: Polish & Performance
**Goal:** Production-ready quality

- [ ] 6.1 Mobile responsive design
- [ ] 6.2 Keyboard navigation
- [ ] 6.3 Loading skeleton states
- [ ] 6.4 Error boundaries with recovery
- [ ] 6.5 Performance optimization (lazy loading, memoization)

---

## Pulse State

```json
{
  "current_phase": 3,
  "current_task": "3.4",
  "last_run": "2026-02-21T01:54:00Z",
  "tasks_completed": [
    "1.1", "1.2", "1.3", "1.4", "1.5",
    "2.1", "2.2", "2.3", "2.4", "2.5", "2.6",
    "3.1", "3.2", "3.3"
  ],
  "blockers": []
}
```

## How the Pulse Works

Every 30 minutes:
1. Read this ROADMAP.md
2. Check current_task status
3. If incomplete: spawn worker to complete it
4. If complete: mark done, move to next task
5. **Rebuild & re-serve**: `cd frontend && npm run build` then restart backend
6. Update pulse state
7. Report progress to Father via Telegram

**Re-serve command:**
```bash
cd ~/.openclaw/workspace/symphonia-ruaridh/frontend && npm run build
pkill -f "uvicorn main:app"
cd ~/.openclaw/workspace/symphonia-ruaridh/backend && source .venv/bin/activate && nohup uvicorn main:app --host 0.0.0.0 --port 8766 > /tmp/symphonia.log 2>&1 &
```

