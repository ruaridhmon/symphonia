# Design Synthesis — Cross-Review Analysis

> **Generated:** 2026-02-21
> **Sources:** DESIGN_REVIEW_APPLE.md, DESIGN_REVIEW_GRAPHIC.md, DESIGN_REVIEW_UX.md
> **Method:** Cross-reference all three reviews, identify consensus issues

---

## Top 5 Critical Issues (All 3 Reviewers Agreed)

### 1. Hardcoded Colors Bypass Theme System
- **Apple:** §1.1, §1.2, §1.8 — wrong primary blue, hardcoded rgba values throughout
- **Graphic:** §1.3, §1.4 — extensive list of hardcoded colors in components that break in dark mode
- **UX:** Implicit in §F40 — inconsistent visual patterns across pages
- **Impact:** Dark mode broken, theme switching produces visual artifacts, colors don't adapt
- **Fix:** Replace all `rgba(37, 99, 235, ...)` and `rgba(59, 130, 246, ...)` with `color-mix(in srgb, var(--accent) N%, transparent)`

### 2. Missing Empty States Across the App
- **Apple:** §4.2 — "vast white void" when consultations list is empty
- **Graphic:** Implied in hierarchy analysis — no guidance for empty states
- **UX:** §F6, §F10, §F11 — critical first-time user blockers for both admin and expert
- **Impact:** First-time users hit dead ends with no guidance
- **Fix:** Add empty states with icon, heading, description, and CTA to AdminDashboard and UserDashboard

### 3. Error Handling Patterns Are Inconsistent
- **Apple:** §2.2, §4.1, §7.1 — error banners use wrong colors, raw technical errors exposed
- **Graphic:** Implied — destructive red used for non-destructive recovery actions
- **UX:** §F40 — some pages use inline banners, some full-page, some silent catch
- **Impact:** Users see jarring, inconsistent error experiences; technical jargon exposed
- **Fix:** Standardize error hierarchy (toast / inline banner / full-page), use accent blue for retry buttons

### 4. Visual Hierarchy Is Flat
- **Apple:** §1.4 — font weight hierarchy uses only 2 weights (700 and 400)
- **Graphic:** §2.1–2.3 — elements compete at same visual weight, especially on Summary page
- **UX:** §F18, §F22 — Summary workspace is overwhelming, sidebar actions equally weighted
- **Impact:** Users can't scan effectively, don't know where to focus
- **Fix:** Differentiate heading weights (h1: 700, h2-h4: 600), reduce body line-height, create visual weight tiers

### 5. Button Hover Uses Material Design Pattern (translateY + shadow)
- **Apple:** §8.1 — Apple buttons use brightness change, not elevation
- **Graphic:** §4.1 — card hover/elevation is wrong pattern
- **UX:** Implicit — interaction patterns should match platform expectations
- **Impact:** UI feels generic/SaaS rather than polished
- **Fix:** Replace `translateY(-1px) + box-shadow` hover with `filter: brightness(0.92)`

---

## Top 10 High-Priority Issues (2 Reviewers Flagged)

### 1. CSS `:root` vs ThemeProvider Token Desync
- **Apple + Graphic:** `:root` in index.css defines different values than ThemeProvider's axiotic-light theme
- **Impact:** Flash of incorrect theme on initial render
- **Fix:** Sync `:root` values with axiotic-light theme exactly

### 2. Icon System Split (Emoji + Lucide + Text Glyphs)
- **Apple §2.6 + Graphic §3.1:** Three icon systems used simultaneously
- **Fix:** Replace emoji icons with Lucide equivalents

### 3. Card Hover on Non-Interactive Cards
- **Apple §8.2 + Graphic §4.1:** Static cards (auth, form sections) get hover effects
- **Fix:** Only apply hover to `.card-interactive`

### 4. Background Uses Tinted Gradient
- **Apple §1.3 + Graphic §5.3:** Lavender-blue gradient is non-neutral
- **Fix:** Use solid neutral background for `:root`

### 5. Border Radius Inconsistency
- **Apple §1.5 + Graphic §4.2:** `.card-lg` at 12px isn't on 8px grid
- **Fix:** Normalize `.card-lg` to `calc(var(--radius) * 2)` = 16px

### 6. 8px Grid Violations (15+ instances)
- **Apple + Graphic §6.1:** Widespread use of `*-3` (12px) Tailwind classes
- **Fix:** Audit and snap all spacing to 8px multiples

### 7. Missing Dark Mode Tokens (warning, purple)
- **Graphic §1.3, §5.2:** Hardcoded colors for warning/purple variants break in dark mode
- **Fix:** Add `--warning`, `--warning-foreground`, `--purple`, `--purple-foreground` tokens

### 8. Duplicate Header Components
- **Graphic §8.1 + UX §F19:** SummaryHeader and Header are separate implementations
- **Fix:** Refactor into single configurable Header

### 9. Confidence Scale Colors Fail WCAG in Dark Mode
- **Graphic §5.2 + UX implicit:** `#166534` on `#0c1222` = 1.5:1 contrast ratio
- **Fix:** Use theme-aware confidence colors with adequate contrast

### 10. Table Headers Use Uppercase Tracking
- **Apple §4.3 + Graphic §2.2:** UPPERCASE TRACKING-WIDER is Bootstrap/Material convention
- **Fix:** Use sentence case, `text-xs font-medium`

---

## Quick Wins (< 30 minutes each)

1. **Sync `:root` with ThemeProvider axiotic-light** (~5 min) — fixes theme flash
2. **Fix button hover to brightness** (~10 min) — replace translateY with filter
3. **Remove card hover from non-interactive cards** (~5 min) — CSS change
4. **Fix body line-height from 1.6 to 1.5** (~2 min)
5. **Increase placeholder opacity from 0.7 to 0.85** (~2 min)
6. **Fix heading weight hierarchy (h2-h4 → 600)** (~5 min)
7. **Fix focus ring rgba to use color-mix** (~5 min)
8. **Add missing warning/purple tokens** (~15 min)
9. **Fix hardcoded colors in LoadingButton** (~5 min)
10. **Fix AuthLayout shadow to use CSS variable** (~5 min)
11. **Replace rgba(59,130,246) with color-mix in CSS** (~15 min)
12. **Add empty state to AdminDashboard** (~15 min)
13. **Fix error banner: neutral bg + accent retry button** (~10 min)
14. **Fix FormPage error icon and message** (~10 min)
15. **Fix table headers: remove uppercase/tracking** (~5 min)
16. **Fix 8px grid violations in Header (py-3 → py-4)** (~5 min)
17. **Standardize card-lg radius** (~2 min)
18. **Fix Login heading text** (~2 min)
19. **Fix Register heading text** (~2 min)
20. **Fix PreviousSynthesisToggle chevron to Lucide** (~5 min)

---

## Implementation Priority

| Phase | Items | Estimated Time | Impact |
|-------|-------|----------------|--------|
| 1 — Token fixes | Quick wins 1–7 | 30 min | High — affects every page |
| 2 — Component fixes | Quick wins 8–15 | 45 min | High — fixes broken patterns |
| 3 — Polish | Quick wins 16–20 | 20 min | Medium — refinement |

---

*End of synthesis.*
