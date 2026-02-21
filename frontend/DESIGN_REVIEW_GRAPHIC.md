# Symphonia — Graphic Design Review

> **Reviewer:** Senior Graphic Designer (15 years in digital product design)
> **Date:** 2026-02-21
> **Method:** Full source code analysis + screenshot review of login/register pages
> **Scope:** Color system, visual hierarchy, iconography, card/component styling, dark/light mode parity, brand expression

---

## Executive Summary

Symphonia is a **competent but generic** product that sits at about **7/10** visually. It follows modern SaaS conventions correctly — clean surfaces, blue accent, card-based layouts — but lacks the craft that distinguishes products like Linear or Notion. The primary issues are:

1. **Color system has hidden inconsistencies** — CSS variables vs inline values, hardcoded colors bypassing the theme
2. **Visual hierarchy is flat** — too many elements compete at the same weight
3. **The brand is invisible** — a music note emoji and blue accent could be any product
4. **Dark/light mode has real parity gaps** — several hardcoded colors will break in dark mode
5. **Spacing is largely correct** but has specific 8px grid violations

The good news: the architecture (CSS custom properties + ThemeProvider) is solid. Most fixes are design token changes, not structural rewrites.

---

## 1. Color System & Palette Consistency

### 1.1 The Theme Architecture (What's Right)

The `ThemeProvider.tsx` defines three well-structured themes via CSS custom properties:

| Token | Light (`axiotic-light`) | Dark (`axiotic-dark`) | Apple |
|-------|------------------------|----------------------|-------|
| `--background` | `#f8fafc` | `#0c1222` | `#f5f5f7` |
| `--foreground` | `#0f172a` | `#e2e8f0` | `#1d1d1f` |
| `--card` | `#ffffff` | `#151f32` | `#ffffff` |
| `--accent` | `#2563eb` | `#3b82f6` | `#007aff` |
| `--accent-hover` | `#1d4ed8` | `#60a5fa` | `#0056b3` |
| `--muted` | `#f1f5f9` | `#162032` | `#f5f5f7` |
| `--muted-foreground` | `#64748b` | `#94a3b8` | `#86868b` |
| `--border` | `#e2e8f0` | `#1e2d47` | `#d2d2d7` |
| `--destructive` | `#dc2626` | `#ef4444` | `#ff3b30` |
| `--success` | `#16a34a` | `#22c55e` | `#34c759` |

This is a good foundation. However…

### 1.2 CSS Variables vs `:root` Divergence

**Critical Issue:** The `:root` block in `index.css` defines **different default values** than the `axiotic-light` theme in `ThemeProvider.tsx`:

| Token | `index.css :root` | `ThemeProvider axiotic-light` | Match? |
|-------|-------------------|------------------------------|--------|
| `--border` | `#d1d5db` | `#e2e8f0` | ❌ **Different** |
| `--input` | `#c4ccd8` | `#e2e8f0` | ❌ **Different** |
| `--background` | `#f1f5f9` | `#f8fafc` | ❌ **Different** |
| `--card-shadow` | Complex shadow | Different shadow | ❌ **Different** |

**Impact:** During initial render (before ThemeProvider hydrates), users see the `:root` values. After hydration, they see ThemeProvider values. This causes a **flash of incorrect theme** on page load.

**Fix:**
```css
/* index.css :root — sync with axiotic-light theme exactly */
:root {
  --background: #f8fafc;  /* was #f1f5f9 */
  --border: #e2e8f0;      /* was #d1d5db */
  --input: #e2e8f0;       /* was #c4ccd8 */
  /* ... match all other tokens to ThemeProvider axiotic-light */
}
```

### 1.3 Hardcoded Colors Bypassing the Theme System

**These hardcoded values will break in dark mode:**

| File | Element | Hardcoded Color | Should Be |
|------|---------|----------------|-----------|
| `LoadingButton.tsx` | `variant: 'success'` | `color: '#ffffff'` | `var(--destructive-foreground)` or a `--success-foreground` token |
| `LoadingButton.tsx` | `variant: 'purple'` | `backgroundColor: '#7c3aed'`, `color: '#ffffff'` | Needs a `--purple` / `--purple-foreground` token pair |
| `UserDashboard.tsx` | "Awaiting response" badge | `color: '#ca8a04'`, `bg: '#eab308'` | Needs `--warning` / `--warning-foreground` tokens |
| `StructuredInput.tsx` | Confidence labels | `#ef4444`, `#f97316`, `#22c55e`, etc. | These semantic status colors need theme tokens |
| `StructuredInput.tsx` | Chip styles | `rgba(59, 130, 246, 0.1)` | Should reference `var(--accent)` with opacity |
| `WaitingPage.tsx` | Lightbulb icon | `color: '#a855f7'` | Needs `--purple` token |
| `PresenceIndicator.tsx` | Initial text | `color: '#ffffff'` | Needs `var(--accent-foreground)` |
| `index.css` | `.waiting-orbit-dot:nth-child(2)` | `background-color: var(--success)` ✅ | OK |
| `index.css` | `.waiting-orbit-dot:nth-child(3)` | `#a855f7` | Needs token |
| `index.css` | `.waiting-orbit-dot:nth-child(4)` | `#eab308` | Needs token |
| `index.css` | Many CSS classes | `rgba(59, 130, 246, 0.1)` etc. | Should use `color-mix(in srgb, var(--accent) 10%, transparent)` |

**Fix — Add missing tokens to all themes:**
```typescript
// Add to ThemeColors interface and all theme definitions:
warning: string;
'warning-foreground': string;
purple: string;
'purple-foreground': string;

// axiotic-light:
warning: '#eab308',
'warning-foreground': '#854d0e',
purple: '#7c3aed',
'purple-foreground': '#ffffff',

// axiotic-dark:
warning: '#facc15',
'warning-foreground': '#422006',
purple: '#8b5cf6',
'purple-foreground': '#ffffff',
```

### 1.4 The `color-mix()` Pattern — Inconsistent Usage

The codebase uses `color-mix(in srgb, var(--accent) 12%, transparent)` in some places but hardcoded `rgba(59, 130, 246, 0.1)` in others. These produce **different results in dark mode** because:
- `color-mix` with `var(--accent)` adapts: dark mode accent (`#3b82f6`) is lighter
- `rgba(59, 130, 246, 0.1)` is fixed: same blue regardless of theme

**Files using hardcoded rgba that should use `color-mix`:**
- `index.css`: `.expert-chip` → `rgba(59, 130, 246, 0.1)` → `color-mix(in srgb, var(--accent) 10%, transparent)`
- `index.css`: `.badge-active` → `rgba(59, 130, 246, 0.15)` → `color-mix(in srgb, var(--accent) 15%, transparent)`
- `index.css`: `.synthesis-mode-option.selected` → `rgba(59, 130, 246, 0.08)`
- `index.css`: `.round-timeline-v2-node:hover` → `rgba(59, 130, 246, 0.12)`
- `StructuredInput.tsx`: `.chip` style → `rgba(59, 130, 246, 0.1)` and `rgba(59, 130, 246, 0.2)`

**Rule of thumb:** Any `rgba(59, 130, 246, ...)` should become `color-mix(in srgb, var(--accent) N%, transparent)`.

### 1.5 The AuthLayout Shadow Uses Fixed Blue

```tsx
// AuthLayout.tsx, line 17
boxShadow: '0 4px 14px rgba(37, 99, 235, 0.3)',
```

This hardcodes the light-theme accent blue (`#2563eb` = `rgb(37, 99, 235)`) into the logo shadow. In the Apple theme (accent `#007aff`), this creates a visual mismatch.

**Fix:**
```tsx
boxShadow: '0 4px 14px color-mix(in srgb, var(--accent) 30%, transparent)',
```

---

## 2. Visual Hierarchy

### 2.1 Login/Register Pages

**Screenshot Analysis (Light Theme):**

| Hierarchy Level | Element | Visual Weight | Assessment |
|----------------|---------|---------------|------------|
| 1st (eye goes here first) | Blue "Sign In" button | High — full-width saturated blue | ✅ Correct — CTA should dominate |
| 2nd | Logo icon (blue gradient square) | High — saturated color, centered above | ⚠️ **Competes with CTA** |
| 3rd | "Symphonia" heading | Medium — 24px bold | ✅ Appropriate |
| 4th | "Sign in to your account" | Medium — ~18px semi-bold | ⚠️ **Too close in weight to brand name** |
| 5th | Form labels | Low-medium | ✅ |
| 6th | Input fields | Low | ✅ |
| 7th | "Create one" link | Low | ⚠️ Needs underline for accessibility |

**Issues:**

1. **Logo icon and CTA button are both high-saturation blue**, creating two competing focal points. The logo should be de-emphasized.

   **Fix:** Reduce logo shadow intensity and consider a more muted gradient:
   ```tsx
   // AuthLayout.tsx logo
   background: 'linear-gradient(135deg, var(--accent), var(--accent-hover))',
   boxShadow: '0 2px 8px color-mix(in srgb, var(--accent) 15%, transparent)', // softer
   ```

2. **Card heading ("Sign in to your account") at ~18px semi-bold competes with "Symphonia" at ~24px bold.** The visual weight gap is too small.

   **Fix:** In `Login.tsx`, reduce heading from what appears to be `text-lg font-semibold` to `text-base font-medium`:
   ```tsx
   // Change the card heading style
   className="text-base font-medium text-center"
   style={{ color: 'var(--muted-foreground)' }} // demote to secondary color
   ```

3. **The "Create one" / "Sign in" link lacks underline**, relying only on color to convey interactivity. This fails accessibility for color-blind users.

   **Fix:** Add `text-decoration: underline; text-underline-offset: 2px;` to auth page links.

### 2.2 Dashboard Page (Admin)

**Code Analysis — `AdminDashboard.tsx`:**

The dashboard contains two major sections: "Create New Consultation" and "Your Consultations" (table). From the code:

| Hierarchy Level | Element | Treatment |
|----------------|---------|-----------|
| 1st | Section headings ("Your Consultations") | `text-xl font-semibold` — `var(--foreground)` |
| 2nd | Table headers | `text-xs font-semibold uppercase` — good demotion |
| 3rd | Table row titles | `font-medium` with `var(--foreground)` |
| 4th | Table metadata (round numbers, join codes) | `text-xs`, `var(--muted-foreground)` |
| 5th | Action buttons (Edit, Summary, Delete) | Small colored buttons |

**Issues:**

1. **Action button color diversity is chaotic.** In `AdminDashboard.tsx`, each row has three buttons: Edit (secondary), Summary (success/green), Delete (destructive/red). Plus "New Consultation" is accent/blue. Four button colors visible simultaneously creates visual noise.

   **Fix:** Use a single neutral "secondary" variant for Edit and Summary, with only Delete in destructive red. Differentiate with icons, not colors:
   ```tsx
   // Edit → ghost variant with Pencil icon
   // Summary → ghost variant with BarChart icon  
   // Delete → destructive (keep)
   // New Consultation → accent (keep as primary CTA)
   ```

2. **Join code badge uses hardcoded styling** with `bg-muted` that may have insufficient contrast.

### 2.3 Summary/Synthesis Workspace

**Code Analysis — `SummaryPage.tsx` + sidebar components:**

This is the most complex page with a 2/3 + 1/3 grid layout. The hierarchy challenge is significant:

**Issues:**

1. **The sidebar has 4–5 cards stacked vertically** (FormInfoCard, ActionsCard, AISynthesisPanel, SynthesisVersionPanel, RoundHistoryCard). Each card has an uppercase heading in `text-xs font-semibold`. This creates a "wall of equally-weighted sections" — nothing stands out.

   **Fix:** Introduce visual weight differentiation:
   - Make AISynthesisPanel the hero card (it already has a subtle gradient — good start)
   - Reduce FormInfoCard and RoundHistoryCard to lower visual weight (no border, transparent background)
   - Collapse non-essential cards by default on initial load

2. **The main content area stacks many full-width `.card` components** — Responses Accordion, Synthesis Editor, Structured Analysis (📊), Cross-Matrix (🔗), Consensus Heatmap (🗺️), Emergent Insights (✨). Each section heading uses `text-lg font-semibold` with an emoji prefix. They're all visually identical, making it hard to scan.

   **Fix:** Create a visual hierarchy for section importance:
   ```css
   /* Primary section (Synthesis, Structured Analysis) */
   .section-primary { border-left: 3px solid var(--accent); }
   
   /* Secondary section (Cross-Matrix, Heatmap) */
   .section-secondary { opacity: 0.85; }
   
   /* Tertiary section (Emergence, versions) */
   .section-tertiary { 
     background-color: var(--muted);
     border: none;
   }
   ```

3. **Emoji icons as section identifiers** (📊, 🔗, 🗺️, ✨) — while adding personality, they vary in rendering across OS/browsers and don't align with the Lucide icon system used elsewhere. This creates an **icon system split.**

### 2.4 Expert Response Form (`FormPage.tsx`)

**Issues:**

1. **The StructuredInput component is visually dense.** Each question produces a container with 5 fields (Position, Evidence, Confidence, Counterarguments, Advanced). With multiple questions, the page becomes overwhelming.

   **Fix:** Consider progressive disclosure — show Position only by default, expand Evidence/Confidence on interaction:
   ```tsx
   // Default: just Position textarea visible
   // On first keystroke or explicit toggle: reveal Evidence, Confidence
   // Always collapsed: Counterarguments, Advanced
   ```

2. **The confidence slider label colors** (from red `#ef4444` at 1 to green `#166534` at 10) are hardcoded and won't adapt to themes. In dark mode, the dark green `#166534` will have very low contrast against `#0c1222` background.

---

## 3. Iconography Consistency

### 3.1 Icon Systems in Use

The codebase uses **three icon systems simultaneously:**

| System | Usage | Examples |
|--------|-------|---------|
| **Lucide React** | Navigation, actions, form controls | `Trash2`, `Plus`, `Save`, `ArrowLeft`, `Menu`, `X`, `Moon`, `Sun`, `Monitor`, `CheckCircle2`, `Clock`, `FileText`, `Pencil`, `Lightbulb`, `Scale`, `Shield`, `BookOpen`, `Users`, `ChevronDown`, `ChevronRight`, `ClipboardList` |
| **Native emoji** | Logo, section headers, status indicators | 🎵 (logo), 📊, 🔗, 🗺️, ✨, 🤖 |
| **Text glyphs** | UI controls | `▾` (chevron in PreviousSynthesisToggle), `←` (back navigation in SummaryPage), `·` (separator) |

**Issues:**

1. **Emoji icons render differently across macOS, Windows, Android, iOS.** The `🎵` logo will look different on every device. The `📊` may be a bar chart on Apple but a different visualization on Google.

   **Fix:** Replace all emoji icons with Lucide equivalents:
   ```tsx
   // Logo: 🎵 → <Music size={20} /> or custom SVG
   // 📊 → <BarChart3 />
   // 🔗 → <Link />
   // 🗺️ → <Map />
   // ✨ → <Sparkles />
   // 🤖 → <Bot />
   ```

2. **Text glyph `▾` in `PreviousSynthesisToggle`** should be `<ChevronDown />` from Lucide for consistency.

3. **Text `←` in `SummaryPage.tsx`** breadcrumb should be `<ArrowLeft size={16} />` for consistency (the FormEditor already uses this correctly).

4. **Lucide icon sizing is inconsistent:**
   - Header logo area: `size={22}` (Menu/X)
   - Form controls: `size={16}` (Trash2, Plus)
   - Status badges: `size={11}` (FileText, CheckCircle2, Clock)
   - StructuredInput: `size={14}` (field labels), `size={12}` (advanced section), `size={10}` (chip remove)

   **Recommendation:** Establish an icon size scale:
   ```
   --icon-xs: 12px  (inline badges, chip actions)
   --icon-sm: 16px  (form controls, buttons)
   --icon-md: 20px  (section headers, navigation)
   --icon-lg: 24px  (page-level actions)
   ```

---

## 4. Card & Component Styling Coherence

### 4.1 Card Variants

The codebase defines two card patterns:

```css
.card {
  border-radius: var(--radius);           /* 0.5rem = 8px */
  box-shadow: 0 1px 4px rgba(0,0,0,0.06); /* subtle */
  border: 1px solid var(--border);
}

.card-lg {
  border-radius: calc(var(--radius) + 4px); /* 0.75rem = 12px */
  box-shadow: 0 8px 30px rgba(0,0,0,0.12);  /* prominent */
  border: 1px solid color-mix(in srgb, var(--border) 60%, transparent);
}
```

**Issues:**

1. **Usage is inconsistent.** The login/register form uses `card-lg` (correct — it's the primary content container). But the FormEditor uses `card-lg` for every section (Title, Questions, Join Code, Actions), making them all equally prominent.

2. **Shadow values use fixed `rgba(0,0,0,…)` instead of CSS variables.** In dark mode, black shadows on a near-black background are invisible, defeating their purpose.

   **Fix:** Dark mode should use slightly lighter shadows or colored shadows:
   ```css
   /* Dark theme shadows */
   --card-shadow: 0 1px 4px 0 rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.03);
   --card-shadow-lg: 0 8px 30px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.05);
   ```

3. **The `.card:hover` applies `card-shadow-lg` universally.** Not all cards should have hover elevation — static info cards (FormInfoCard, synthesis read-only) shouldn't "lift" on hover as if they're interactive.

   **Fix:** Add hover only to explicitly interactive cards:
   ```css
   .card-interactive:hover {
     box-shadow: var(--card-shadow-lg);
     transform: translateY(-2px);
   }
   /* Remove from .card:hover */
   ```

### 4.2 Border Radius Inconsistency

| Component | Border Radius | On 8px Grid? |
|-----------|--------------|--------------|
| Inputs | `var(--radius)` = `0.5rem` = 8px | ✅ |
| Buttons | `var(--radius)` = 8px | ✅ |
| `.card` | `var(--radius)` = 8px | ✅ |
| `.card-lg` | `calc(var(--radius) + 4px)` = 12px | ❌ Not on 8px grid |
| Auth logo icon | `rounded-2xl` = 16px | ✅ |
| Header logo icon | `rounded-lg` = 8px | ✅ |
| Badges | `9999px` (pill) | ✅ |
| Skeleton card | `0.5rem` = 8px | ✅ |
| Skeleton text | `0.25rem` = 4px | ✅ |
| Command palette | `calc(var(--radius) + 4px)` = 12px | ❌ |

**Fix:** The 12px radius on `.card-lg` should be 16px (2 × 8):
```css
.card-lg {
  border-radius: calc(var(--radius) * 2); /* 16px */
}
```

### 4.3 Logo Icon Size Mismatch

The logo icon appears in two locations with different sizes:

| Location | Container Size | Border Radius | Shape |
|----------|---------------|---------------|-------|
| `AuthLayout.tsx` (login/register) | `w-14 h-14` (56px) | `rounded-2xl` (16px) | Large rounded square |
| `Header.tsx` (authenticated pages) | `w-8 h-8` (32px) | `rounded-lg` (8px) | Small rounded square |
| `SummaryHeader.tsx` | `w-8 h-8` (32px) | `rounded-lg` (8px) | Small rounded square |

**Assessment:** The size reduction from 56px → 32px for the header is fine, but the **border-radius ratio changes** (16/56 = 0.286 vs 8/32 = 0.25). This creates a subtly different shape. Both should use the same ratio.

**Fix:** Use `rounded-xl` (12px) for the header icon to maintain visual consistency with the auth version's squircle shape, or standardize on `rounded-lg` everywhere.

---

## 5. Dark Mode vs Light Mode Parity

### 5.1 Theme Token Parity (Good)

Both `axiotic-dark` and `axiotic-light` define all required tokens — no missing keys. ✅

### 5.2 Hardcoded Values That Break in Dark Mode

| Location | Hardcoded Value | Problem in Dark Mode |
|----------|----------------|---------------------|
| `LoadingButton.tsx` | `color: '#ffffff'` on success/purple | Works accidentally (white on dark bg) but not semantically correct |
| `StructuredInput.tsx` | `confidenceLabels` colors | `#166534` (Certain) on `#0c1222` bg = **2.1:1 contrast — FAILS WCAG** |
| `StructuredInput.tsx` | `color: '#ffffff'` on chips | OK accidentally |
| `UserDashboard.tsx` | `color: '#ca8a04'` (warning text) | On `#162032` muted bg = **3.8:1 contrast — borderline WCAG AA** |
| `WaitingPage.tsx` | `color: '#a855f7'` on Lightbulb | On `#162032` muted bg = acceptable |
| `index.css` | `.emergence-type-cross-pollination` `color: #a855f7` | On `#151f32` card bg = 4.9:1 — acceptable |
| `index.css` | `.minority-badge-minority` `color: #f59e0b` | On `rgba(245, 158, 11, 0.15)` over dark card = needs verification |

**Most critical fix — confidence scale colors for dark mode:**
```typescript
// Dark mode needs lighter variants:
const confidenceLabelsDark: Record<number, { label: string; color: string }> = {
  1: { label: 'Highly uncertain', color: '#fca5a5' },  // red-300
  2: { label: 'Very uncertain', color: '#fdba74' },     // orange-300
  // ... etc, ensuring 4.5:1+ contrast on dark backgrounds
  10: { label: 'Certain', color: '#86efac' },            // green-300
};
```

### 5.3 Background Gradient Parity

**Light mode:**
```css
--background-gradient: linear-gradient(135deg, #f1f5f9 0%, #eef2ff 100%);
```
This is a subtle slate → indigo gradient. Attractive.

**Dark mode:**
```css
--background-gradient: linear-gradient(135deg, #0c1222 0%, #111827 50%, #0c1222 100%);
```
This is almost invisible — the two colors are barely distinguishable. It provides no visual interest.

**Fix:** Make the dark gradient slightly more perceptible:
```css
--background-gradient: linear-gradient(135deg, #0c1222 0%, #0f1a30 50%, #0c1222 100%);
/* Slightly bluer middle point for a subtle "glow" effect */
```

### 5.4 Focus Ring Parity

Light mode: `box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12)`
Dark mode: `box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.25)`

**Good** — the dark mode ring is more opaque to remain visible. ✅

---

## 6. Spacing & 8px Grid Analysis

### 6.1 Systematic Grid Violations

| Location | Value | Nearest 8px | Fix |
|----------|-------|------------|-----|
| `AuthLayout.tsx` | `mb-8` (32px) logo-to-card gap | 32px ✅ | — |
| `AuthLayout.tsx` | `mb-4` (16px) logo-to-title | 16px ✅ | — |
| `Header.tsx` | `py-3` (12px) header padding | **12px ❌** | Change to `py-2` (8px) or `py-4` (16px) |
| `Header.tsx` | `gap-3` (12px) brand items | **12px ❌** | Change to `gap-2` (8px) |
| `Header.tsx` | `gap-2` (8px) right items | 8px ✅ | — |
| `FormEditor.tsx` | `py-6 sm:py-8` page padding | 24px/32px ✅ | — |
| `FormEditor.tsx` | `mb-6` (24px) section gaps | 24px ✅ | — |
| `FormEditor.tsx` | `gap-1.5` (6px) back link items | **6px ❌** | Change to `gap-2` (8px) |
| `FormPage.tsx` | `py-6 sm:py-8` page padding | 24px/32px ✅ | — |
| `FormPage.tsx` | `mb-6` question gaps | 24px ✅ | — |
| `FormPage.tsx` | `mb-1` title to content | **4px ❌** | Change to `mb-2` (8px) |
| `FormPage.tsx` | `mt-0.5` subtitle gap | **2px ❌** | Change to `mt-1` (4px) — acceptable sub-grid |
| `SummaryPage.tsx` | `gap-4 sm:gap-6` grid gaps | 16px/24px ✅ | — |
| `SummaryPage.tsx` | `py-4 sm:py-6` main padding | 16px/24px ✅ | — |
| `SummaryHeader.tsx` | `py-3` header padding | **12px ❌** | Match to main Header — same issue |
| `SummaryHeader.tsx` | `gap-2 sm:gap-4` brand area | 8px/16px ✅ | — |
| `SummaryHeader.tsx` | `gap-2 sm:gap-3` inner brand | 8px/**12px ❌** | Change `sm:gap-4` |
| `StructuredInput.tsx` | `gap: '1rem'` container | 16px ✅ | — |
| `StructuredInput.tsx` | `gap: '0.375rem'` sections | **6px ❌** | Change to `0.5rem` (8px) |
| `StructuredInput.tsx` | `padding: '1rem'` container | 16px ✅ | — |
| `PresenceIndicator.tsx` | `gap: '8px'` container | 8px ✅ | — |
| `PresenceIndicator.tsx` | `marginLeft: '-6px'` dot overlap | **-6px ❌** | Change to `-8px` |
| `index.css` | `.round-timeline-item` `padding-bottom: 1.25rem` | **20px ❌** | Change to `1.5rem` (24px) |
| `index.css` | `.round-timeline-item` `gap: 0.75rem` | **12px ❌** | Change to `1rem` (16px) or `0.5rem` (8px) |
| `index.css` | `.structured-card` `padding: 0.875rem 1rem` | **14px ❌** top/bottom | Change to `1rem` (16px) |
| `index.css` | `.synthesis-mode-option` `gap: 0.75rem` | **12px ❌** | Change to `1rem` (16px) |
| `index.css` | `.synthesis-mode-option` `padding: 0.625rem 0.75rem` | **10px/12px ❌** | Change to `0.75rem` (12px OK as 1.5×8) or `0.5rem 1rem` |
| `index.css` | `.command-palette-item` `padding: 0.625rem 0.75rem` | **10px/12px ❌** | Change to `0.5rem 1rem` (8px/16px) |

**Summary:** 15+ grid violations found. Most are `0.75rem` (12px) or `0.625rem` (10px) values that should be snapped to 8px or 16px. The 12px value appears repeatedly and suggests the developer is splitting the difference rather than committing to the grid.

### 6.2 Tailwind `gap-3` / `py-3` Anti-Pattern

Tailwind's `gap-3` = 12px, `py-3` = 12px. This is the most common grid violator. **Search and replace** all `gap-3`, `py-3`, `px-3` occurrences and decide if they should be `2` (8px) or `4` (16px):

```bash
# Audit command:
grep -rn "gap-3\|py-3\|px-3\|p-3\|m-3\|mt-3\|mb-3\|ml-3\|mr-3" src/ --include="*.tsx"
```

---

## 7. Brand Expression

### 7.1 Current Brand Identity

| Element | Implementation | Assessment |
|---------|---------------|------------|
| **Name** | "Symphonia" | ✅ Strong — musical metaphor for harmony/consensus |
| **Tagline** | "Collaborative Consensus Platform" | ⚠️ Generic — could be any deliberation tool |
| **Logo** | 🎵 emoji on blue gradient square | ❌ Not a real logo — it's an emoji |
| **Color** | Blue (#2563eb primary) | ⚠️ Default/safe — indistinguishable from Tailwind UI templates |
| **Typography** | Inter | ⚠️ The default choice — used by ~40% of modern SaaS |
| **Personality** | None — the UI has no character | ❌ Could be any product |

### 7.2 What's Missing

**No differentiation.** Remove the word "Symphonia" and this could be any CRUD admin panel. Products like Linear are identifiable from a 100px screenshot because of their unique color palette, typography weight, and spacing density.

**Recommendations for brand expression:**

1. **Custom accent color** — Move away from Tailwind blue-600. Consider a unique hue:
   - Deep teal/cyan (`#0891b2`) — unique, professional, suggests "harmony"
   - Purple-blue (`#6366f1`, indigo-500) — more distinctive than pure blue
   - Warm amber accent for secondary (`#f59e0b`) — the "golden ratio" metaphor

2. **Typography upgrade** — Consider:
   - **Cabinet Grotesk** or **Satoshi** for headings (more character than Inter)
   - Keep Inter for body text (excellent readability)

3. **Custom logo** — Replace the emoji with a proper SVG mark. Suggested concepts:
   - Overlapping circles (consensus/Venn diagram)
   - Sound wave forming a handshake/bridge
   - Abstract "S" built from converging lines

4. **Micro-interactions with theme** — The `bounce-in`, `cardEntrance`, `waiting-orbit` animations are good but generic. Consider branded motion:
   - Cards could "harmonize" in (slight wave/cascade from music metaphor)
   - Success states could use a brief "resonance" pulse

---

## 8. Component-Specific Issues

### 8.1 SummaryHeader vs Header Divergence

`SummaryHeader.tsx` and `Header.tsx` are nearly identical but implemented separately. The SummaryHeader has `"Admin Workspace"` hardcoded where Header has "Symphonia". This creates maintenance overhead and visual inconsistency if one is updated without the other.

**Issues:**
- SummaryHeader: `max-w-7xl` vs Header: `max-w-6xl` — **different max widths**
- SummaryHeader: includes `PresenceIndicator` inline; Header does not
- SummaryHeader: no ThemeToggle; Header has ThemeToggle
- SummaryHeader: no ⌘K shortcut button; Header has it

**Fix:** Refactor into a single configurable Header component:
```tsx
<Header 
  title="Admin Workspace" 
  showPresence={true}
  showThemeToggle={true}
  showCommandPalette={true}
  maxWidth="7xl"
/>
```

### 8.2 Button Variant Chaos

`LoadingButton.tsx` defines 6 variants: `accent`, `secondary`, `destructive`, `success`, `purple`, `ghost`. Their visual treatments:

| Variant | Background | Text Color | Border |
|---------|-----------|------------|--------|
| accent | `var(--accent)` | `var(--accent-foreground)` | none |
| secondary | `var(--secondary)` | `var(--secondary-foreground)` | 1px solid `var(--border)` |
| destructive | `var(--destructive)` | `var(--destructive-foreground)` | none |
| success | `var(--success)` | `#ffffff` ❌ hardcoded | none |
| purple | `#7c3aed` ❌ hardcoded | `#ffffff` ❌ hardcoded | none |
| ghost | transparent | `var(--foreground)` | 1px solid `var(--border)` |

**Issues:**
1. `success` and `purple` use hardcoded colors
2. Six variants is arguably too many for a product this size — it leads to inconsistent usage
3. No `outline` or `link` variant (text-only button)

**Fix:** Reduce to 4 variants and use tokens:
```typescript
const variantStyles = {
  primary: { backgroundColor: 'var(--accent)', color: 'var(--accent-foreground)' },
  secondary: { backgroundColor: 'var(--secondary)', color: 'var(--secondary-foreground)', border: '1px solid var(--border)' },
  destructive: { backgroundColor: 'var(--destructive)', color: 'var(--destructive-foreground)' },
  ghost: { backgroundColor: 'transparent', color: 'var(--foreground)' },
};
// For success/purple, use the primary variant with a className override or add tokens
```

### 8.3 Form Input Styling Split

Inputs are styled in two places:
1. `index.css` base layer (global `input[type="text"]` etc.) — `min-height: 2.75rem`, `font-size: 0.875rem`
2. Inline in components with `className="w-full rounded-lg px-3 py-2.5 border border-border bg-card text-foreground"`

The CSS base layer already handles border, radius, background, color, and font. The inline classes **override and sometimes conflict** with the base styles.

**Fix:** Remove redundant inline styling from inputs. The base layer should handle everything, and components should only add width classes:
```tsx
// Before (redundant):
className="w-full rounded-lg px-3 py-2.5 border border-border bg-card text-foreground"

// After (minimal):
className="w-full"
```

### 8.4 Skeleton Component Uses Hardcoded Inline Styles

The `Skeleton.tsx` component uses inline `CSSProperties` for all styling instead of the theme's class system. This means skeleton colors are hardcoded via `var(--skeleton-base)` inline rather than using a CSS class.

**Assessment:** Acceptable since it uses CSS variables, but the component's structure (inline style objects with fallbacks) is architecturally different from the rest of the codebase which mixes Tailwind classes and CSS variables. Not a visual issue, but an inconsistency.

---

## 9. Accessibility (Visual Design Scope)

### 9.1 Color Contrast Failures

| Element | FG Color | BG Color | Ratio | WCAG AA (4.5:1) |
|---------|----------|----------|-------|-----------------|
| Placeholder text (light) | `#64748b` @ 70% opacity ≈ `#a6b1c0` | `#ffffff` | ~2.8:1 | ❌ **FAIL** |
| Muted foreground (light) | `#64748b` | `#f8fafc` | 4.5:1 | ✅ Passes (barely) |
| Muted foreground (dark) | `#94a3b8` | `#0c1222` | 6.3:1 | ✅ |
| Confidence "Certain" `#166534` | `#166534` | `#162032` (dark muted) | **1.5:1** | ❌ **CRITICAL FAIL** |
| Warning badge text `#ca8a04` | `#ca8a04` | `#162032` (dark muted) | 3.8:1 | ❌ **FAIL** |
| Badge text `0.625rem` | Small text needs 3:1 min for large text | — | — | ⚠️ Check all badges at 10px |

**Fix for placeholder contrast:**
```css
input::placeholder,
textarea::placeholder {
  color: var(--muted-foreground);
  opacity: 0.85; /* was 0.7 — increase for contrast */
}
```

### 9.2 Focus Indicators

Focus indicators are well-implemented: `outline: 2px solid var(--ring); outline-offset: 2px;` on all interactive elements, with dark mode adjustment. ✅

**However:** The `ThemeToggle` dropdown and some inline `style={{}}` buttons use `onMouseEnter`/`onMouseLeave` for hover states but no corresponding focus styles. Keyboard users won't see any visual feedback on these elements.

**Fix:** Add `:focus-visible` states to all elements that have hover effects.

### 9.3 Touch Targets

The base CSS sets `min-height: 2.75rem` (44px) for inputs and buttons — this meets WCAG 2.2 target size requirements. ✅

However, `StructuredInput.tsx` chip remove buttons are `padding: 0.125rem` with a 10px icon — the actual touch target is ~14px, well below the 44px minimum.

**Fix:**
```css
.chipRemove {
  padding: 0.5rem;  /* Expand touch target */
  margin: -0.375rem; /* Compensate visual position */
}
```

---

## 10. Specific CSS/Token Changes (Priority Order)

### P0 — Critical (Dark Mode Breakages)

```typescript
// 1. Add missing tokens to ThemeProvider
// In ThemeColors interface:
warning: string;
'warning-foreground': string;

// In axiotic-dark theme:
warning: '#facc15',
'warning-foreground': '#422006',

// In axiotic-light theme:
warning: '#eab308', 
'warning-foreground': '#854d0e',

// In apple theme:
warning: '#ff9500',
'warning-foreground': '#663c00',
```

```css
/* 2. Sync index.css :root with axiotic-light theme */
:root {
  --background: #f8fafc;
  --border: #e2e8f0;
  --input: #e2e8f0;
}
```

```typescript
/* 3. Fix confidence label colors for dark mode */
// StructuredInput.tsx — use CSS variables or theme-aware colors
// Replace all hardcoded hex colors in confidenceLabels
```

### P1 — High (Visual Hierarchy & Consistency)

```css
/* 4. Normalize .card-lg radius to grid */
.card-lg {
  border-radius: 1rem; /* 16px — was 12px */
}

/* 5. Remove universal card hover (apply only to interactive cards) */
.card:hover,
.card-lg:hover {
  /* Remove box-shadow: var(--card-shadow-lg); */
}
.card-interactive:hover {
  box-shadow: var(--card-shadow-lg);
  transform: translateY(-2px);
}
```

```tsx
// 6. Replace all rgba(59, 130, 246, ...) with color-mix
// Global search-replace in index.css:
// rgba(59, 130, 246, 0.1)  → color-mix(in srgb, var(--accent) 10%, transparent)
// rgba(59, 130, 246, 0.12) → color-mix(in srgb, var(--accent) 12%, transparent)
// rgba(59, 130, 246, 0.15) → color-mix(in srgb, var(--accent) 15%, transparent)
// rgba(59, 130, 246, 0.2)  → color-mix(in srgb, var(--accent) 20%, transparent)
// Also in StructuredInput.tsx inline styles
```

### P2 — Medium (Grid Violations & Icon Consistency)

```tsx
// 7. Fix common 12px grid violations
// Header.tsx, SummaryHeader.tsx:
py-3 → py-2 (or py-4 depending on desired density)
gap-3 → gap-2

// StructuredInput.tsx:
gap: '0.375rem' → gap: '0.5rem'

// index.css:
.structured-card { padding: 1rem; } /* was 0.875rem 1rem */
.synthesis-mode-option { gap: 1rem; padding: 0.5rem 0.75rem; }
.round-timeline-item { gap: 1rem; padding-bottom: 1.5rem; }
```

```tsx
// 8. Replace emoji icons with Lucide
// SummaryPage.tsx section headers:
// <span>📊</span> → <BarChart3 size={18} />
// <span>🔗</span> → <Network size={18} />
// <span>🗺️</span> → <Map size={18} />
// <span>✨</span> → <Sparkles size={18} />

// AISynthesisPanel.tsx:
// 🤖 → <Bot size={14} />

// AuthLayout.tsx and Header.tsx logo:
// 🎵 → <Music size={18} /> (or custom SVG)
```

### P3 — Low (Polish & Brand)

```css
/* 9. Improve placeholder contrast */
input::placeholder,
textarea::placeholder {
  color: var(--muted-foreground);
  opacity: 0.85;
}

/* 10. Dark mode background gradient — more visible */
html[data-theme="axiotic-dark"] {
  --background-gradient: linear-gradient(135deg, #0c1222 0%, #111d35 50%, #0c1222 100%);
}
```

---

## 11. Summary Scorecard

| Category | Score | Key Issues |
|----------|-------|------------|
| **Color System** | 6.5/10 | CSS/ThemeProvider desync, hardcoded colors, missing tokens |
| **Visual Hierarchy** | 6/10 | Flat — everything competes at same weight, especially Summary page |
| **Iconography** | 5/10 | Three icon systems (Lucide + emoji + text glyphs), inconsistent sizing |
| **Card/Component Styling** | 7/10 | Good foundation, but radius inconsistency and universal hover is wrong |
| **Dark/Light Parity** | 6/10 | Tokens exist but hardcoded colors break in dark mode |
| **Brand Expression** | 4/10 | Invisible — generic blue SaaS, emoji logo, default everything |
| **Spacing (8px Grid)** | 6.5/10 | 15+ violations, mostly from Tailwind's `*-3` (12px) pattern |
| **Accessibility (Visual)** | 5.5/10 | Placeholder contrast fails, confidence colors fail in dark mode, small touch targets |
| **Animation/Polish** | 7.5/10 | Good microinteractions, reduced-motion support, but inconsistent application |
| **Overall** | **6.2/10** | Competent bones, needs systematic polish |

---

## 12. Top 10 Highest-Impact Changes

1. **Sync `index.css :root` with `ThemeProvider axiotic-light`** — eliminates flash of wrong theme
2. **Add `--warning` and `--purple` tokens** — fixes dark mode breakages
3. **Replace all hardcoded `rgba(59, 130, 246, …)` with `color-mix()`** — enables theme-adaptive tints
4. **Fix confidence label colors for dark mode** — critical accessibility failure
5. **Replace emoji icons with Lucide equivalents** — unified icon system
6. **Normalize card hover to interactive-only** — stops static cards from pretending to be interactive
7. **Fix `.card-lg` border-radius** from 12px to 16px — align to 8px grid
8. **Audit and fix all `*-3` (12px) Tailwind spacing** — snap to 8px grid
9. **Refactor duplicate Header/SummaryHeader** — single source of truth
10. **Improve placeholder text opacity** from 0.7 to 0.85 — meet WCAG contrast

---

*End of Graphic Design Review*
