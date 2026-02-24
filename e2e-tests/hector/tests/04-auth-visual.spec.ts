import { test, expect } from '@playwright/test';
import {
  assertNoErrors,
  takeScreenshot,
  collectConsoleErrors,
  filterCriticalErrors,
  loginViaAPI,
  loginViaUI,
  waitForPageSettle,
} from './helpers';

/**
 * 04 — Auth State Visual Tests (ARES)
 *
 * Comprehensive auth flow testing: login, register, logout,
 * route protection, token persistence, and known bugs.
 *
 * Each test captures a screenshot for visual QA.
 */

const API_URL = process.env.API_URL || 'http://localhost:8000';
const ADMIN_EMAIL = 'antreas@axiotic.ai';
const ADMIN_PASSWORD = 'test123';

// Unique per-run to avoid collisions
const TEST_USER_EMAIL = `ares-testuser-${Date.now()}@test.local`;
const TEST_USER_PASSWORD = 'AresTest!2024';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Register a user via the API directly (bypasses UI).
 * Returns true if registration succeeded (201/200) or user already exists (409).
 */
async function registerViaAPI(
  page: import('@playwright/test').Page,
  email: string,
  password: string,
): Promise<boolean> {
  const response = await page.request.post(`${API_URL}/register`, {
    form: { username: email, password },
  });
  return response.status() < 500;
}

// ─── 1. Login Page Unauthenticated ───────────────────────────────────────────

test.describe('Auth Visual Tests', () => {
  test('1 — Login page renders correctly when unauthenticated', async ({ page }) => {
    const getErrors = collectConsoleErrors(page);

    await page.goto('/login');
    await waitForPageSettle(page);

    // Verify form elements visible
    await expect(page.locator('#login-email')).toBeVisible();
    await expect(page.locator('#login-password')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();

    // Verify heading
    await expect(page.locator('h2')).toContainText('Sign In');

    // Verify register link
    await expect(page.locator('a[href="/register"]')).toBeVisible();

    await assertNoErrors(page, 'login-unauthenticated');
    await takeScreenshot(page, '04-01-login-unauthenticated');

    const critical = filterCriticalErrors(getErrors());
    expect(critical, 'No critical console errors on /login').toHaveLength(0);
  });

  // ─── 2. Login with Invalid Credentials ──────────────────────────────────

  test('2 — Login with invalid credentials shows error', async ({ page }) => {
    await page.goto('/login');
    await waitForPageSettle(page);

    await page.fill('#login-email', 'nobody@invalid.test');
    await page.fill('#login-password', 'wrongpassword');
    await page.click('button[type="submit"]');

    // Wait for the error alert to appear
    const errorAlert = page.locator('[role="alert"]');
    await expect(errorAlert).toBeVisible({ timeout: 10_000 });

    // Error text should indicate login failure
    const errorText = await errorAlert.textContent();
    expect(errorText).toBeTruthy();
    // The i18n key is 'auth.loginFailed' → "Login failed. Please try again."
    // But the catch block uses err.message which may differ; just verify an alert appeared.

    // Should still be on /login (not crashed/redirected)
    expect(page.url()).toContain('/login');

    await assertNoErrors(page, 'login-invalid-credentials');
    await takeScreenshot(page, '04-02-login-invalid-credentials');
  });

  // ─── 3. Login with Empty Email ──────────────────────────────────────────

  test('3 — Login with empty email shows validation', async ({ page }) => {
    await page.goto('/login');
    await waitForPageSettle(page);

    // Don't fill anything, just click submit
    await page.click('button[type="submit"]');

    // The email input has type="email" and required — HTML5 validation kicks in.
    // The form should NOT navigate away (browser blocks submission).
    // We verify by checking we're still on /login and the input is invalid.
    expect(page.url()).toContain('/login');

    // Check the email input's validity state
    const isInvalid = await page.locator('#login-email').evaluate(
      (el: HTMLInputElement) => !el.validity.valid,
    );
    expect(isInvalid).toBe(true);

    await takeScreenshot(page, '04-03-login-empty-email');
  });

  // ─── 4. Valid Admin Login ───────────────────────────────────────────────

  test('4 — Valid admin login redirects to admin dashboard', async ({ page }) => {
    const getErrors = collectConsoleErrors(page);

    await page.goto('/login');
    await waitForPageSettle(page);

    await page.fill('#login-email', ADMIN_EMAIL);
    await page.fill('#login-password', ADMIN_PASSWORD);
    await page.click('button[type="submit"]');

    // Wait for redirect away from /login
    await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 15_000 });
    await waitForPageSettle(page);

    // Should be on /
    expect(page.url()).toMatch(/\/$/);

    // Admin dashboard should be visible — check for admin-specific content
    // AdminDashboard shows "+ New Form" button
    await expect(
      page.locator('text=New Form').first(),
    ).toBeVisible({ timeout: 10_000 });

    // Header should show the admin email (on desktop, visible in the header subtitle)
    await expect(
      page.locator(`text=${ADMIN_EMAIL}`).first(),
    ).toBeVisible();

    await assertNoErrors(page, 'admin-login');
    await takeScreenshot(page, '04-04-admin-login-dashboard');

    const critical = filterCriticalErrors(getErrors());
    expect(critical, 'No critical errors after admin login').toHaveLength(0);
  });

  // ─── 5. Valid User Login ────────────────────────────────────────────────

  test('5 — Valid user login shows user dashboard', async ({ page }) => {
    // First, register a test user via API
    await registerViaAPI(page, TEST_USER_EMAIL, TEST_USER_PASSWORD);

    // Now login via UI
    await page.goto('/login');
    await waitForPageSettle(page);

    await page.fill('#login-email', TEST_USER_EMAIL);
    await page.fill('#login-password', TEST_USER_PASSWORD);
    await page.click('button[type="submit"]');

    await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 15_000 });
    await waitForPageSettle(page);

    // User dashboard should show "Join a New Form"
    await expect(
      page.locator('text=Join a New Form').first(),
    ).toBeVisible({ timeout: 10_000 });

    await assertNoErrors(page, 'user-login');
    await takeScreenshot(page, '04-05-user-login-dashboard');
  });

  // ─── 6. Admin Dashboard Controls ───────────────────────────────────────

  test('6 — Admin sees admin-specific controls', async ({ page, baseURL }) => {
    await loginViaAPI(page, baseURL!, ADMIN_EMAIL, ADMIN_PASSWORD);
    await page.goto('/');
    await waitForPageSettle(page);

    // Admin dashboard should have "+ New Form" CTA
    await expect(
      page.locator('text=New Form').first(),
    ).toBeVisible({ timeout: 10_000 });

    // Admin should NOT see the "Join a New Form" user-specific section
    const joinFormVisible = await page.locator('text=Join a New Form').isVisible().catch(() => false);
    expect(joinFormVisible).toBe(false);

    await assertNoErrors(page, 'admin-dashboard-controls');
    await takeScreenshot(page, '04-06-admin-dashboard-controls');
  });

  // ─── 7. Logout Behavior ────────────────────────────────────────────────

  test('7 — Logout clears token and redirects to /login', async ({ page, baseURL }) => {
    // Login via API first
    await loginViaAPI(page, baseURL!, ADMIN_EMAIL, ADMIN_PASSWORD);
    await page.goto('/');
    await waitForPageSettle(page);

    // Verify we're logged in
    const tokenBefore = await page.evaluate(() => localStorage.getItem('access_token'));
    expect(tokenBefore).toBeTruthy();

    // Click the logout button
    // Desktop: the header has a "Log out" button
    const logoutBtn = page.locator('button:has-text("Log out")').first();
    await expect(logoutBtn).toBeVisible();
    await logoutBtn.click();

    // Wait for redirect to /login
    await page.waitForURL('**/login**', { timeout: 10_000 });

    // Token should be cleared
    const tokenAfter = await page.evaluate(() => localStorage.getItem('access_token'));
    expect(tokenAfter).toBeNull();

    await takeScreenshot(page, '04-07-logout');
  });

  // ─── 8. Token Persistence ──────────────────────────────────────────────

  test('8 — Token persists across page reload', async ({ page, baseURL }) => {
    await loginViaAPI(page, baseURL!, ADMIN_EMAIL, ADMIN_PASSWORD);
    await page.goto('/');
    await waitForPageSettle(page);

    // Verify token is set
    const tokenBefore = await page.evaluate(() => localStorage.getItem('access_token'));
    expect(tokenBefore).toBeTruthy();

    // Reload the page
    await page.reload();
    await waitForPageSettle(page);

    // Token should still be there
    const tokenAfter = await page.evaluate(() => localStorage.getItem('access_token'));
    expect(tokenAfter).toBeTruthy();
    expect(tokenAfter).toBe(tokenBefore);

    // Should still be on / (not redirected to /login)
    expect(page.url()).not.toContain('/login');

    await takeScreenshot(page, '04-08-token-persistence');
  });

  // ─── 9. Unauthenticated Redirect from / ────────────────────────────────

  test('9 — Unauthenticated visit to / redirects to /login', async ({ page }) => {
    // Ensure no auth state
    await page.goto('/login');
    await page.evaluate(() => {
      localStorage.removeItem('access_token');
      localStorage.removeItem('is_admin');
      localStorage.removeItem('email');
    });

    // Navigate to / (protected)
    await page.goto('/');
    await waitForPageSettle(page);

    // Should be redirected to /login
    expect(page.url()).toContain('/login');

    await takeScreenshot(page, '04-09-unauth-redirect-root');
  });

  // ─── 10. Unauthenticated Route Access (/waiting) ──────────────────────

  test('10 — Unauthenticated visit to /waiting redirects to /login', async ({ page }) => {
    // Ensure no auth state
    await page.goto('/login');
    await page.evaluate(() => {
      localStorage.removeItem('access_token');
      localStorage.removeItem('is_admin');
      localStorage.removeItem('email');
    });

    await page.goto('/waiting');
    await waitForPageSettle(page);

    expect(page.url()).toContain('/login');

    await takeScreenshot(page, '04-10-unauth-redirect-waiting');
  });

  // ─── 11. Admin Route Protection ────────────────────────────────────────

  test('11 — Non-admin user visiting admin route is redirected to /', async ({ page }) => {
    // Register & login as a regular user via API
    const regularEmail = `ares-regular-${Date.now()}@test.local`;
    const regularPassword = 'AresRegular!2024';
    await registerViaAPI(page, regularEmail, regularPassword);

    // Login via API as regular user
    const response = await page.request.post(`${API_URL}/login`, {
      form: { username: regularEmail, password: regularPassword },
    });
    const data = await response.json();

    // Navigate to a page on the app origin, then set localStorage
    await page.goto('/login');
    await page.evaluate((loginData) => {
      localStorage.setItem('access_token', loginData.access_token);
      localStorage.setItem('is_admin', String(loginData.is_admin));
      localStorage.setItem('email', loginData.email);
    }, data);

    // Try to access admin route
    await page.goto('/admin/form/1');
    await waitForPageSettle(page);

    // PrivateRoute with isAdminRoute redirects non-admin to /
    // Should NOT be on admin route
    expect(page.url()).not.toContain('/admin');

    await takeScreenshot(page, '04-11-admin-route-protection');
  });

  // ─── 12. Register Page Visual ──────────────────────────────────────────

  test('12 — Register page renders correctly', async ({ page }) => {
    const getErrors = collectConsoleErrors(page);

    await page.goto('/register');
    await waitForPageSettle(page);

    // Verify form elements
    await expect(page.locator('#register-email')).toBeVisible();
    await expect(page.locator('#register-password')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();

    // Heading
    await expect(page.locator('h2')).toContainText('Create Account');

    // Link to login
    await expect(page.locator('a[href="/login"]')).toBeVisible();

    await assertNoErrors(page, 'register-page');
    await takeScreenshot(page, '04-12-register-page');

    const critical = filterCriticalErrors(getErrors());
    expect(critical, 'No critical errors on /register').toHaveLength(0);
  });

  // ─── 13. Register New User ─────────────────────────────────────────────

  test('13 — Register new user succeeds and redirects', async ({ page }) => {
    const newEmail = `ares-newreg-${Date.now()}@test.local`;
    const newPassword = 'AresNewReg!2024';

    await page.goto('/register');
    await waitForPageSettle(page);

    await page.fill('#register-email', newEmail);
    await page.fill('#register-password', newPassword);
    await page.click('button[type="submit"]');

    // On success, Register component calls login() then Navigate to /
    // So we should end up on / with a user dashboard
    await page.waitForURL((url) => !url.pathname.startsWith('/register'), { timeout: 15_000 });
    await waitForPageSettle(page);

    // Should be redirected to dashboard (/) after successful register + auto-login
    expect(page.url()).toMatch(/\/$/);

    // User dashboard should show "Join a New Form"
    await expect(
      page.locator('text=Join a New Form').first(),
    ).toBeVisible({ timeout: 10_000 });

    await takeScreenshot(page, '04-13-register-success');
  });

  // ─── 14. Register Duplicate Email ──────────────────────────────────────

  test('14 — Register duplicate email shows error', async ({ page }) => {
    // First registration
    const dupEmail = `ares-dup-${Date.now()}@test.local`;
    const dupPassword = 'AresDup!2024';
    await registerViaAPI(page, dupEmail, dupPassword);

    // Now try to register the same email via UI
    await page.goto('/register');
    await waitForPageSettle(page);

    await page.fill('#register-email', dupEmail);
    await page.fill('#register-password', dupPassword);
    await page.click('button[type="submit"]');

    // Should show an error alert
    const errorAlert = page.locator('[role="alert"]');
    await expect(errorAlert).toBeVisible({ timeout: 10_000 });

    // i18n: 'auth.emailExists' → "An account with this email already exists."
    const errorText = await errorAlert.textContent();
    expect(errorText).toBeTruthy();

    // Should still be on /register
    expect(page.url()).toContain('/register');

    await takeScreenshot(page, '04-14-register-duplicate');
  });

  // ─── 15. 405 Routing Bug (Known Issue) ─────────────────────────────────

  /**
   * KNOWN BUG: GET /login hits the FastAPI backend directly instead of
   * serving the SPA. The backend only handles POST /login, so a direct
   * GET request returns 405 Method Not Allowed.
   *
   * This happens because the dev server / reverse proxy does not
   * properly route GET requests to /login and /register to the SPA's
   * index.html. The SPA expects hash or history routing to handle
   * these paths client-side.
   *
   * Impact: Direct URL navigation (typing /login in browser, refreshing
   * on /login) may break depending on the server configuration.
   *
   * When the SPA is served properly (e.g., via the dev server's proxy),
   * the React SPA handles /login client-side and the bug doesn't manifest.
   * But hitting the API server directly with GET /login returns 405.
   */
  test('15 — 405 routing bug: GET /login on API returns Method Not Allowed', async ({ page }) => {
    // Hit the API endpoint directly (not the SPA)
    const response = await page.request.get(`${API_URL}/login`);

    // The API should return 405 since it only accepts POST
    // This documents the known routing bug
    expect(response.status()).toBe(405);

    // Take a screenshot of what the SPA shows when navigated via browser
    // (which should work via client-side routing)
    await page.goto('/login');
    await waitForPageSettle(page);
    await takeScreenshot(page, '04-15-405-routing-bug');

    // Verify SPA routing still works (the SPA handles /login client-side)
    await expect(page.locator('#login-email')).toBeVisible();
  });
});
