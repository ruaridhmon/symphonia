# Hector — Investigation Notes

## Date: 2026-02-23

## Route Map (from AppRouter.tsx)

### Public Routes (AuthLayout)
| Route | Component | ErrorBoundary Title |
|-------|-----------|-------------------|
| `/login` | Login | Login Error |
| `/register` | Register | Registration Error |

### Authenticated Routes (PrivateRoute → PageLayout)
| Route | Component | ErrorBoundary Title |
|-------|-----------|-------------------|
| `/` | Dashboard | Dashboard Error |
| `/atlas` | Atlas | Atlas Error |
| `/waiting` | WaitingPage | Waiting Page Error |
| `/result` | ResultPage | Result Page Error |
| `/thank-you` | ThankYouPage | Thank You Page Error |
| `/form/:id` | FormPage | Form Submission Error |

### Admin Routes (PrivateRoute isAdminRoute → PageLayout)
| Route | Component | ErrorBoundary Title |
|-------|-----------|-------------------|
| `/admin/settings` | AdminSettings | Settings Error |
| `/admin/forms/new` | AdminFormNew | New Form Error |
| `/admin/form/:id` | FormEditor | Form Editor Error |
| `/admin/form/:id/summary` | SummaryPage | **Summary Page Error** ← THE BUG |

### Catch-all
| Route | Component | ErrorBoundary Title |
|-------|-----------|-------------------|
| `*` | NotFoundPage | Page Error |

## The Bug

**Component:** `RoundCard.tsx` (in `frontend/src/components/`)
**Issue:** `MessageSquare` icon from `lucide-react` was not imported, causing a runtime ReferenceError.
**Symptom:** Navigating to `/admin/form/:id/summary` and viewing any round triggered:
  > "Summary Page Error: Can't find variable: MessageSquare"
**Current state:** Bug is FIXED (import is now present). But we need tests to prevent regression.

## Error Boundary Pattern

The app uses a consistent `ErrorBoundary` component that renders:
- A `⚠` warning icon in a red circle (`var(--destructive)` background)
- An `<h2>` with the `fallbackTitle` prop (e.g., "Summary Page Error")
- A `<p>` with `error.message` in monospace
- A "Try Again" button
- In dev mode: component stack trace in `<details>`

**Detection strategy:** Look for:
1. The `⚠` character in a styled div
2. Text matching known error titles (any `*Error` pattern)
3. Text containing "Can't find variable"
4. Error messages in monospace blocks

## Authentication

- Login endpoint: `POST /login` with `username` (email) & `password` form data
- Auth: httpOnly cookie + CSRF token (also returns JWT in response body)
- Test credentials (from .env.example): `admin@test.com` / `testpass123`
- Admin account auto-created on first startup

## Available Test Data

- 10 pre-seeded forms (policy consultation topics)
- Form 1 has 1 round with 0 responses
- Admin account has full access to admin routes

## Cloudflare Access

Production site (`symphonia.axiotic.ai`) is behind Cloudflare Access (email OTP).
Tests run against local instance (`:3000` frontend, `:8000` backend) to avoid CF Access.
For production testing, CF Access service tokens would be needed.
