# Layout Changes — Symphonia UI Revamp

**Author:** Layout Specialist  
**Date:** 2026-02-20  
**Scope:** Page structure, component hierarchy, navigation, routing, responsive layouts

---

## Summary

Eliminated duplicated layout shells across 6 pages, introduced shared layout routes,
standardised container widths, improved responsive behaviour, and organised components
into a clear hierarchy.

---

## New Files Created

### `src/layouts/` — Shared layout components

| File | Purpose |
|---|---|
| `PageLayout.tsx` | Authenticated page shell: `Header → <Outlet /> → Footer`. Used as a layout route — all authenticated pages inherit it automatically. |
| `AuthLayout.tsx` | Centred layout for Login/Register. Provides `min-h-screen` centering + `max-w-md` constraint. |
| `Container.tsx` | Standardised max-width container with responsive padding (`px-4 sm:px-6 lg:px-8`). Four sizes: `sm` (672px), `md` (768px), `lg` (1024px), `xl` (1280px). |
| `index.ts` | Barrel exports for clean imports. |

### `src/Dashboard.tsx`

Extracted from `App.tsx`. Pure content switcher between `AdminDashboard` and `UserDashboard`. No layout concerns — those are handled by `PageLayout`.

---

## Architecture Changes

### Before
```
AppRouter
├── /login          → Login (own min-h-screen + centering)
├── /register       → Register (own min-h-screen + centering)
├── /               → PrivateRoute → App (Header + Admin|User + Footer)
├── /waiting        → PrivateRoute → WaitingPage (own header + footer)
├── /result         → PrivateRoute → ResultPage (own header + footer)
├── /thank-you      → PrivateRoute → ThankYouPage (own header + footer)
├── /form/:id       → PrivateRoute → FormPage (own bg wrapper)
├── /admin/form/:id → PrivateRoute → FormEditor (own header)
└── /admin/form/:id/summary → PrivateRoute → SummaryPage (own header + footer)
```

### After
```
AppRouter
├── AuthLayout (centred, max-w-md)
│   ├── /login      → Login (form only, no shell)
│   └── /register   → Register (form only, no shell)
│
├── PrivateRoute → PageLayout (Header + <Outlet> + Footer)
│   ├── /           → Dashboard → Admin|User
│   ├── /atlas      → Atlas
│   ├── /waiting    → WaitingPage (content only)
│   ├── /result     → ResultPage (content only)
│   ├── /thank-you  → ThankYouPage (content only)
│   └── /form/:id   → FormPage (content only)
│
└── PrivateRoute (admin) → PageLayout
    ├── /admin/form/:id         → FormEditor (content only)
    └── /admin/form/:id/summary → SummaryPage (content only)
```

---

## Per-File Changes

### `AppRouter.tsx` — Nested layout routes
- Replaced flat `<Routes>` with nested layout routes using `<Outlet />`
- Three route groups: AuthLayout, PrivateRoute+PageLayout, AdminRoute+PageLayout
- Eliminated per-page `<PrivateRoute>` wrappers (now route-level)

### `PrivateRoute.tsx` — Outlet support + loading state
- Now works as both a wrapper (`<PrivateRoute><Page /></PrivateRoute>`) and a layout route (`<Route element={<PrivateRoute />}>`)
- Renders `<Outlet />` when no children provided
- Loading state improved: full-height centred spinner instead of bare `<div>Loading...</div>`

### `Header.tsx` — Responsive improvements
- Standardised to `max-w-7xl` container (was `max-w-6xl`) to match widest content area
- Added responsive padding: `px-4 sm:px-6 lg:px-8`
- Fixed height header bar: `h-14 sm:h-16` for consistent feel
- Added nav section with Dashboard link (extensible for future routes)
- Made brand clickable (navigates home)
- User email hidden on small screens (`hidden md:inline`) to prevent overflow
- Removed hardcoded underline from logout — cleaner appearance

### `Login.tsx` / `Register.tsx` — Shell-free
- Removed outer `min-h-screen` + centering div (AuthLayout provides this)
- Replaced hardcoded colors (`bg-white`, `bg-neutral-100`, `text-red-500`, `bg-blue-600`) with CSS variable styles for theme consistency
- Form is now the root element — no unnecessary wrapper

### `WaitingPage.tsx` — Shell-free, centred content
- Removed self-contained header, footer, and `min-h-screen` wrapper
- Uses `flex-1 flex items-center justify-center` to vertically centre within PageLayout
- Removed redundant `/me` API call (user info now shown in shared Header)
- Uses `Container` with `size="md"` for consistent width

### `ThankYouPage.tsx` — Shell-free, centred content
- Removed self-contained header, footer, and `min-h-screen` wrapper
- Removed redundant `/me` API call + email state + logout handler
- Same centring approach as WaitingPage
- ~70% less code

### `ResultPage.tsx` — Shell-free
- Removed self-contained header, footer, and `min-h-screen` wrapper
- Removed redundant email state + `/me` call + logout handler
- Uses `Container size="md"` for consistent width
- Replaced hardcoded Tailwind colors with CSS variable styles
- Stacked card layout: synthesis card + feedback form card

### `FormPage.tsx` — Shell-free + theme-aware
- Removed outer `min-h-screen bg-neutral-100` (was theme-breaking)
- Uses `Container size="md"` for consistent width
- All inputs/buttons now use CSS variables instead of hardcoded colors
- Loading state properly centred with `flex-1 flex items-center justify-center`

### `FormEditor.jsx` — Shell-free
- Removed self-contained `<header>` element (was duplicating shared Header)
- Uses `Container size="lg"` for consistent width
- Breadcrumb + title row is now responsive: stacks on mobile, inline on desktop
- Action bar (Save/Delete) stacks vertically on mobile
- All elements use CSS variable styles

### `SummaryPage.tsx` — Shell-free + improved grid
- Removed self-contained header and footer (~40 lines)
- Responsive grid preserved: `grid-cols-1 lg:grid-cols-3`
- Uses `Container size="xl"` for consistent width
- Extracted `SidebarCard` sub-component to eliminate repeated card boilerplate
- Modal overlay uses CSS variables instead of hardcoded colors
- All buttons/inputs theme-aware via CSS variables

### `AdminDashboard.tsx` — Container + responsive table
- Wrapped in `Container size="lg"` (was `max-w-5xl mx-auto`)
- **Added mobile card layout** for forms table: `hidden sm:block` table + `sm:hidden` card list
- On mobile, form data displays as stacked cards instead of a cramped table
- All elements use CSS variable styles instead of hardcoded Tailwind colors

### `UserDashboard.tsx` — Semantic fix + Container
- Changed root from `<main>` to `<section>` (was nesting `<main>` inside PageLayout's `<main>`)
- Wrapped in `Container size="md"` (was `max-w-3xl mx-auto`)
- Form list items stack on mobile (`flex-col sm:flex-row`)
- All elements use CSS variable styles

### `App.tsx` — Simplified
- Now a single-line re-export of `Dashboard`
- The layout shell (Header + Footer) moved to `PageLayout`

---

## Container Width Standardisation

| Page | Before | After | Rationale |
|---|---|---|---|
| Header | `max-w-6xl` | `max-w-7xl` | Match widest content area |
| UserDashboard | `max-w-3xl` | Container `md` (768px) | Compact content |
| FormPage | `max-w-3xl` | Container `md` | Compact content |
| ResultPage | `max-w-6xl` | Container `md` | Card layout, doesn't need wide |
| WaitingPage | `max-w-6xl` | Container `md` | Single centred card |
| ThankYouPage | `max-w-6xl` | Container `md` | Single centred card |
| AdminDashboard | `max-w-5xl` | Container `lg` (1024px) | Table needs room |
| FormEditor | `max-w-5xl` | Container `lg` | Multi-card form |
| SummaryPage | `max-w-7xl` | Container `xl` (1280px) | Two-column grid |

---

## Responsive Improvements

1. **Consistent padding**: All pages now use `px-4 sm:px-6 lg:px-8` via Container
2. **Header**: User email hidden on mobile, fixed-height bar, clickable brand
3. **AdminDashboard table**: Becomes card list on mobile (`< sm` breakpoint)
4. **UserDashboard form list**: Items stack vertically on mobile
5. **FormEditor action bar**: Save/Delete buttons stack on mobile
6. **FormEditor breadcrumb**: Title and back link stack on mobile

---

## What Was NOT Changed (per constraints)

- No color values modified (migrated from hardcoded Tailwind to CSS variables for consistency, but no actual color changes)
- No font properties changed
- No animations, transitions, or micro-interactions added/modified
- Theme system (`ThemeProvider`, `ThemeToggle`) untouched
- `index.css` untouched
- `AuthContext.tsx`, `config.ts` untouched
- `Atlas.tsx` untouched (already well-structured)
