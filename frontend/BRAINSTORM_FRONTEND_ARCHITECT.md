# Frontend Architecture Brainstorm — Symphonia

> **Perspective:** Senior Frontend Architect  
> **Date:** 2026-02-21  
> **Scope:** Technical architecture, patterns, performance, scalability  
> **Goal:** Make Symphonia production-ready for UK Government deployment

---

## 1. Current Tech Debt — Honest Assessment

### 1.1 The SummaryPage Monolith (~560 lines, 20+ state variables)

`SummaryPage.tsx` is the most critical architectural problem. It's a god component that:

- **Owns 20+ `useState` hooks** — `form`, `rounds`, `activeRound`, `selectedRound`, `loading`, `responsesOpen`, `responsesHTML`, `structuredRounds`, `nextRoundQuestions`, `hasSavedSynthesis`, `selectedModel`, `isGenerating`, `synthesisStage`, `synthesisStep`, `synthesisTotalSteps`, `synthesisMode`, `expertLabelPreset`, `email`, `responsesOpen` — all in one component
- **Makes 5+ different API calls** directly via `fetch()` with inline headers construction
- **Contains business logic** (round management, synthesis generation, response loading, export)
- **Renders a modal via `createPortal`** with its own nested data-fetching
- **Has dual data representations** — `responsesHTML` (rendered HTML string) AND `structuredRounds` (typed objects) for the same data
- **Console.log statements everywhere** — 50+ `console.log` calls suggest this was debugged under pressure and never cleaned up

**Verdict:** This component needs to be decomposed into 5-6 smaller components + a custom hook for state management. A single re-render here cascades through the entire admin workspace.

### 1.2 No API Layer — Raw `fetch()` Everywhere

Every page component makes its own `fetch()` calls with manually constructed headers:

```typescript
// This pattern appears in SummaryPage, FormPage, ResultPage, WaitingPage,
// AdminDashboard, UserDashboard, Atlas, CommentThread, ResponseEditor...
const token = localStorage.getItem('access_token');
const res = await fetch(`${API_BASE_URL}/some/endpoint`, {
  headers: { Authorization: `Bearer ${token}` }
});
const data = await res.json();
```

**Problems:**
- Token retrieval is duplicated in every component (sometimes via `localStorage`, sometimes via `useMemo`)
- No centralized error handling — each component has its own `try/catch` with `console.error`
- No request deduplication — multiple components can fetch the same data simultaneously
- No retry logic — network failures silently fail
- No response type validation — `any` types everywhere after `.json()`
- `AuthContext` exists but most components bypass it and read `localStorage` directly

### 1.3 Dual Auth Patterns (AuthContext vs. Direct localStorage)

`AuthContext.tsx` provides `useAuth()` with `token`, `user`, `isAdmin`, `login`, `logout`. But:
- `SummaryPage` reads `localStorage.getItem('access_token')` directly via `useMemo`
- `FormPage` reads `localStorage.getItem('access_token')` and `localStorage.getItem('email')` directly
- `ResultPage` reads `localStorage.getItem('access_token')` directly
- `WaitingPage` reads `localStorage.getItem('access_token')` directly
- Only `Dashboard`, `PrivateRoute`, and `Login` actually use `useAuth()`

This means half the app bypasses the auth context entirely. If you ever need to change auth (e.g., move to httpOnly cookies for government security requirements), you'd need to touch every file.

### 1.4 WebSocket Fragmentation

Three different WebSocket connection patterns exist:
1. **`usePresence` hook** — Well-structured, reconnects on failure, heartbeat interval
2. **`WaitingPage`** — Inline WebSocket in `useEffect`, no reconnect, no cleanup return value used properly
3. **`ResultPage`** — Inline WebSocket in a separate `useEffect`, no reconnect, manual URL construction

The WaitingPage WebSocket setup is particularly buggy — the cleanup function is created inside an async function but the async function's return value is never used by the effect cleanup:

```typescript
useEffect(() => {
  const fetchMeAndCheckSummary = async () => {
    // ...
    const ws = new WebSocket(wsUrl);
    // ...
    return () => { ws.close(); }; // ← This return value is LOST
  };
  fetchMeAndCheckSummary(); // ← The returned cleanup is never used
}, [navigate]);
```

This means the WebSocket connection is **never cleaned up** on unmount. Memory leak in production.

### 1.5 Type Safety Gaps

- `AuthContext`: `user: any` — explicit any for the user object
- `SummaryPage`: `synthesis_json?: any` on the Round type
- `FormPage`: No typed API response interfaces
- `config.ts`: `API_BASE_URL` could be `undefined` at runtime (no fallback)
- Questions are typed inconsistently: sometimes `string[]`, sometimes objects with `{id, type, label, required, options?}`
- The Atlas seed data uses a completely different question format than the rest of the app

### 1.6 Testing: Nearly Zero

- **Zero unit tests** for any component
- **Zero integration tests** for hooks
- **One E2E spec** (`e2e-journey.test.ts`) that's more of a documentation file — it even says "NOTE: This is a TypeScript specification for E2E testing" and points to a bash script instead
- **No test runner configured** — vitest is not in `devDependencies`, no test scripts in `package.json`
- **No CI/CD pipeline** visible
- **No Storybook** for component development/testing

For UK government deployment, this is a non-starter. GDS (Government Digital Service) requires testing at all levels.

### 1.7 Console Log Pollution

`SummaryPage` alone has **50+ console.log statements** with `[SummaryPage]` prefixes. These are debug artifacts, not structured logging. In production, they'd leak internal state to anyone opening DevTools — a security concern for government use.

### 1.8 Inline Styles Mixed with Tailwind

The codebase uses Tailwind CSS classes (`className="text-sm text-muted-foreground"`) but also has extensive inline styles (`style={{ backgroundColor: 'var(--muted)' }}`), particularly in `ErrorBoundary` and the response modal. This dual approach makes theming harder and creates specificity conflicts.

---

## 2. Architecture Improvements

### 2.1 State Management: From Ad-Hoc to Structured

**Current state:** Every page manages its own state via `useState`. No shared state beyond `AuthContext`. Data is re-fetched on every navigation.

**Recommended approach — React Query (TanStack Query) + Zustand:**

```
┌─────────────────────────────────────────────────┐
│  Zustand Store (minimal)                         │
│  - Auth state (token, user, isAdmin)            │
│  - UI preferences (theme, sidebar collapsed)    │
│  - WebSocket connection status                  │
└─────────────────────────────────────────────────┘
        │
┌─────────────────────────────────────────────────┐
│  TanStack Query (server state)                   │
│  - Forms list: useQuery(['forms'])              │
│  - Form detail: useQuery(['form', id])          │
│  - Rounds: useQuery(['rounds', formId])         │
│  - Responses: useQuery(['responses', formId])   │
│  - Synthesis: useMutation + invalidation        │
│  - Comments: useQuery(['comments', roundId])    │
└─────────────────────────────────────────────────┘
        │
┌─────────────────────────────────────────────────┐
│  Components (thin, presentational)               │
│  - Receive data via hooks                       │
│  - Dispatch mutations                           │
│  - No direct fetch() calls                      │
└─────────────────────────────────────────────────┘
```

**Why TanStack Query specifically:**
- Automatic caching + cache invalidation
- Background refetching (stale-while-revalidate)
- Request deduplication
- Optimistic updates built-in
- Loading/error states for free
- Devtools for debugging
- Already the React ecosystem standard

**Why NOT Redux or Redux Toolkit:** Overkill for this app's complexity. Zustand for client state + TanStack Query for server state is the modern pattern that matches Symphonia's needs.

### 2.2 API Layer Abstraction

Create a typed API client that all components use:

```
frontend/src/
├── api/
│   ├── client.ts          # Axios/fetch wrapper with interceptors
│   ├── auth.ts            # login, register, me
│   ├── forms.ts           # CRUD + unlock + expert labels
│   ├── rounds.ts          # active_round, next_round, rounds list
│   ├── responses.ts       # submit, edit, force-edit, archived
│   ├── synthesis.ts       # generate, committee, push_summary
│   ├── comments.ts        # CRUD for synthesis comments
│   ├── follow-ups.ts      # CRUD for follow-up questions
│   └── types.ts           # Shared API response types
├── hooks/
│   ├── queries/
│   │   ├── useForm.ts     # useQuery wrapper for form
│   │   ├── useRounds.ts   # useQuery wrapper for rounds
│   │   ├── useResponses.ts
│   │   └── ...
│   ├── mutations/
│   │   ├── useSubmitResponse.ts
│   │   ├── useGenerateSynthesis.ts
│   │   └── ...
│   └── usePresence.ts     # Existing, cleaned up
```

**The API client (`client.ts`):**
- Single place for auth token injection
- Response interceptor for 401 → redirect to login
- Request/response logging (configurable, off in production)
- Typed responses using generics
- Base URL configuration with sensible fallback
- Request timeout configuration

### 2.3 Error Handling: A Unified Strategy

**Current:** Mix of silent failures, `console.error`, `alert()`, and nothing.

**Proposed layers:**

1. **API client interceptor** — Catch 401 (redirect to login), 500 (show toast), network errors (show offline banner)
2. **TanStack Query `onError`** — Per-query error handling with fallback to global handler
3. **Error Boundary** — Already exists, good implementation. Expand to capture more context
4. **Toast/notification system** — Replace `alert()` calls with proper toast notifications (e.g., Sonner or react-hot-toast)
5. **Error reporting service** — For government deployment: Sentry or equivalent. The ErrorBoundary already logs to console; extend it to report

**Error categories for Symphonia:**
| Error Type | Current Handling | Proposed |
|---|---|---|
| Auth expired | Silent failure | Auto-refresh token or redirect to login with return URL |
| Network down | Nothing | Offline banner + queue mutations for retry |
| API 4xx | `alert()` in some places | Toast with actionable message |
| API 5xx | `console.error` | Toast + auto-retry for idempotent requests |
| WebSocket disconnect | Reconnect in `usePresence`, nothing elsewhere | Unified reconnect with exponential backoff + status indicator |
| Synthesis timeout | No handling | Progress polling with timeout warning |

### 2.4 Loading & Skeleton States

**Current:** `SummaryPage` has good skeleton states. `FormPage` has a custom orbit animation. Other pages have nothing or a simple spinner.

**Proposed:** Standardize loading patterns:

1. **Skeleton screens** for initial page loads (extend existing `Skeleton` and `SkeletonCard` components)
2. **Inline loading spinners** for button actions (already using `LoadingButton` — good)
3. **Progress indicators** for long operations (synthesis generation)
4. **Suspense boundaries** with React lazy loading for route-level code splitting
5. **Stale data indicators** — Show "last updated X ago" when displaying cached data

### 2.5 Optimistic Updates

Critical for perceived performance, especially with government networks (often high latency):

**High-value optimistic update targets:**
- **Comment creation** — Show immediately, roll back on failure
- **Response editing** — Show edit immediately, handle version conflicts gracefully (ResponseEditor already has conflict detection — good foundation)
- **Synthesis save** — Show "saved" immediately
- **Round question editing** — Reflect changes instantly
- **Form title/metadata updates** — Immediate UI update

TanStack Query makes this trivial with `onMutate` + `onError` rollback.

### 2.6 WebSocket Reliability: Unified Connection Manager

**Proposed: Single WebSocket connection per session, multiplexed by message type:**

```typescript
// hooks/useWebSocket.ts
// Single connection, shared across all components
// Message types: presence_update, summary_updated, synthesis_progress,
//                comment_added, response_submitted, round_changed

const useWebSocket = create<WebSocketStore>((set, get) => ({
  ws: null,
  status: 'disconnected',
  connect: () => { /* with exponential backoff */ },
  disconnect: () => {},
  subscribe: (type: string, handler: (data: any) => void) => {},
  unsubscribe: (type: string) => {},
}));
```

**Benefits:**
- One connection instead of 3+ per page
- Centralized reconnection logic with exponential backoff
- Connection status visible to all components
- Server-sent events can invalidate TanStack Query caches automatically
- Can use WebSocket messages to trigger `queryClient.invalidateQueries()` for real-time updates

**Backend integration:** The `ws.py` `ConnectionManager` already supports multiple message types. The frontend just needs to stop creating parallel connections.

---

## 3. Performance Features

### 3.1 Route-Level Code Splitting

**Current:** All routes are eagerly loaded in `AppRouter.tsx`. The admin-only `SummaryPage` (the largest component) is loaded even for regular users.

**Proposed:**
```typescript
const SummaryPage = lazy(() => import('./SummaryPage'));
const FormEditor = lazy(() => import('./FormEditor'));
const Atlas = lazy(() => import('./Atlas'));
const AdminDashboard = lazy(() => import('./AdminDashboard'));
```

This alone could reduce initial bundle size by ~40% for non-admin users. Wrap in `<Suspense>` with the skeleton components.

### 3.2 Virtualization for Large Response Lists

**The 100-expert problem:** When 100 experts respond, the "View All Responses" modal renders all responses in a portal. Each response has its own `ResponseEditor` (396 lines) with inline editing, conflict detection, and version tracking.

100 × ResponseEditor = thousands of DOM nodes + 100 controlled textareas.

**Solution:** `@tanstack/react-virtual` (or `react-window`):
- Virtualize the response list in the modal
- Only render visible responses (~5-10 at a time)
- Keep `ResponseEditor` instances unmounted until scrolled into view
- Lazy-load response content as user scrolls

**The CrossMatrix at scale:** With 100 experts, the cross-analysis matrix becomes a 100×N grid. Need:
- Virtual scrolling for both axes
- Collapse/expand groups
- Summary view that only shows outliers/disagreements
- Pagination or "load more" pattern

### 3.3 Synthesis Generation: Streaming & Progressive Loading

**Current:** `generateSummary()` makes a single POST, waits for the full response, then updates the editor. If synthesis takes 5 minutes, the user sees a spinner for 5 minutes.

**Proposed — Server-Sent Events (SSE) or WebSocket streaming:**

1. **Initiate synthesis** → POST returns a `job_id` immediately
2. **Progress updates via WebSocket** → Already partially implemented with `synthesis_progress` messages. Extend to stream partial results
3. **Progressive rendering:**
   - Show agreements as they're identified
   - Show disagreements as they emerge
   - Show nuances last
   - Final convergence score when complete
4. **Cancel button** — Allow admin to cancel long-running synthesis
5. **Background synthesis** — Admin can navigate away and return; synthesis continues on server

The committee synthesis endpoint (`synthesise_committee`) already sends WebSocket progress updates. The simple synthesis doesn't — it should.

### 3.4 Caching Strategy

**With TanStack Query, caching becomes configurable per-query:**

| Data | Stale Time | Cache Time | Refetch Strategy |
|---|---|---|---|
| Form metadata | 5 min | 30 min | On window focus |
| Rounds list | 30 sec | 5 min | On WebSocket `round_changed` |
| Responses | 1 min | 10 min | On WebSocket `response_submitted` |
| Synthesis | 5 min | 30 min | On WebSocket `synthesis_complete` |
| Comments | 30 sec | 5 min | On WebSocket `comment_added` |
| User profile | 10 min | 60 min | On window focus |

**Key insight:** WebSocket events should invalidate specific query caches. When a new response comes in, only `['responses', formId]` needs to refetch — not the entire page.

### 3.5 Offline Support — Pragmatic Assessment

**Full offline support is likely not needed** for initial government deployment. Government users are typically on managed networks. However:

**Worth implementing:**
- **Optimistic mutation queue** — If network drops mid-edit, queue the mutation and retry when back online
- **Service worker for static assets** — Faster return visits
- **"You are offline" banner** — Clear communication when network drops

**Not worth implementing (yet):**
- Full offline-first with IndexedDB sync
- Background sync API
- Conflict resolution for offline edits

### 3.6 Bundle Size & Dependencies

**Current dependency concerns:**
- `docx` (Word export) — Heavy library loaded on every page. Should be dynamic import only when user clicks "Export"
- `@hocuspocus/provider` + `yjs` — Collaborative editing infrastructure. Is it actually used? Not visible in any component. If unused, remove (saves significant bundle weight)
- TipTap extensions — Multiple extensions loaded. Could be lazy-loaded for the SummaryPage only

**Recommendation:** Run `npx vite-bundle-visualizer` to identify exact bloat. Estimate 30-50% reduction possible through:
1. Dynamic imports for `docx` library
2. Removing unused `@hocuspocus/provider` + `yjs` if confirmed unused
3. Route-level code splitting
4. Tree-shaking verification

---

## 4. Developer Experience

### 4.1 Component Library Reorganization

**Current structure:** All 18 components in a flat `components/` directory.

**Proposed:**
```
src/
├── components/
│   ├── ui/                       # Generic, reusable UI primitives
│   │   ├── Button/
│   │   │   ├── Button.tsx
│   │   │   ├── Button.test.tsx
│   │   │   └── Button.stories.tsx
│   │   ├── Skeleton/
│   │   ├── LoadingButton/
│   │   ├── ErrorBoundary/
│   │   └── MarkdownRenderer/
│   │
│   ├── synthesis/                # Synthesis-specific components
│   │   ├── StructuredSynthesis/
│   │   ├── SynthesisProgress/
│   │   ├── SynthesisModeSelector/
│   │   ├── SynthesisDisplay/
│   │   ├── CrossMatrix/
│   │   ├── EmergenceHighlights/
│   │   └── MinorityReport/
│   │
│   ├── rounds/                   # Round management
│   │   ├── RoundTimeline/
│   │   ├── RoundCard/
│   │   └── RoundHistory/
│   │
│   ├── responses/                # Response viewing/editing
│   │   ├── ResponseEditor/
│   │   ├── ResponseList/
│   │   └── ResponseExport/
│   │
│   ├── collaboration/            # Real-time features
│   │   ├── PresenceIndicator/
│   │   ├── CommentThread/
│   │   └── FollowUpThread/
│   │
│   └── export/                   # Export functionality
│       └── ExportPanel/
│
├── pages/                        # Page-level components (thin)
│   ├── SummaryPage/
│   │   ├── SummaryPage.tsx       # Orchestrator (thin)
│   │   ├── SynthesisEditor.tsx   # Editor section
│   │   ├── ActionsSidebar.tsx    # Sidebar actions
│   │   ├── QuestionsPanel.tsx    # Next round questions
│   │   └── ResponsesModal.tsx    # Response viewer modal
│   ├── FormPage/
│   ├── DashboardPage/
│   └── ...
│
├── api/                          # API client layer
├── hooks/                        # Custom hooks
├── stores/                       # Zustand stores
├── types/                        # Shared TypeScript types
├── layouts/                      # Layout components (existing)
└── theme/                        # Theme system (existing)
```

### 4.2 Type Safety Improvements

**Priority fixes:**

1. **Shared API types** — Define once in `types/api.ts`, use everywhere:
```typescript
// types/api.ts
export interface Form {
  id: number;
  title: string;
  questions: Question[];  // Not string[], not any[]
  allow_join: boolean;
  join_code: string;
  expert_labels?: ExpertLabels;
}

export interface Round {
  id: number;
  round_number: number;
  synthesis: string;
  synthesis_json: SynthesisData | null;  // Not any
  is_active: boolean;
  questions: string[];
  convergence_score: number | null;
  response_count: number;
}

export interface SynthesisData {
  agreements: Agreement[];
  disagreements: Disagreement[];
  nuances: Nuance[];
  confidence_map: Record<string, number>;
  follow_up_probes: Probe[];
  meta_synthesis_reasoning: string;
  narrative?: string;
  emergent_insights?: EmergentInsight[];
}
```

2. **Zod validation for API responses** — Parse, don't assume:
```typescript
const FormSchema = z.object({
  id: z.number(),
  title: z.string(),
  questions: z.array(z.string()),
  // ...
});

// In API client:
const form = FormSchema.parse(await response.json());
```

3. **Eliminate `any`** — The `AuthContext` user type, synthesis_json, and Atlas seed data all use `any`. Replace with proper types.

4. **Strict null checks** — Already enabled in tsconfig (`"strict": true`), but many components use `!` assertions instead of proper null handling.

### 4.3 Testing Infrastructure

**Proposed testing pyramid:**

```
           ╱╲
          ╱  ╲     E2E (Playwright)
         ╱    ╲    - 5-10 critical user journeys
        ╱──────╲   - Login → Create form → Submit → Synthesize → Export
       ╱        ╲
      ╱          ╲  Integration (Vitest + Testing Library)
     ╱            ╲ - Page components with mocked API
    ╱──────────────╲- Hook behavior (usePresence, auth)
   ╱                ╲
  ╱                  ╲ Unit (Vitest)
 ╱                    ╲- Pure functions (timeAgo, color_for_email equivalent)
╱──────────────────────╲- Component rendering with props
```

**Setup steps:**
1. Add `vitest`, `@testing-library/react`, `@testing-library/jest-dom`, `msw` (Mock Service Worker)
2. Add `@playwright/test` for E2E
3. Configure MSW to mock the API layer (intercept fetch calls, return typed fixtures)
4. Write tests for the most critical paths first:
   - Auth flow (login, token refresh, logout)
   - Form submission flow
   - Synthesis generation + display
   - WebSocket reconnection

**Testing the existing E2E spec:** The `e2e-journey.test.ts` file is good as a spec but needs a proper runner. Convert to Playwright:
```bash
npm install -D @playwright/test
npx playwright install
```

### 4.4 Storybook for Components

**Strong yes.** The component library (18 components) is rich enough to benefit from Storybook:

**Priority components for stories:**
1. `StructuredSynthesis` — Complex, many states (agreements/disagreements/nuances, collapsed/expanded)
2. `CrossMatrix` — Visual, needs different data configurations
3. `RoundTimeline` — Different round counts, active states
4. `ResponseEditor` — Editing, conflict, saving states
5. `CommentThread` — Empty, with comments, nested replies
6. `Skeleton` variants — All loading states documented
7. `LoadingButton` — All variants and states
8. `PresenceIndicator` — Different viewer counts

**Storybook doubles as documentation** for Ruaridh and any future team members. For government procurement, having a living design system is a significant plus.

### 4.5 Developer Tooling

**Add to the project:**
- **ESLint + Prettier** — Not currently configured. Essential for consistency
- **Husky + lint-staged** — Pre-commit hooks for lint + format
- **TypeScript strict mode** — Already on, but enforce `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes`
- **Bundle analyzer** — `rollup-plugin-visualizer` in vite config
- **React DevTools profiler** — Document how to use for performance debugging

---

## 5. Scalability Considerations

### 5.1 What If 100 Experts Respond?

**Current breaking points:**
- Response modal renders ALL responses at once → DOM thrashing
- CrossMatrix becomes a 100-column table → horizontal overflow, unreadable
- StructuredSynthesis shows all expert chips → cluttered
- `loadResponses()` fetches all responses in one call → large payload
- HTML string rendering (`responsesHTML`) concatenates all responses into one giant string

**Solutions:**
1. **Pagination** — `/forms/{formId}/rounds_with_responses?page=1&per_page=20`
2. **Virtualized lists** — Only render visible responses
3. **Expert grouping** — Cluster experts by response similarity, show groups
4. **Summary statistics** — Show response counts, average sentiment, key themes before individual responses
5. **Search/filter** — Filter responses by keyword, expert, agreement level
6. **Lazy expansion** — Show response headers (expert name, timestamp), expand on click

### 5.2 What If Synthesis Takes 5 Minutes?

**Current breaking points:**
- `generateSummary()` blocks with no timeout — user waits indefinitely
- No cancel mechanism
- If user navigates away, they lose the pending synthesis
- Progress stages are simulated client-side, not reflecting actual server progress

**Solutions:**
1. **Job queue architecture:**
   ```
   POST /synthesis/start → { job_id: "abc123" }
   GET  /synthesis/status/abc123 → { status: "analyzing", progress: 0.4 }
   WS   synthesis_progress → real-time updates
   GET  /synthesis/result/abc123 → { synthesis: {...} }
   DELETE /synthesis/cancel/abc123 → cancel
   ```

2. **UI patterns:**
   - Show estimated time based on response count
   - Allow admin to navigate away — synthesis continues
   - Push notification (browser Notification API) when complete
   - Show synthesis in "draft" state while generating, with partial results
   - "Cancel and retry with different model" button

3. **Timeout handling:**
   - Client-side: Show warning after 2 minutes, "still working..." after 4 minutes
   - Server-side: 10-minute hard timeout, return partial results if available

### 5.3 What If Government Runs 50 Consultations?

**Current breaking points:**
- Dashboard shows all forms in a flat list — 50 forms = very long page
- No pagination on forms list
- No search/filter on dashboard
- No consultation status categories (draft, active, complete, archived)
- Admin has no overview/analytics across consultations
- No bulk operations

**Solutions:**

**Dashboard improvements:**
- **Consultation lifecycle states:** Draft → Active → Synthesizing → Complete → Archived
- **Filters:** By status, date range, response count, has synthesis
- **Search:** By title, join code
- **Sorting:** By date, response count, round number
- **Pagination:** Server-side, 20 per page
- **Card view vs. table view** toggle
- **Bulk actions:** Archive multiple, export multiple

**Multi-consultation analytics:**
- **Overview dashboard:** Total consultations, total responses, average convergence scores
- **Cross-consultation themes:** What topics keep coming up across consultations?
- **Participation tracking:** Which experts are most/least active across consultations
- **Timeline view:** Gantt-style view of consultation phases

**Organizational structure:**
```
├── Department of Health
│   ├── AI Ethics Consultation (Round 3, 45 responses)
│   ├── Mental Health Policy Review (Complete, 28 responses)
│   └── NHS Tech Standards (Draft)
├── Cabinet Office
│   ├── Civil Service AI Strategy (Active, 67 responses)
│   └── ...
```

### 5.4 Government-Specific Requirements

**Accessibility (WCAG 2.2 AA — legally required for UK gov):**
- Current: No visible accessibility testing or ARIA attributes beyond what Tailwind provides
- Need: Full keyboard navigation, screen reader support, colour contrast compliance
- Need: Focus management in modals (trap focus in response modal)
- Need: Live regions for dynamic content (synthesis progress, presence updates)
- Need: Reduced motion support (animations can trigger vestibular disorders)
- Tool: `axe-core` integration in tests, `@axe-core/react` for development

**Security:**
- Move from localStorage tokens to httpOnly cookies (XSS protection)
- Add CSRF protection
- Content Security Policy headers
- Rate limiting on API endpoints
- Audit logging for admin actions
- Session timeout with warning
- Input sanitization (the TipTap editor could be an XSS vector if synthesis HTML is rendered unsafely)

**GDS Design System compliance:**
- Consider adopting or aligning with [GOV.UK Design System](https://design-system.service.gov.uk/)
- This doesn't mean using their exact components, but following their patterns for forms, error handling, and navigation
- Typography, spacing, and colour must meet GDS standards

**Data residency:**
- Synthesis goes through OpenRouter → external API. Government may require UK-hosted or on-premise LLM inference
- Build the API client to support configurable inference endpoints
- Consider supporting Azure OpenAI UK South region

---

## 6. Prioritized Implementation Roadmap

### Phase 1: Foundation (2-3 weeks)
**Goal:** Fix the structural issues that make everything else harder.

1. **Create API client layer** — `api/client.ts` + typed endpoint modules
2. **Add TanStack Query** — Migrate SummaryPage and FormPage first
3. **Unify auth** — Everything through `useAuth()`, no direct localStorage
4. **Remove console.log statements** — Replace with structured logger (debug/warn/error)
5. **Fix WebSocket memory leak** in WaitingPage
6. **Add ESLint + Prettier** — Consistent formatting

### Phase 2: Decomposition (2-3 weeks)
**Goal:** Break god components into manageable pieces.

1. **Decompose SummaryPage** into 5-6 smaller components
2. **Create shared types** in `types/api.ts`
3. **Unify WebSocket** into single connection manager
4. **Add toast notification system** replacing `alert()`
5. **Route-level code splitting** with `React.lazy()`

### Phase 3: Testing & Quality (2-3 weeks)
**Goal:** Confidence in changes.

1. **Set up Vitest + Testing Library + MSW**
2. **Write tests for critical paths** (auth, form submission, synthesis)
3. **Set up Playwright** for E2E
4. **Accessibility audit** with axe-core
5. **Bundle analysis and optimization**

### Phase 4: Performance & Scale (2-3 weeks)
**Goal:** Handle real government workloads.

1. **Virtualization** for response lists
2. **Optimistic updates** for comments and edits
3. **Streaming synthesis** with progressive rendering
4. **Pagination** for forms dashboard and responses
5. **Caching strategy** tuning

### Phase 5: Government Readiness (3-4 weeks)
**Goal:** Meet GDS and security requirements.

1. **WCAG 2.2 AA compliance** audit and fixes
2. **Security hardening** (httpOnly cookies, CSP, CSRF)
3. **Storybook** for component documentation
4. **GDS alignment** review
5. **Performance budget** and monitoring
6. **Error reporting** service integration

---

## 7. Quick Wins (Do This Week)

These are low-effort, high-impact changes:

1. **Fix the WebSocket leak in WaitingPage** — 5 minutes, prevents production memory issues
2. **Remove all console.log from SummaryPage** — 15 minutes, prevents info leakage
3. **Add `React.lazy()` for admin routes** — 30 minutes, reduces bundle for non-admin users
4. **Dynamic import `docx` library** — 30 minutes, significant bundle reduction
5. **Check if `@hocuspocus/provider` + `yjs` are used** — If not, remove from dependencies
6. **Add a `.env.example`** — Document required environment variables
7. **Fix `API_BASE_URL` having no fallback** — One line: `export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'`
8. **Add `"test": "vitest"` to package.json** and install vitest — Unblocks future test writing

---

## 8. Architecture Decision Records (Recommended)

For a government project, document key decisions:

| Decision | Choice | Rationale |
|---|---|---|
| State management | TanStack Query + Zustand | Server state vs client state separation; industry standard |
| Styling | Tailwind CSS (keep) | Already in use; good DX; PurgeCSS for production |
| Testing | Vitest + Playwright | Vitest for unit/integration (fast); Playwright for E2E (reliable) |
| API client | Custom fetch wrapper | No need for Axios; keep dependencies minimal |
| Component docs | Storybook | Living documentation; stakeholder demos; visual regression |
| Auth tokens | Migrate to httpOnly cookies | XSS protection for government security requirements |
| WebSocket | Single multiplexed connection | Reduce server load; unified reconnection |

---

## Summary

Symphonia's frontend has a solid UX foundation — the component library is surprisingly rich for an early-stage project (StructuredSynthesis, CrossMatrix, EmergenceHighlights, CommentThread, Presence). The UI patterns are thoughtful: skeleton loading states, error boundaries, dark mode, responsive design.

**What's holding it back is plumbing, not vision:** no API abstraction, no state management, no testing, inconsistent auth patterns, and a 560-line god component. These are all solvable problems, and solving them unlocks the more ambitious features (streaming synthesis, cross-consultation analytics, 100-expert scale) that would make this genuinely novel for UK government use.

The framework is React 18 with Vite, Tailwind, and TypeScript strict mode — a perfectly solid modern stack. No need to rewrite. Just refactor the patterns, add the missing infrastructure, and this becomes production-grade.
