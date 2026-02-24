# ARES Results — Auth & Mobile Visual QA Tests

**Agent:** ARES (security, auth flows, routing)  
**Date:** 2026-02-24  
**Target:** Symphonia (Delphi consensus platform)  

---

## Files Written

| File | Tests | Description |
|------|-------|-------------|
| `hector/tests/04-auth-visual.spec.ts` | 15 | Auth state, login/register flows, route protection, token lifecycle |
| `hector/tests/05-mobile-visual.spec.ts` | 10 | Mobile responsive tests across 2 viewports × 5 route groups |

**Total: 25 tests** (verified via `npx playwright test --list`)

---

## 04-auth-visual.spec.ts — Test Coverage

| # | Test | Assertions | Screenshot |
|---|------|-----------|------------|
| 1 | Login page unauthenticated | Email input, password input, submit button, "Sign In" heading, register link visible | `04-01-login-unauthenticated.png` |
| 2 | Invalid credentials | `[role="alert"]` error visible, still on /login, no crash | `04-02-login-invalid-credentials.png` |
| 3 | Empty email validation | HTML5 `validity.valid === false` on email input, form blocked | `04-03-login-empty-email.png` |
| 4 | Valid admin login | Redirected to /, "New Form" visible (AdminDashboard), email in header | `04-04-admin-login-dashboard.png` |
| 5 | Valid user login | Registers test user via API, logs in via UI, "Join a New Form" visible | `04-05-user-login-dashboard.png` |
| 6 | Admin dashboard controls | "New Form" visible, "Join a New Form" NOT visible (confirms admin view) | `04-06-admin-dashboard-controls.png` |
| 7 | Logout behavior | Token exists → click "Log out" → redirected to /login, `access_token` null in localStorage | `04-07-logout.png` |
| 8 | Token persistence | Login → verify token → reload → token unchanged, still on / | `04-08-token-persistence.png` |
| 9 | Unauth redirect (/) | Clear localStorage → visit / → redirected to /login | `04-09-unauth-redirect-root.png` |
| 10 | Unauth redirect (/waiting) | Clear localStorage → visit /waiting → redirected to /login | `04-10-unauth-redirect-waiting.png` |
| 11 | Admin route protection | Login as regular user → visit /admin/form/1 → URL does NOT contain /admin | `04-11-admin-route-protection.png` |
| 12 | Register page visual | Email input, password input, submit button, "Create Account" heading, login link visible | `04-12-register-page.png` |
| 13 | Register new user | Fill form → submit → redirected to / → "Join a New Form" visible | `04-13-register-success.png` |
| 14 | Register duplicate email | Register via API first → register same email via UI → `[role="alert"]` visible | `04-14-register-duplicate.png` |
| 15 | 405 routing bug | GET request to API /login returns 405; SPA client-side routing still works | `04-15-405-routing-bug.png` |

### Auth Helper Pattern

- Tests 1–5, 7, 13–14 use **UI-based login** (fill form, click submit) to test the actual login flow
- Tests 6, 8 use **`loginViaAPI()`** from helpers.ts for speed (bypasses the /login UI)
- Test 11 uses **direct API login** to get a non-admin token, then sets localStorage manually
- Test users are created with unique timestamps to avoid collisions between runs

---

## 05-mobile-visual.spec.ts — Test Coverage

### Viewports

| Name | Dimensions | Device |
|------|-----------|--------|
| `iphone-se` | 375×812 | iPhone SE (small mobile) |
| `ipad` | 768×1024 | iPad (tablet) |

### Routes Tested

| Route | Auth | Viewport | Screenshot | Checks |
|-------|------|----------|------------|--------|
| `/login` | None | iPhone SE | `05-login-iphone-se.png` | No h-overflow, form visible, touch targets logged |
| `/login` | None | iPad | `05-login-ipad.png` | Same |
| `/register` | None | iPhone SE | `05-register-iphone-se.png` | No h-overflow, form visible, touch targets logged |
| `/register` | None | iPad | `05-register-ipad.png` | Same |
| `/` (admin) | Admin | iPhone SE | `05-admin-dashboard-iphone-se.png` | No h-overflow, header hamburger visible, "New Form" visible |
| `/` (admin) | Admin | iPad | `05-admin-dashboard-ipad.png` | No h-overflow, desktop nav visible, "New Form" visible |
| `/form/1` | Admin | iPhone SE | `05-form-1-iphone-se.png` | No h-overflow, header adaptation, no crash |
| `/form/1` | Admin | iPad | `05-form-1-ipad.png` | Same |
| `/` (user) | User | iPhone SE | `05-user-dashboard-iphone-se.png` | No h-overflow, hamburger menu, "Join a New Form" visible |
| `/` (user) | User | iPad | `05-user-dashboard-ipad.png` | No h-overflow, "Join a New Form" visible |

### Responsive Assertions

1. **No horizontal overflow** — `scrollWidth > clientWidth` check on every page
2. **Touch targets** — All interactive elements (`a`, `button`, `input`, etc.) checked for ≥44px; undersized elements logged as warnings
3. **Header adaptation** — At `<640px`: hamburger menu button visible; at `≥640px`: desktop nav (`.hidden.sm\:flex`) visible
4. **Content readability** — Form elements verified visible at each viewport

---

## Known Issues Documented

### 🐛 405 GET /login Bug (Test 15)
- **What:** GET requests to `/login` and `/register` hit the FastAPI backend instead of serving the SPA
- **Cause:** FastAPI only handles POST on these endpoints → returns 405 Method Not Allowed
- **Impact:** Direct URL navigation may break depending on server/proxy configuration
- **Workaround:** SPA client-side routing handles these paths correctly; the bug only manifests when hitting the API server directly
- **Status:** Documented in test comment, verified in test assertion

### ⚠️ Touch Target Warnings
- The mobile tests log (but don't hard-fail on) touch targets below 44px
- Small links (e.g., "Create one", "Sign in" text links) may be flagged
- This is logged to console for manual review during test runs

---

## Running the Tests

```bash
cd e2e-tests/hector

# Run all tests (requires Symphonia on localhost:8766)
BASE_URL=http://localhost:8766 API_URL=http://localhost:8766 npx playwright test

# Run only auth tests
BASE_URL=http://localhost:8766 API_URL=http://localhost:8766 npx playwright test tests/04-auth-visual.spec.ts

# Run only mobile tests
BASE_URL=http://localhost:8766 API_URL=http://localhost:8766 npx playwright test tests/05-mobile-visual.spec.ts

# Run headed (watch the browser)
BASE_URL=http://localhost:8766 API_URL=http://localhost:8766 npx playwright test --headed
```

Screenshots saved to: `e2e-tests/hector/screenshots/`
