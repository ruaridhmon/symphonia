# Symphonia Design System

> **Version:** 2.0  
> **Created:** 2026-02-21  
> **Updated:** 2026-02-22  
> **Maintained by:** Axiotic AI  
> **Audience:** Frontend developers, designers, product stakeholders

---

## 1. Brand Identity

### Logo System

Symphonia uses a **tuning fork / starburst mark** (Concept D) that visually represents converging voices reaching a point of clarity — a direct metaphor for the Delphi-style expert consensus the platform produces. The logo was upgraded in Phase 2.3 to the tuning fork Concept D design.

| Asset | File | Usage | Notes |
|-------|------|-------|-------|
| **Logo mark** | `public/logo-mark.png` | App header (28px height) | Starburst only, no text |
| **Logo wordmark** | `public/logo-wordmark.png` | Auth pages, landing | Starburst + "Symphonia" logotype |
| **Favicon** | `public/favicon.svg` | Browser tab | SVG starburst |

**Source files** live in `assets/logo/`.

#### Usage Rules

- **Header:** `<img src="/logo-mark.png" alt="Symphonia" className="h-7 w-auto" />` — mark only, wordmark title displayed as HTML `<h1>` for accessibility/SEO
- **Auth layout:** `<img src="/logo-wordmark.png" alt="Symphonia" className="h-10 w-auto" />` — wordmark replaces the `<h1>` (text is baked into the image)
- **Minimum clear space:** Equal to the height of the starburst mark on all sides
- **Never** recolour, distort, or apply drop shadows to the logo
- **On dark backgrounds:** The blue logo is preferred; ensure sufficient contrast (≥ 3:1 against background)

### Brand Voice

Symphonia is a **precision instrument for policy deliberation**, not a social platform. The visual design should feel:

- **Authoritative but approachable** — government officials and domain experts must trust it
- **Calm and structured** — complex deliberation happens here; the UI should never add cognitive noise
- **Quietly intelligent** — AI assistance is present but not flashy

---

## 2. Color System

### Architecture

Colors are defined as **CSS custom properties** set by the `ThemeProvider` (`src/theme/ThemeProvider.tsx`). The `:root` block in `index.css` matches `axiotic-light` exactly to prevent flash-of-incorrect-theme on initial render.

Three themes are available (controlled by `data-theme` on `<html>`):

| Theme ID | Display Name | Background | Character |
|----------|-------------|------------|-----------|
| `axiotic-light` | Light | `#ffffff` | Default; clean white |
| `axiotic-dark` | Dark | `#0a0f1e` | Deep navy cosmos |
| `apple` | Apple | `#F2F2F7` | Alternate; HIG-aligned |

### Token Reference

#### axiotic-light (Default)

| Token | Value | Role |
|-------|-------|------|
| `--background` | `#ffffff` | Page / full-bleed backgrounds |
| `--foreground` | `#0f172a` | Primary text |
| `--card` | `#f8faff` | Card surfaces (barely blue-tinted) |
| `--card-foreground` | `#0f172a` | Text on cards |
| `--secondary` | `#f1f5f9` | Secondary surfaces, hover states |
| `--muted` | `#f1f5f9` | Muted backgrounds |
| `--muted-foreground` | `#64748b` | Secondary labels, placeholders |
| `--accent` | `#2563eb` | Brand blue — interactive elements, links, focus rings |
| `--accent-foreground` | `#ffffff` | Text on accent backgrounds |
| `--accent-hover` | `#1d4ed8` | Accent on hover |
| `--destructive` | `#dc2626` | Errors, destructive actions |
| `--destructive-foreground` | `#ffffff` | Text on destructive |
| `--success` | `#16a34a` | Success states |
| `--warning` | `#d97706` | Warnings |
| `--warning-foreground` | `#854d0e` | Text on warning backgrounds |
| `--highlight` | `#eff6ff` | Callout boxes, info banners |
| `--highlight-foreground` | `#1e40af` | Text in callout boxes |
| `--highlight-border` | `#bfdbfe` | Border on callout boxes |
| `--border` | `#e2e8f0` | All dividers, card borders |
| `--input` | `#e2e8f0` | Form field borders |
| `--ring` | `#2563eb` | Focus ring — accessibility |
| `--radius` | `0.5rem` | Base border radius (8px) |
| `--font-family` | Inter, -apple-system, … | Primary typeface |
| `--skeleton-base` | `#e2e8f0` | Skeleton loader base |
| `--skeleton-highlight` | `#f1f5f9` | Skeleton loader shimmer |

#### axiotic-dark

| Token | Value | Notes |
|-------|-------|-------|
| `--background` | `#0a0f1e` | Deep navy |
| `--card` | `#0f172a` | Slightly lighter navy |
| `--accent` | `#3b82f6` | Lighter blue (works on dark bg) |
| `--accent-hover` | `#60a5fa` | Even lighter on hover |
| `--border` | `#1e293b` | Subtle dark border |
| `--muted-foreground` | `#94a3b8` | |

> All other tokens follow the same semantic roles as `axiotic-light`.

### Color Do's and Don'ts

✅ **Do:** Always use CSS custom property tokens (`var(--accent)`)  
✅ **Do:** Add opacity via `color-mix(in srgb, var(--accent) 10%, transparent)` (avoids hardcoding rgba)  
❌ **Don't:** Hardcode hex values in component files — they won't respond to theme switching  
❌ **Don't:** Use Tailwind color utilities (`text-blue-600`) for brand/semantic colors — use tokens  
❌ **Don't:** Invent new accent colors without adding them to all three themes in `ThemeProvider.tsx`

### Missing Tokens (Known Gap — Tracked)

These semantic colors are currently hardcoded in components and should be token-ised:

| Purpose | Current Hardcoded | Proposed Token |
|---------|------------------|----------------|
| Purple accent (loading states, waiting page) | `#a855f7`, `#7c3aed` | `--purple`, `--purple-foreground` |
| Warning badge (awaiting response) | `#ca8a04`, `#eab308` | Already have `--warning` — migrate to it |
| Orbit dot 3 (waiting animation) | `#a855f7` | `--purple` |
| Orbit dot 4 (waiting animation) | `#eab308` | `--warning` |
| Success button text | hardcoded `#ffffff` | `--destructive-foreground` (reuse) |

---

## 3. Typography

### Typeface

**Inter** (Google Fonts) — loaded in `index.css`:

```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
```

Inter was chosen for:
- Superior legibility at small sizes (critical for dense policy tables)
- Extensive weight range (400–800) enabling clear hierarchy
- Excellent coverage of punctuation needed for formal text
- `-apple-system` fallback ensures native rendering on macOS/iOS

### Type Scale

| Role | Size | Weight | Letter Spacing |
|------|------|--------|----------------|
| Page title (h1) | 1.875rem (30px) | 700 | −0.025em |
| Section title (h2) | 1.5rem (24px) | 600 | — |
| Subsection (h3) | 1.25rem (20px) | 600 | — |
| Card title (h4) | 1.125rem (18px) | 600 | — |
| Body | 1rem (16px) | 400 | — |
| Small body | 0.875rem (14px) | 400 | — |
| Caption / label | 0.75rem (12px) | 500 | — |

### Minimum Touch Target / Font Size

Mobile inputs use `font-size: 1rem` (16px) to prevent iOS auto-zoom. All interactive elements maintain ≥ 44×44px touch target.

---

## 4. Spacing & Layout

### 8px Grid

All spacing follows an 8px base grid. Tailwind's scale (which maps to rem) is used:

| px | Tailwind | Token usage |
|----|---------|-------------|
| 4 | `p-1` | Icon padding, tight badges |
| 8 | `p-2` | Compact buttons, inner spacing |
| 12 | `p-3` | Standard button padding |
| 16 | `p-4` | Card padding, section gaps |
| 24 | `p-6` | Card-to-card gaps |
| 32 | `p-8` | Page section separators |
| 48 | `p-12` | Hero / auth layout vertical padding |

### Page Layout

Max content width: **`max-w-6xl`** (72rem / 1152px) with `mx-auto px-4 sm:px-6`.

For auth pages (login / register): **`max-w-md`** (28rem / 448px) — centred vertically and horizontally.

### Border Radius

`--radius: 0.5rem` (8px) is the base. Components use:

| Component type | Radius |
|---------------|--------|
| Cards | `--radius` (8px) |
| Buttons | `--radius` or `rounded-full` for pill style |
| Badges / chips | `rounded-full` |
| Inputs | `calc(var(--radius) - 2px)` |
| Modals / panels | `calc(var(--radius) + 4px)` (12px) |

---

## 5. Component Patterns

### Buttons

All buttons use `LoadingButton` from `src/components/LoadingButton.tsx`. Variants:

| Variant | Background | Text | Use for |
|---------|-----------|------|---------|
| `primary` | `--accent` | `--accent-foreground` | Primary CTA |
| `secondary` | `--secondary` | `--foreground` | Secondary actions |
| `danger` | `--destructive` | `--destructive-foreground` | Destructive actions |
| `success` | `--success` | `#ffffff` | Confirm / publish |
| `ghost` | transparent | `--muted-foreground` | Tertiary / icon buttons |
| `purple` | `#7c3aed` | `#ffffff` | Special highlight (waiting) |

**Width:** `width: fit-content` unless layout requires full width. Full-width only in forms/modals on mobile.

### Cards

```css
.card {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  box-shadow: var(--card-shadow);
}
```

Use `var(--card-shadow-lg)` for elevated/interactive cards on hover.

### Form Fields

All inputs styled via `input` base styles in `index.css`:

```css
input, textarea, select {
  background: var(--card);
  border: 1.5px solid var(--input);
  border-radius: calc(var(--radius) - 2px);
  color: var(--foreground);
  padding: 0.5rem 0.75rem;
  font-size: 1rem; /* 16px — prevents iOS zoom */
}
input:focus {
  outline: 2px solid var(--ring);
  outline-offset: 0;
  border-color: var(--accent);
}
```

### Skeleton Loaders

`UserDashboard` and `FormPage` use skeleton states during data fetch. Pattern:

```tsx
{isLoading ? (
  <div className="skeleton-card" aria-hidden="true" />
) : (
  <ActualContent />
)}
```

CSS in `index.css` `.skeleton-card`, `.skeleton-line`, `.skeleton-text` classes with shimmer animation.

### Icons

All icons use **Lucide React** (`lucide-react`). Emoji icons were fully migrated in sprint (12 files updated). Standard sizing: `size={16}` for inline, `size={20}` for buttons, `size={24}` for standalone.

---

## 6. Synthesis Display Design

The `SynthesisDisplay` component (`src/components/SynthesisDisplay.tsx`) renders structured JSON output from the AI synthesis pipeline. Card types:

| Card Type | Color | Icon | Purpose |
|-----------|-------|------|---------|
| Agreement | `--success` (green) | CheckCircle | Points of consensus |
| Disagreement | `--destructive` (red) | AlertTriangle | Areas of contention |
| Nuance | `--warning` (amber) | Info | Caveats and complexity |
| Emergent Insight | `--accent` (blue) | Sparkles | Cross-pollination ideas |
| Minority Report | `--muted` (grey) | User | Dissenting positions |

**Version selector:** Displayed above the synthesis content, showing `v1`, `v2`, … with a "Publish" button for the current draft version. The active published version is marked with a ✓ badge.

**View/Edit toggle:** Eye icon (view) / Pencil icon (edit) in the synthesis header — switches between read-only rendered markdown and editable textarea.

---

## 7. Animation & Motion

Motion is used sparingly — deliberative policy platforms should feel **stable**, not playful.

| Interaction | Duration | Easing | Implementation |
|-------------|----------|--------|----------------|
| Button hover state | 150ms | ease | CSS transition |
| Card hover elevation | 200ms | ease | CSS transition |
| Mobile menu open/close | 200ms | ease-in-out | CSS transition (maxHeight) |
| Skeleton shimmer | 1.5s | ease-in-out | CSS animation (infinite) |
| Waiting room orbit | 3s | linear | CSS animation (infinite) |
| Page transitions | None | — | Instant — deliberate choice |

**No** entrance animations on data load (skeleton → content is instant swap). **No** bounce, spring, or elastic easing.

---

## 8. Accessibility

### Focus Management

- All interactive elements have visible focus rings: `outline: 2px solid var(--ring); outline-offset: 2px`
- Mobile menu traps focus and returns to trigger on Escape (`Header.tsx`)
- `aria-live="polite"` regions on form error states
- `aria-expanded`, `aria-controls`, `aria-label` on all toggle controls

### Colour Contrast

| Pair | Ratio | WCAG |
|------|-------|------|
| `--foreground` on `--background` | 16.4:1 | AAA |
| `--muted-foreground` on `--background` | 5.3:1 | AA |
| `--accent-foreground` on `--accent` | 4.6:1 | AA |
| `--accent-foreground` on `--accent-hover` | 6.2:1 | AA |
| `--destructive-foreground` on `--destructive` | 4.5:1 | AA |

### Screen Readers

- Logo marks have `alt="Symphonia"` (decorative marks use `aria-hidden="true"`)
- Skeleton loaders use `aria-hidden="true"` and `aria-busy` on parent containers
- Status badges use `aria-label` for non-colour meaning

### Mobile

- Min touch target: 44×44px (enforced via `min-h-[44px]` on interactive elements)
- `font-size: 16px` on inputs prevents iOS auto-zoom
- Safe-area insets: `padding-bottom: env(safe-area-inset-bottom)` on bottom bars
- `@media (hover: none)` queries used to disable hover effects on touch

---

## 9. Responsive Breakpoints

Tailwind's default scale, applied consistently:

| Breakpoint | Width | Layout change |
|-----------|-------|---------------|
| `sm` | 640px | Single → desktop navigation, sidebar appears |
| `md` | 768px | Two-column layouts |
| `lg` | 1024px | Three-column layouts, full sidebar |
| `xl` | 1280px | Not currently used |

Default layout is **mobile-first single column**.

---

## 10. Dark Mode Implementation

Dark mode is controlled by `ThemeProvider.tsx` — the user's selection is persisted to `localStorage` and the `data-theme` attribute is set on `<html>`.

**Theme detection:**

1. Check `localStorage.getItem('symphonia-theme')`
2. Fall back to `prefers-color-scheme: dark`
3. Default to `axiotic-light`

The toggle is `<ThemeToggle />` from `src/theme/ThemeToggle.tsx` — rendered in both the desktop header and the mobile menu.

**Critical rule for dark mode safety:** Never hardcode colours in component `style={{}}` props. Always use `var(--token)`. Hardcoded values will not update when the theme changes.

---

## 11. Asset Optimisation

### Logo Files

| File | Dimensions | Size | Format |
|------|-----------|------|--------|
| `logo-mark.png` | 128×128px | 20KB | PNG (optimised via sips) |
| `logo-wordmark.png` | 560×224px | 65KB | PNG (optimised via sips) |
| `favicon.svg` | 32×32px | ~1KB | SVG |
| `logo.png` (legacy) | varies | varies | Keep for compat (redirects via Vite) |

**Source** (full-resolution): `assets/logo/` — do not use these in production directly.

### Bundle

Code splitting via `React.lazy` + `Vite.build.rollupOptions.output.manualChunks`:

| Chunk | Contents | Size |
|-------|---------|------|
| `vendor-react` | React, ReactDOM | ~45KB gz |
| `vendor-router` | React Router | ~12KB gz |
| `vendor-ui` | Lucide, Radix primitives | ~18KB gz |
| `initial` | App shell, router config | ~18KB gz |
| `page-*` | Lazy-loaded page components | ~5–30KB each |

---

## 12. Design Review Findings (2026-02-21)

Three independent design reviews were conducted by specialised AI reviewers across all app pages.

### Apple HIG Review — Key Findings

**Status:** 3 critical, 4 high, 5 medium

| # | Issue | Severity | Resolution |
|---|-------|----------|-----------|
| 1.1 | Primary blue `#2563eb` is Tailwind-generic, not Apple `#007AFF` | 🔴 Critical | *Intentional — brand blue matches logo; not adopting `#007AFF`* |
| 1.2 | Background uses tinted gradient | 🔴 Critical | Fixed — now flat `#ffffff` |
| 1.3 | Error red should be `#FF3B30` | 🔴 Critical | Tracked — low priority for gov deployment |
| 1.4 | Font weight hierarchy too flat | 🟠 High | Tracked — h2/h3 weight to be tightened |
| 1.5 | Border radius inconsistent | 🟠 High | Tracked |
| 2.x | Button widths (full vs fit-content) | 🟠 High | Fixed via `width: fit-content` in sprint |

### Graphic Design Review — Key Findings

**Status:** Token system is solid; hardcoded colours are the main risk

| # | Issue | Severity | Resolution |
|---|-------|----------|-----------|
| 1.2 | `:root` tokens diverged from ThemeProvider | 🔴 Critical | Fixed — `index.css` now matches `axiotic-light` |
| 1.3 | 8+ hardcoded colours in components | 🔴 Critical | Tracked — `--purple`, `--warning` tokens needed |
| 2.1 | Visual hierarchy too flat | 🟠 High | Tracked |
| 3.1 | Brand identity invisible | 🟠 High | *In progress — logo integration this sprint* |

### UX Flow Review — Key Findings

**Status:** Visual polish B-; user journey completeness C

| # | Issue | Severity | Resolution |
|---|-------|----------|-----------|
| F1 | No context for new users on `/login` | 🔴 Critical | Tracked — add value proposition copy |
| F2 | No password requirements on register | 🟠 High | Tracked |
| F3 | No "Forgot Password" flow | 🟠 High | Tracked — needs backend endpoint |
| F4 | No display name field on register | 🟡 Medium | Tracked |
| F5 | No terms/privacy consent | 🟡 Medium | Tracked — required for gov deployment |
| Admin 1 | Form creation moved inline | 🔴 Critical | Fixed — now separate `/admin/form/new` page |
| Synthesis | Single-expert hallucination bug | 🔴 Critical | Fixed — `allow_disagreements = num_responses >= 2` in `synthesis.py` |

### Design Backlog (Prioritised)

**P0 — Completed (Sprint 2026-02-21):**
1. ~~Add `--purple` / `--purple-foreground` tokens~~ — Tracked; hardcoded values remain in waiting animation
2. ~~Add onboarding copy to `/login`~~ — Tracked
3. ~~Consolidate "Generate Summary" + "Generate New Version"~~ — Resolved: version history timeline replaces duplicate buttons

**P1 — Next sprint:**
4. "Forgot Password" flow (requires backend endpoint + `reset_token` field exists on User model)
5. Display name field on `/register`
6. "View Sources" expansion on claim cards (data exists in `claims_raw` and `evidence_excerpts`)

**P2 — Future:**
7. Terms / Privacy consent on registration (gov deployment requirement)
8. Invitation-context support (`?context=` param on `/login`)
9. Empty state illustrations for Dashboard (empty state CTAs added in Phase 2.3)
10. `h2` / `h3` font weight reduction (600 → currently 700 in some places)

---

## 13. File Locations Quick Reference

| What | Where |
|------|-------|
| Color tokens & themes | `frontend/src/theme/ThemeProvider.tsx` |
| Global CSS / `:root` defaults | `frontend/src/index.css` |
| Logo assets (source) | `assets/logo/` |
| Logo assets (web-optimised) | `frontend/public/` |
| Brand mark component | `frontend/src/Header.tsx` (inline `<img>`) |
| Wordmark component | `frontend/src/layouts/AuthLayout.tsx` (inline `<img>`) |
| Button system | `frontend/src/components/LoadingButton.tsx` |
| Synthesis display | `frontend/src/components/SynthesisDisplay.tsx` |
| Skeleton loaders | `frontend/src/components/SkeletonLoaders.tsx` |
| Design review (Apple) | `frontend/DESIGN_REVIEW_APPLE.md` |
| Design review (Graphic) | `frontend/DESIGN_REVIEW_GRAPHIC.md` |
| Design review (UX Flow) | `frontend/DESIGN_REVIEW_UX.md` |

---

---

## 14. Admin Settings Page Design

The Settings page (`/admin/settings`) provides platform-wide configuration in a clean card-based layout:

### Layout
- Single-column card grid within `max-w-4xl` container
- Each settings group in its own card: **Synthesis Configuration**, **Consultation Defaults**, **AI Assistant**
- Form inputs use standard token-based styling (`var(--card)` background, `var(--input)` border)

### Controls
| Setting | Control Type | Notes |
|---------|-------------|-------|
| Synthesis Strategy | Dropdown (`single_prompt` / `ttd` / `committee`) | Maps to backend strategy names |
| Model | Text input | OpenRouter model identifier (default: `anthropic/claude-opus-4-6`) |
| Convergence Threshold | Number input (0–100) | Percentage target |
| Max Rounds | Number input | Integer |
| Anonymous Responses | Toggle | Boolean |
| Allow Late Join | Toggle | Boolean |
| AI Suggestions Count | Number input (3–10) | Controls AI Question Assistant output |

---

## 15. Report Export Design

### GOV.UK-Styled Report
- Structured HTML report designed for government consumption
- Sections: Executive Summary, Agreements, Disagreements, Nuances, Emergent Insights, Minority Reports
- Confidence scores rendered as percentage bars
- Expert evidence excerpts in blockquote format
- Clean typography (Inter font, 16px body, generous whitespace)
- Generated client-side as blob download (no server round-trip)

### Print CSS
- `@media print` styles strip navigation, sidebar, and interactive elements
- Page-break rules between major sections
- Monochrome-safe design (no colour-only information)

---

## 16. Floating Sidebar Overlay

The Summary page sidebar (`SummaryPage.tsx`) was redesigned from a pushing layout to a floating overlay:

- Sidebar overlays content with `position: fixed` instead of pushing via `marginRight`
- Semi-transparent backdrop for focus isolation
- Contains: Synthesis Mode Selector, Expert Labels panel, Round controls
- Collapses to hamburger on mobile
- Smooth 200ms slide-in transition

---

## 17. Email Template Design

All 6 email templates follow a consistent branded layout:

### Layout Structure
```
┌────────────────────────────────────────┐
│          ♪ Symphonia (blue text)       │  ← Logo bar
├────────────────────────────────────────┤
│ ┌────────────────────────────────────┐ │
│ │          Card Content              │ │  ← White card, 12px radius
│ │                                    │ │
│ │   Heading (22px, bold)             │ │
│ │   Body text (15px, dark)           │ │
│ │   [CTA Button - brand blue]        │ │  ← VML fallback for Outlook
│ │                                    │ │
│ └────────────────────────────────────┘ │
│                                        │
│   Footer (12px, muted grey)            │  ← "Powered by Axiotic AI"
└────────────────────────────────────────┘
```

### Brand Constants
- Accent: `#2563eb` (brand blue)
- Background: `#f8fafc`
- Card: `#ffffff` with `#e2e8f0` border
- Text: `#1e293b`
- Muted: `#64748b`
- Max width: 600px
- Button: 8px radius, white text on brand blue

### Outlook Compatibility
- VML roundrect fallback for buttons (`<!--[if mso]>`)
- Table-based layout throughout
- Inline styles only (no `<style>` blocks)

---

*This document is the single source of truth for Symphonia's visual design language. Update it when design tokens change, new components are added, or review findings are resolved.*
