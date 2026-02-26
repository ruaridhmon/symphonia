# Motion Changes — Symphonia UI Revamp

**Agent:** MOTION specialist  
**Date:** 2026-02-20  
**Scope:** Animations, transitions, micro-interactions, loading states, page entrance effects  

---

## Design Tokens Added (`index.css :root`)

| Token | Value | Purpose |
|-------|-------|---------|
| `--ease-out-expo` | `cubic-bezier(0.16, 1, 0.3, 1)` | Primary deceleration curve for entrances |
| `--ease-out-quint` | `cubic-bezier(0.22, 1, 0.36, 1)` | Alternate smooth decel |
| `--ease-spring` | `cubic-bezier(0.34, 1.56, 0.64, 1)` | Bouncy overshoot for button press |
| `--duration-fast` | `120ms` | Micro-interactions (press, hover) |
| `--duration-normal` | `200ms` | Standard transitions |
| `--duration-slow` | `350ms` | Entrances, cards |
| `--duration-page` | `450ms` | Full page transitions |

## Accessibility

- Global `@media (prefers-reduced-motion: reduce)` rule zeros all animation/transition durations.

## CSS Utility Classes Added

### Page & Card Entrances
- **`.animate-fade-up`** — Fade + 12px upward slide. Used on page `<main>` wrappers.
- **`.animate-scale-in`** — Scale from 0.96 + fade. Used on cards and form containers.
- **`.stagger-list`** — Auto-staggers children (60ms increments, up to 9 items). Used on form lists.

### Modal
- **`.animate-overlay`** — Fade-in for backdrop.
- **`.animate-modal`** — Scale-fade for modal panel.

### Micro-interactions
- **`.btn-press`** — Button hover lifts 1px + shadow; active presses down + scales 0.97. Spring easing.
- **`.input-focus`** — Smooth border-color transition + colored glow ring on focus.
- **`.hover-lift`** — Card/list-item hover: translateY(-2px) + shadow increase.

### Loading States
- **`.skeleton`** / **`.skeleton-text`** / **`.skeleton-heading`** / **`.skeleton-block`** — Shimmer loading placeholders with gradient animation.
- **`.spinner`** — CSS-only rotating ring (accent color top-border).

### Feedback
- **`.animate-shake`** — Horizontal shake for error messages.
- **`.animate-message`** — Fade + slide-down for error/success inline messages.
- **`.pulse-dot`** — Pulsing circle for live/waiting indicators.
- **`.waiting-breathe`** — Gentle breathing scale for waiting text.

## Component Changes

### Login.tsx & Register.tsx
- Form card: `animate-scale-in`
- Error messages: `animate-message animate-shake`
- Inputs: `input-focus`
- Submit button: `btn-press` + inline spinner when loading

### UserDashboard.tsx
- Page wrapper: `animate-fade-up`
- Join card: `animate-scale-in`
- Forms card: `animate-scale-in` (80ms delay)
- Form list: `stagger-list`
- List items: `hover-lift`
- Buttons: `btn-press`

### AdminDashboard.tsx
- Page wrapper: `animate-fade-up`
- Create form card: `animate-scale-in`
- Existing forms card: `animate-scale-in` (80ms delay)
- Inputs: `input-focus`
- Save button: `btn-press`
- Table rows: `hover:bg-neutral-50` transition

### FormPage.tsx
- Loading state: **skeleton shimmer** (replaces bare "Loading…")
- Form container: `animate-fade-up`
- Textarea: `input-focus` (replaces `focus:ring-2 focus:ring-blue-200`)
- Submit / Edit buttons: `btn-press`

### FormEditor.jsx
- Loading state: **skeleton shimmer** (replaces bare "Loading…")
- Page content: `animate-fade-up`
- Cards: `animate-scale-in` with staggered delays
- Question list: `stagger-list`
- Inputs: `input-focus`
- Save / Delete buttons: `btn-press`

### WaitingPage.tsx
- Card: `animate-scale-in`
- Added **spinner** (rotating ring)
- Added 3 **pulse dots** (staggered 300ms) as "processing" indicator
- Message text: `waiting-breathe`

### ThankYouPage.tsx
- Card: `animate-scale-in`
- Added animated **checkmark SVG** with spring-eased scale entrance (200ms delay)

### ResultPage.tsx
- Page: `animate-fade-up`
- Synthesis card: `animate-scale-in`
- Feedback form: `animate-scale-in` (120ms delay)
- Textareas: `input-focus`
- Submit button: `btn-press`

### SummaryPage.tsx
- Loading state: **full skeleton layout** (header + 3-col grid placeholders)
- Page: `animate-fade-up`
- Modal overlay: `animate-overlay` (fade) + `animate-modal` (scale)
- Action buttons: `btn-press`
- Generate button: inline spinner when generating
- Question inputs: `input-focus`

### Atlas.tsx
- Loading state: spinner + `animate-fade-up`
- Sections: `animate-fade-up` with 80ms stagger per section
- Button grid: `stagger-list`
- Buttons: `hover-lift btn-press` (replaces inline scale classes)

### Header.tsx
- Logout button: `transition-all duration-150 hover:opacity-70 active:scale-95`

### tailwind.config.js
- Added `transitionTimingFunction`: `out-expo`, `spring`
- Added `transitionDuration`: `fast` (120ms), `slow` (350ms)

## What Was NOT Changed (per constraints)
- No color values modified
- No component structure / hierarchy changes
- No routing changes
- No typography changes
- No new npm dependencies added (all CSS-only)
