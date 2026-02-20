# Visual Changes — Symphonia UI Revamp

**Date:** 2026-02-20  
**Scope:** Color palette, theming, typography, spacing, dark mode consistency

---

## Summary

Complete visual theming overhaul. The app previously had broken dark mode (most pages hardcoded `bg-white`, `bg-neutral-100`, etc.) and inconsistent styling across components. Every page now uses the centralized theme system and renders correctly in all three themes.

---

## Infrastructure Changes

### 1. `tailwind.config.js` — Theme-aware Tailwind

- Added `darkMode: ['class']` for Tailwind dark mode support
- Mapped **all CSS custom properties** to Tailwind utility classes:
  - `bg-background`, `text-foreground`, `bg-card`, `bg-muted`, `bg-secondary`, `bg-accent`, etc.
  - `text-muted-foreground`, `text-accent`, `text-destructive`, `text-success`
  - `border-border`, `bg-input`, `ring-ring`
- Added `highlight` color tokens (for callout boxes)
- Semantic `borderRadius` mapping: `rounded-lg/md/sm` all derive from `--radius`
- `shadow-card` and `shadow-card-lg` mapped to theme variables
- `font-sans` mapped to `--font-family`

### 2. `src/index.css` — Enhanced Base Styles

- **Refined default palette**: Shifted from flat gray to slate tones (`#f8fafc` bg, `#0f172a` fg, `#e2e8f0` borders)
- **New tokens**: `--card-shadow-lg`, `--highlight`, `--highlight-foreground`, `--highlight-border`
- **Typography rhythm**: Base layer `h1`–`h4` have consistent `font-weight`, `line-height`, `letter-spacing`
- **Form element defaults**: All `input`, `textarea`, `select` automatically inherit theme colors, borders, focus rings — no per-component styling needed
- **Focus states**: Themed focus ring with `box-shadow` (light and dark mode variants)
- **Component classes**: `.card`, `.card-lg`, `.btn`, `.btn-accent`, `.btn-destructive`, `.btn-success`, `.btn-secondary`, `.highlight-box` — reusable patterns
- **Prose overrides**: `.prose` elements (headings, links, code, blockquotes, hr) all use theme vars
- **Tiptap editor**: `.ProseMirror` styled with theme colors
- **Custom scrollbar**: Subtle, themed
- **Added weight 800** to Inter import for extrabold headings

### 3. `src/theme/ThemeProvider.tsx` — Refined Palette

**Axiotic Light** (default):
| Token | Old | New | Rationale |
|-------|-----|-----|-----------|
| background | `#ffffff` | `#f8fafc` | Subtle off-white creates depth; white cards pop |
| foreground | `#111827` | `#0f172a` | Slate-900, slightly richer |
| muted-foreground | `#6b7280` | `#64748b` | Slate-500, better readability |
| border | `#e5e7eb` | `#e2e8f0` | Slate-200, consistent family |
| card-shadow | basic | layered | Two-layer shadow for subtle depth |

**Axiotic Dark** (major improvements):
| Token | Old | New | Rationale |
|-------|-----|-----|-----------|
| background | `#111827` (gray-900) | `#0c1222` | Deep navy-black, more sophisticated |
| foreground | `#f9fafb` | `#e2e8f0` | Slightly softer white, less glare |
| card | `#1f2937` (gray-800) | `#151f32` | Blue-tinted panel, richer |
| secondary | `#374151` | `#1c2b44` | Navy-tinted, not flat gray |
| muted | `#374151` | `#162032` | Better layering distinction |
| accent-hover | `#2563eb` | `#60a5fa` | Brighter on hover for dark bg |
| border | `#374151` | `#1e2d47` | Subtle navy, not flat gray |
| card-shadow | `none` | layered | Subtle depth even in dark mode |

**Apple** theme: Minor refinements to match the system aesthetic (`#f5f5f7` bg, `#1d1d1f` fg, `#d2d2d7` borders).

All three themes now include `highlight`, `highlight-foreground`, `highlight-border` tokens.

### 4. `index.html` — Zero-flash Script Sync

Updated the inline theme script to include all new tokens (`card-shadow-lg`, `highlight`, `highlight-foreground`, `highlight-border`) and match the refined color values.

---

## Component Changes

Every component was updated to replace hardcoded Tailwind colors with theme-aware classes. **No structural or routing changes.**

### Mapping Applied

| Before (hardcoded) | After (theme-aware) |
|---------------------|---------------------|
| `bg-neutral-100` | `bg-background` |
| `bg-white` | `bg-card` or `.card` / `.card-lg` |
| `bg-neutral-50` | `bg-muted` |
| `text-neutral-900`, `text-black` | `text-foreground` |
| `text-neutral-500/600/700` | `text-muted-foreground` |
| `bg-blue-600` | `bg-accent` or `.btn-accent` |
| `hover:bg-blue-700` | `hover:bg-accent-hover` |
| `text-blue-600` | `text-accent` |
| `text-red-500/600` | `text-destructive` |
| `bg-red-600` | `.btn-destructive` |
| `bg-green-600` | `.btn-success` |
| `bg-neutral-200` | `bg-secondary` |
| `shadow` / `shadow-lg` / `shadow-xl` | `shadow-card` / `shadow-card-lg` / `.card` |
| `focus:ring-blue-200` | Automatic via base CSS |
| `bg-blue-50 border-blue-200` | `.highlight-box` |
| `disabled:bg-blue-400` | `disabled:opacity-55` (via `.btn`) |

### Files Updated

| File | Key Changes |
|------|-------------|
| `Login.tsx` | Full theme: `.card-lg`, `.btn-accent`, `bg-background` |
| `Register.tsx` | Same pattern as Login |
| `Header.tsx` | Already mostly themed; cleaned up `shadow-card` |
| `App.tsx` | `bg-background text-foreground font-sans`; footer themed |
| `UserDashboard.tsx` | Cards use `.card-lg`; buttons use `.btn-*`; form list items use `.card` |
| `AdminDashboard.tsx` | Cards, table header `bg-muted`, code blocks use `bg-secondary` |
| `FormPage.tsx` | Full theme; synthesis highlight uses `.highlight-box`; textareas use `bg-muted`; loading state themed |
| `WaitingPage.tsx` | Header/footer/main all themed; standalone layout fully dark-mode-ready |
| `ThankYouPage.tsx` | Same standalone layout theming |
| `ResultPage.tsx` | Full standalone theme; feedback form uses theme vars; focus rings automatic |
| `SummaryPage.tsx` | The most complex page — header, sidebar, modal, editor, response HTML all themed. Dynamic HTML uses inline `var()` refs |
| `AdminFormPage.jsx` | Full theme; round status colors use `text-success`/`text-muted-foreground` |
| `FormEditor.jsx` | Full theme; header, cards, buttons all use theme system |

---

## Spacing Consistency

- **Page padding**: Standardized to `px-4 sm:px-6` horizontal, `py-6 sm:py-8` vertical
- **Card padding**: `p-6 sm:p-8` for main cards, `p-4` for sidebar cards
- **Section gaps**: `space-y-6` between sections, `mb-6` between cards
- **Input padding**: `px-4 py-2.5` for inputs, `px-3 py-2.5` for smaller contexts
- **Button padding**: Managed by `.btn` class (consistent `0.5rem 1rem`)

---

## Typography Consistency

- **Inter weight 800** added to Google Fonts import (for display headings)
- Base headings: `h1` 1.875rem/700, `h2` 1.5rem/600, `h3` 1.25rem/600, `h4` 1.125rem/600
- Consistent `letter-spacing: -0.01em` on headings, `-0.025em` on h1
- Body `line-height: 1.6` for readability
- Heading `line-height: 1.25` for tightness
- `font-family` always from CSS var (no hardcoded font stacks in components)

---

## What Was NOT Changed

- ❌ No component restructuring or hierarchy changes
- ❌ No routing changes
- ❌ No new routes or pages
- ❌ No animation/transition additions (only preserved the existing theme transition)
- ❌ No JavaScript logic changes (only className/style updates)
