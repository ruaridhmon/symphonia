# AdminAnalytics Redesign Brief

## The Problem
The analytics dashboard "looks like crap" (verbatim from product owner). It's a 451-line Recharts component embedded as a collapsible section in the Admin Dashboard. Issues identified:

1. **Charts use hardcoded hex colors** that don't match the design system — `--chart-2`, `--chart-3` etc. don't exist as CSS vars
2. **Pie chart labels overlap** — `labelLine={false}` with inline labels causes collisions on small data sets
3. **Stat cards are bland** — plain white boxes with big numbers, no visual hierarchy or context
4. **Grid layout is rigid** — 2-column always, doesn't breathe
5. **No clear section separation** — charts are dumped in a grid without story
6. **Empty state "crap"** — when no data, just shows "No data yet" text with nothing else
7. **Convergence trend chart** has a raw `<select>` dropdown with no styling
8. **Activity timeline** X-axis gets crowded with 30 days of MM-DD labels (every 4th = still messy)
9. **Overall vibe**: it looks like a first-pass dashboard from 2018, not a polished research platform

## Design System
- **Accent**: `#2563eb` (blue) — primary action color
- **Background**: `#ffffff` / `#f8faff` (cards, slightly blue-tinted)
- **Foreground**: `#0f172a` (deep navy)
- **Muted foreground**: `#64748b`
- **Border**: light gray
- **Font**: Inter
- **Success**: `#15803d`, **Destructive**: `#dc2626`, **Warning**: `#b45309`
- Recharts needs concrete hex colors — design system vars don't work inside SVG

## What to Build
Rewrite `AdminAnalytics.tsx` to be visually excellent:

- Modern stat cards with subtle trend indicators or icons
- Clean, readable charts with a consistent 5-color palette derived from the design system
- Proper empty state with illustration-level treatment
- Responsive layout that breathes (don't overcrowd)
- The convergence form selector should be a styled tab or pill switcher, not a `<select>`
- Activity timeline: use weekly tick marks instead of every-4th-day
- Pie chart: replace inline labels with a proper legend below the chart
- Section headings that give the dashboard a narrative flow
- Keep all data types and API call exactly the same — only the presentation layer changes
