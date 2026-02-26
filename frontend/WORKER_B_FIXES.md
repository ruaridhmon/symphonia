# Worker B Analysis: Forms Display & Markdown Rendering

## Investigation Date: 2026-02-21

---

## 1. Forms Display Issue — Root Cause Analysis

### Problem
Father can't see existing forms on the admin dashboard.

### Investigation

**Backend is healthy:**
- `GET /forms` with valid admin token returns all 10+ forms correctly
- Database has forms with proper data (verified via SQLite)
- Auth flow works: login returns JWT, `/forms` accepts it
- Route ordering is correct: API routes registered before SPA catch-all

**The bug is in `AdminDashboard.tsx` — silent error swallowing:**

```typescript
// BEFORE (broken): No HTTP status checking
.then(r => r.json())
.then(d => {
  setForms(Array.isArray(d) ? d : []);  // Error objects aren't arrays → sets empty
  setLoading(false);
})
```

When the backend returns an error (401 expired token, 403 not admin, etc.):
1. `r.json()` happily parses `{"detail":"Not authenticated"}`
2. `Array.isArray({"detail":"..."})` → `false`
3. `setForms([])` — forms set to empty array
4. UI shows empty dashboard with no error message
5. User thinks there are no forms — no indication anything went wrong

**JWT tokens expire after 60 minutes** (`ACCESS_TOKEN_EXPIRE_MINUTES = 60` in auth.py). After that, the stored token in localStorage becomes invalid but the user appears "logged in". Every API call silently fails.

### Fix Applied: `AdminDashboard.tsx`

1. Added `r.ok` check before parsing JSON response
2. Added `error` state with descriptive messages:
   - 401 → "Session expired. Please log in again."
   - 403 → "Admin access required to view forms."
   - Other → "Failed to load forms (HTTP {status})"
3. Added visible error banner with **Retry** button
4. Extracted `fetchForms()` as reusable function for retry

---

## 2. Markdown Rendering — Root Cause Analysis

### Problem
Markdown content in synthesis views may render as raw text.

### Investigation

**Two distinct issues found:**

#### Issue A: HTML-wrapped markdown from TipTap editor (CRITICAL)

The synthesis workflow:
1. Admin clicks "Generate Summary" → LLM returns markdown with proper newlines
2. `editor.commands.setContent(data.summary)` → TipTap wraps in `<p>` tags, **strips all newlines**
3. `saveSynthesis()` calls `editor.getHTML()` → returns `<p># Heading ## Sub - item1 - item2</p>`
4. This flattened content is stored in the database
5. `MarkdownRenderer` detects `<p>` → treats as HTML → `dangerouslySetInnerHTML`
6. Markdown syntax (`#`, `**`, `-`) rendered as literal text

**Verified in database:** Round 10's synthesis is 5,154 chars of markdown wrapped in a single `<p>` tag with ZERO newlines. The `#` headings, `**bold**` markers, and `- ` list items are all there but flattened into one paragraph.

#### Issue B: Missing CSS for raw HTML elements

When `dangerouslySetInnerHTML` renders committee synthesis HTML (e.g., `<h3>Agreements</h3><p><strong>claim</strong>...`), the HTML elements don't have `.md-h3`, `.md-p` etc. class names. The CSS rules `.markdown-body .md-h3 { ... }` don't match. Result: default browser styles instead of themed styling.

### Fixes Applied

#### `MarkdownRenderer.tsx` — Smart content preprocessing

Added `preprocessContent()` function that:
1. Detects complex HTML (div, section, table, thead) → passes through as-is
2. Detects markdown syntax (`#`, `**`, `-`, `|`) trapped inside `<p>` tags
3. Strips `<p>` wrappers, converts `<br>` to newlines
4. Recovers line breaks before markdown block elements (headings, list items, table rows)
5. Returns `{ text, forceMarkdown }` to force ReactMarkdown rendering when markdown is detected

This handles:
- Pure markdown → ReactMarkdown ✓
- Pure HTML → dangerouslySetInnerHTML ✓
- Complex structured HTML (committee synthesis) → dangerouslySetInnerHTML ✓
- **HTML-wrapped markdown (TipTap)** → preprocessed → ReactMarkdown ✓

#### `index.css` — Fallback styles for raw HTML elements

Added `:not(.md-*)` selectors for all standard HTML elements within `.markdown-body`:
- `h1` through `h4`, `p`, `ul`, `ol`, `li`, `strong`, `em`, `a`, `table`, `th`, `td`
- These match raw HTML from `dangerouslySetInnerHTML` while not conflicting with ReactMarkdown's custom-classed elements

---

## 3. Architecture Note (Not Fixed — Requires Discussion)

The root cause of Issue 2A is **TipTap being used as both a markdown display and an HTML editor**. When the LLM generates markdown and it's fed to TipTap via `setContent()`, TipTap interprets it as text and wraps it in `<p>` tags.

**Proper fix would be one of:**
- Store raw markdown separately from TipTap HTML (add `synthesis_markdown` column)
- Use a markdown-aware TipTap extension (e.g., `tiptap-markdown`)
- Convert markdown → HTML before feeding to TipTap (via marked/showdown)

The MarkdownRenderer preprocessing is a robust workaround that handles existing corrupted data and future instances, but the TipTap pipeline should eventually be addressed.

---

## 4. Files Modified

| File | Change | Lines |
|------|--------|-------|
| `src/AdminDashboard.tsx` | Error handling for /forms fetch, error banner UI, retry button | ~30 |
| `src/components/MarkdownRenderer.tsx` | Smart preprocessing for HTML-wrapped markdown, extracted shared components | ~80 |
| `src/index.css` | Fallback CSS for raw HTML elements in `.markdown-body` | ~70 |

## 5. Build Verification

```
✓ 2179 modules transformed
✓ built in 2.96s (no errors)
```

## 6. Additional Observations

- `UserDashboard.tsx` has the same error-swallowing pattern (no `r.ok` check on `/my_forms` fetch)
- The `WaitingPage.tsx` WebSocket URL construction `new URL(API_BASE_URL)` will throw if `API_BASE_URL` is empty string — but this is only reached on the waiting page, not the dashboard
- Token expiry (60min) is short for a working session; consider refresh token flow or longer expiry
