# Converging Waves Design System — Update Log

**Date:** 2026-02-21  
**Theme:** Logo-compatible design language  
**Logo metaphor:** Many flowing lines converging to a single point (blue on white)

---

## Changes Made

### 1. Color System (Light Theme)
- **Background:** `#f8fafc` → `#ffffff` (crisp white, like the logo background)
- **Card:** `#ffffff` → `#f8faff` (barely blue-tinted white)
- **Card shadows:** Now use `rgba(37, 99, 235, ...)` blue-tinted shadows instead of pure black
- **Warning:** `#eab308` → `#d97706` (warmer amber)
- **Accent stays:** `#2563eb` royal blue — the logo color
- **Font family:** Inter prioritized first in stack

### 2. Color System (Dark Theme)
- **Background:** `#0c1222` → `#0a0f1e` (deeper navy, like logo dark variant)
- **Foreground:** `#e2e8f0` → `#f0f4ff` (slight blue tint on white text)
- **Card:** `#151f32` → `#0f172a` (navy card surface)
- **Muted/Border/Input:** Unified to `#1e293b` for consistency
- **Secondary:** `#1c2b44` → `#1e293b`

### 3. Typography
- Body `letter-spacing: -0.01em` — slightly tighter, matches logo's precision
- Headings `font-weight: 700`, `letter-spacing: -0.02em` — precise and weighted
- Inter font prioritized in all theme variants (light, dark, apple)

### 4. Component Refinements

**Cards:**
- `border-radius: 12px` (softer, flowing — matches logo curves)
- Blue-tinted hover shadow: `rgba(37, 99, 235, 0.12)`
- Hover border color: `rgba(37, 99, 235, 0.2)`

**Buttons (.btn-accent):**
- `border-radius: 8px`, `font-weight: 600`
- Hover: `translateY(-1px)` lift + blue glow shadow
- `letter-spacing: -0.01em` for precision

### 5. Logo Integration

**Header (Header.tsx):**
- Replaced music note SVG icon with inline converging waves SVG
- 5 flowing lines converging to center point + filled circle at convergence
- Uses `var(--accent)` for theme awareness
- Opacity gradient: 0.3 → 0.5 → 0.7 → 0.5 → 0.3

**Auth pages (AuthLayout.tsx):**
- Larger converging waves SVG (56px) on login/register
- 7 lines for more detail at larger size
- Wordmark updated: `font-semibold` with `-0.02em` tracking

### 6. Three-Layer Theme Sync
All three sync points updated for consistency:
- `index.css` — CSS custom property defaults
- `ThemeProvider.tsx` — runtime theme application
- `index.html` — zero-flash script (prevents theme flicker)
- `theme-color` meta tag: `#6366f1` → `#2563eb`

### 7. Logo File Integration
- `assets/logo/logo-mark-refined.png` → copied to `frontend/public/logo.png`
- Header uses `<img src="/logo.png" className="h-7" />` (28px)
- Auth page uses `<img src="/logo.png" className="h-14" />` (56px)

---

## Files Modified
- `frontend/src/index.css` — CSS variables, typography, card/button refinements
- `frontend/src/theme/ThemeProvider.tsx` — light/dark theme color definitions
- `frontend/index.html` — zero-flash theme script + theme-color meta
- `frontend/src/Header.tsx` — converging waves SVG logo in nav
- `frontend/src/layouts/AuthLayout.tsx` — converging waves SVG on auth pages

## Build Status
✅ Build passes (`npm run build`)  
✅ Server deployed on port 8766
