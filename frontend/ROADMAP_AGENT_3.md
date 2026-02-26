# Roadmap Agent 3 — Design Review Integration

> **Completed:** 2026-02-21
> **Phase:** 1.1 Design Review Integration + 1.3 Visual Consistency

---

## Summary

Read all three design review reports (Apple Design Specialist, Graphic Designer, UX Flow Expert), created a cross-review synthesis document (`DESIGN_SYNTHESIS.md`), and implemented the top 20 fixes.

## What Was Done

### Design Synthesis
Created `DESIGN_SYNTHESIS.md` with:
- **5 Critical Issues** all 3 reviewers agreed on
- **10 High-Priority Issues** 2 reviewers flagged
- **20 Quick Wins** prioritized by impact

### Fixes Implemented (20 total)

#### Token & Theme Fixes
1. **Synced `:root` CSS variables with ThemeProvider axiotic-light theme** — fixes flash of wrong theme on load
2. **Added `--warning` and `--warning-foreground` tokens** to all 3 themes (light, dark, Apple) for consistent warning colors
3. **Fixed font-family** — now uses system font stack (`-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Inter'`)
4. **Fixed body line-height** from 1.6 → 1.5 (tighter, more professional)
5. **Fixed placeholder opacity** from 0.7 → 0.85 (better contrast)
6. **Fixed background** — removed tinted gradient, now solid neutral `#f8fafc`
7. **Fixed border/input colors** — synced with ThemeProvider (`#e2e8f0` vs old `#d1d5db`/`#c4ccd8`)

#### Hardcoded Color Elimination (Theme-Adaptive)
8. **Replaced all `rgba(59, 130, 246, ...)` in CSS** with `color-mix(in srgb, var(--accent) N%, transparent)` — 14 instances
9. **Replaced all `#a855f7` (purple)** with `var(--accent)` across 7 component files
10. **Replaced all `#eab308` / `#f59e0b` / `#f97316` (warning/amber)** with `var(--warning)` across 8 components
11. **Replaced all `#16a34a` / `#22c55e` (green)** with `var(--success)` across 5 components
12. **Replaced `#ef4444` (red)** with `var(--destructive)` in DevilsAdvocate, StructuredSynthesis
13. **Fixed `#ffffff` in CrossMatrix/ConsensusHeatmap** to `var(--card)` for dark mode support
14. **Fixed confidence slider colors** in StructuredInput — now uses CSS variables, WCAG-safe in dark mode

#### Button & Card Interaction Fixes
15. **Fixed button hover pattern** — replaced Material-style `translateY(-1px) + box-shadow` with Apple-style `filter: brightness(0.92)` on both `.btn` and `.btn-interactive`
16. **Removed card hover from non-interactive cards** — only `.card-interactive` gets hover effects now

#### Component Fixes
17. **Added empty state to AdminDashboard** — shows icon, heading, description, and CTA when no forms exist
18. **Added empty state to UserDashboard** — shows guidance text instead of "No forms joined yet"
19. **Fixed error banner in AdminDashboard** — neutral background with accent retry button (was destructive red)
20. **Fixed FormPage error state** — replaced crude inline-styled "!" circle with Lucide AlertCircle, friendly error message

#### UI Polish
21. **Replaced emoji logo** (🎵) with SVG music note icon in Header and AuthLayout
22. **Replaced text chevron** (▾) with Lucide ChevronDown in PreviousSynthesisToggle
23. **Fixed Login/Register headings** — simplified to "Sign In" / "Create Account" with muted color
24. **Standardized card padding** in FormEditor — all sections now use `p-6` consistently
25. **Fixed 8px grid** in Header — py-3 → py-2, gap-3 → gap-2
26. **Fixed card-lg border radius** — from `calc(var(--radius) + 4px)` (12px) to `calc(var(--radius) * 2)` (16px), aligned to 8px grid
27. **Replaced onMouseEnter/Leave JS** with CSS `:hover` — Header buttons, admin table rows
28. **Fixed table headers** — removed uppercase tracking-wider, now sentence case

### Build Results
- ✅ Build successful (3.25s, zero errors)
- ✅ Server deployed on port 8766
- CSS reduced to 74.05 kB (gzip: 13.53 kB)

## What's Left (from synthesis)
- Summary page guided workflow (large effort — UX §F18)
- Breadcrumb navigation
- Unsaved changes warning
- Unified Header for SummaryPage
- Password requirements on registration
- Auto-save indicator for expert responses
