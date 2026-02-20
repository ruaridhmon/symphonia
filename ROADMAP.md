# Symphonia Roadmap

> Autonomous development pulse runs every 3 hours
> Last updated: 2026-02-20

## Phase 1: UX Foundation (IN PROGRESS)
**Goal:** Make it feel collaborative, not like a prison

- [ ] 1.1 Progress indicator during synthesis (spinner + stages)
- [ ] 1.2 Button feedback states (hover, active, loading, disabled)
- [ ] 1.3 Markdown rendering for synthesis output
- [ ] 1.4 Round navigation timeline/stepper
- [ ] 1.5 Larger, more readable round cards

## Phase 2: Structured Synthesis Display
**Goal:** Surface the rich data from consensus library

- [ ] 2.1 Synthesis mode selector (Simple / Committee / TTD)
- [ ] 2.2 Agreements section with count badge + confidence
- [ ] 2.3 Disagreements section with severity indicators
- [ ] 2.4 Nuances section (collapsible)
- [ ] 2.5 Follow-up Probes section (things to work on)
- [ ] 2.6 Expert attribution (who said what)

## Phase 3: Dimensional Search Integration
**Goal:** Implement DSM/Hecate patterns in the UI

- [ ] 3.1 Dimensional expert labels (Past/Present/Future or custom)
- [ ] 3.2 Cross-matrix visualization (which dimensions agree/conflict)
- [ ] 3.3 Emergence highlighting (insights not in any single response)
- [ ] 3.4 Minority report display (what was lost in synthesis)

## Phase 4: Collaboration Features
**Goal:** Make multi-user interaction smooth

- [ ] 4.1 Real-time presence (who's viewing)
- [ ] 4.2 Response editing with conflict resolution
- [ ] 4.3 Comment threads on synthesis sections
- [ ] 4.4 Export to PDF/Markdown

## Phase 5: Testing & Validation
**Goal:** Prove it works (Sam's directive)

- [ ] 5.1 Simulated E2E tests (full user journey)
- [ ] 5.2 Consensus library integration tests
- [ ] 5.3 Synthesis output validation tests
- [ ] 5.4 Error scenario coverage

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
  "current_phase": 1,
  "current_task": "1.1",
  "last_run": null,
  "tasks_completed": [],
  "blockers": []
}
```

## How the Pulse Works

Every 3 hours:
1. Read this ROADMAP.md
2. Check current_task status
3. If incomplete: spawn worker to complete it
4. If complete: mark done, move to next task
5. Update pulse state
6. Report progress to Father via Telegram

