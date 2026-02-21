# GRIND WORKER 2: Structured Input Template — Complete

## What Was Done

### Phase 1: Created `StructuredInput.tsx` Component
**File:** `frontend/src/components/StructuredInput.tsx`

The core differentiator — replaces plain textareas with a rich structured expert input:

- **Position** (textarea, required) — expert's core stance
- **Evidence & Reasoning** (textarea) — supporting data, research, experience
- **Confidence Slider** (1–10 range input) — with color-coded badge and human-readable labels ("Highly uncertain" → "Certain")
- **Confidence Justification** (textarea) — what would change their mind
- **Counterarguments** (textarea) — strongest arguments against their position
- **Advanced Section** (collapsible):
  - **Citations** — add/remove chips (URL, DOI, or text reference), Enter key to add
  - **Expert Nominations** — suggest other experts who should weigh in

Features:
- **Auto-save to localStorage** (debounced 500ms) — critical UX requirement. Restores on fresh page load if current value is empty.
- **Read-only mode** — distinct presentation for review state (shows confidence bar, chips without edit controls)
- **Auto-resizing textareas** — grow with content
- Styled with existing CSS variables (`var(--card)`, `var(--border)`, `var(--accent)`, etc.)
- Uses `lucide-react` icons (already a dependency)

### Phase 2: Created Types
**File:** `frontend/src/types/structured-input.ts`

```typescript
interface StructuredResponse {
  position: string;
  evidence: string;
  confidence: number;
  confidenceJustification: string;
  counterarguments: string;
  citations?: string[];
  expertNominations?: string[];
}
```

Plus helper functions: `emptyStructuredResponse()`, `isResponseValid()`, `autoSaveKey()`.

### Phase 3: Integrated into FormPage
**File:** `frontend/src/FormPage.tsx`

Changes:
- Replaced `Record<string, string>` responses with `Record<string, StructuredResponse>`
- Each question now renders `<StructuredInput>` instead of a plain `<textarea>`
- Review mode uses `readOnly` prop for a clean display
- Legacy compatibility: `legacyToStructured()` converts old plain-string answers (puts text into `position` field)
- Auto-save data cleared on successful submit
- Component exported from `frontend/src/components/index.ts`

## Build Status
✅ `npm run build` — **SUCCESS** (2.98s, no errors)

## What Changed
| File | Action |
|------|--------|
| `frontend/src/types/structured-input.ts` | **Created** |
| `frontend/src/components/StructuredInput.tsx` | **Created** |
| `frontend/src/components/index.ts` | **Modified** (added export) |
| `frontend/src/FormPage.tsx` | **Modified** (integrated StructuredInput) |

## Design Decisions
1. **Inline styles using CSS variables** — consistent with existing theme system, no extra CSS file needed
2. **Debounced auto-save** — 500ms delay prevents localStorage spam while typing
3. **Legacy answer migration** — old plain-string answers get `position` field populated, so existing data displays correctly
4. **Collapsible Advanced section** — keeps the form clean for simple use cases while expert features are accessible
5. **Confidence labels + colors** — 10-point scale with human-readable descriptors and semantic coloring (red → green)
