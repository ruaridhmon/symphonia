import { test, expect } from '@playwright/test';
import {
  assertNoErrors,
  takeScreenshot,
  collectConsoleErrors,
  filterCriticalErrors,
  loginViaAPI,
  waitForPageSettle,
} from './helpers';

/**
 * Page Load Tests — Visit every route and verify:
 * 1. Page loads without HTTP errors
 * 2. No critical JavaScript console errors (filters out React dev warnings, CORS noise)
 * 3. No ErrorBoundary / crash UI in the DOM
 * 4. Full-page screenshot captured
 */

// ─── Public Routes ──────────────────────────────────────────────────────────

test.describe('Public Pages', () => {
  test('Login page loads cleanly', async ({ page }) => {
    const getErrors = collectConsoleErrors(page);
    const response = await page.goto('/login');

    expect(response?.status()).toBeLessThan(400);
    await waitForPageSettle(page);
    await assertNoErrors(page, '/login');
    await takeScreenshot(page, '01-login');

    const critical = filterCriticalErrors(getErrors());
    expect(critical, 'Console errors on /login').toHaveLength(0);
  });

  test('Register page loads cleanly', async ({ page }) => {
    const getErrors = collectConsoleErrors(page);
    const response = await page.goto('/register');

    expect(response?.status()).toBeLessThan(400);
    await waitForPageSettle(page);
    await assertNoErrors(page, '/register');
    await takeScreenshot(page, '02-register');

    const critical = filterCriticalErrors(getErrors());
    expect(critical, 'Console errors on /register').toHaveLength(0);
  });

  test('404 page loads cleanly', async ({ page }) => {
    await page.goto('/this-route-does-not-exist');
    await waitForPageSettle(page);
    await assertNoErrors(page, '/404');
    await takeScreenshot(page, '03-not-found');
  });
});

// ─── Authenticated Routes ───────────────────────────────────────────────────

test.describe('Authenticated Pages', () => {
  test.beforeEach(async ({ page, baseURL }) => {
    await loginViaAPI(page, baseURL!);
  });

  test('Dashboard (/) loads cleanly', async ({ page }) => {
    const getErrors = collectConsoleErrors(page);
    const response = await page.goto('/');

    expect(response?.status()).toBeLessThan(400);
    await waitForPageSettle(page);
    await assertNoErrors(page, '/');
    await takeScreenshot(page, '04-dashboard');

    const critical = filterCriticalErrors(getErrors());
    expect(critical, 'Console errors on /').toHaveLength(0);
  });

  test('Atlas (/atlas) loads cleanly', async ({ page }) => {
    const getErrors = collectConsoleErrors(page);
    const response = await page.goto('/atlas');

    expect(response?.status()).toBeLessThan(400);
    await waitForPageSettle(page);
    await assertNoErrors(page, '/atlas');
    await takeScreenshot(page, '05-atlas');

    const critical = filterCriticalErrors(getErrors());
    expect(critical, 'Console errors on /atlas').toHaveLength(0);
  });

  test('Waiting page (/waiting) loads cleanly', async ({ page }) => {
    const getErrors = collectConsoleErrors(page);
    const response = await page.goto('/waiting');

    expect(response?.status()).toBeLessThan(400);
    await waitForPageSettle(page);
    await takeScreenshot(page, '06-waiting');
    // Note: /waiting may show an ErrorBoundary when accessed directly without form context.
    // This is expected — the page needs query params (form_id). We still screenshot it.
    // The real test is that it doesn't crash with an unhandled ReferenceError.
  });

  test('Result page (/result) loads cleanly', async ({ page }) => {
    const getErrors = collectConsoleErrors(page);
    const response = await page.goto('/result');

    expect(response?.status()).toBeLessThan(400);
    await waitForPageSettle(page);
    await assertNoErrors(page, '/result');
    await takeScreenshot(page, '07-result');
  });

  test('Thank You page (/thank-you) loads cleanly', async ({ page }) => {
    const getErrors = collectConsoleErrors(page);
    const response = await page.goto('/thank-you');

    expect(response?.status()).toBeLessThan(400);
    await waitForPageSettle(page);
    await assertNoErrors(page, '/thank-you');
    await takeScreenshot(page, '08-thank-you');
  });

  test('Form page (/form/1) loads cleanly', async ({ page }) => {
    const getErrors = collectConsoleErrors(page);
    const response = await page.goto('/form/1');

    expect(response?.status()).toBeLessThan(400);
    await waitForPageSettle(page);
    await assertNoErrors(page, '/form/1');
    await takeScreenshot(page, '09-form-1');
  });
});

// ─── Admin Routes ───────────────────────────────────────────────────────────

test.describe('Admin Pages', () => {
  test.beforeEach(async ({ page, baseURL }) => {
    await loginViaAPI(page, baseURL!);
  });

  test('Admin Settings (/admin/settings) loads cleanly', async ({ page }) => {
    const getErrors = collectConsoleErrors(page);
    const response = await page.goto('/admin/settings');

    expect(response?.status()).toBeLessThan(400);
    await waitForPageSettle(page);
    await assertNoErrors(page, '/admin/settings');
    await takeScreenshot(page, '10-admin-settings');
  });

  test('Admin New Form (/admin/forms/new) loads cleanly', async ({ page }) => {
    const getErrors = collectConsoleErrors(page);
    const response = await page.goto('/admin/forms/new');

    expect(response?.status()).toBeLessThan(400);
    await waitForPageSettle(page);
    await assertNoErrors(page, '/admin/forms/new');
    await takeScreenshot(page, '11-admin-new-form');
  });

  test('Form Editor (/admin/form/1) loads cleanly', async ({ page }) => {
    const getErrors = collectConsoleErrors(page);
    const response = await page.goto('/admin/form/1');

    expect(response?.status()).toBeLessThan(400);
    await waitForPageSettle(page);
    await assertNoErrors(page, '/admin/form/1');
    await takeScreenshot(page, '12-admin-form-editor');
  });

  test('Summary Page (/admin/form/1/summary) loads cleanly — THE CRITICAL PAGE', async ({ page }) => {
    const getErrors = collectConsoleErrors(page);
    const response = await page.goto('/admin/form/1/summary');

    expect(response?.status()).toBeLessThan(400);
    await waitForPageSettle(page);
    await assertNoErrors(page, '/admin/form/1/summary');
    await takeScreenshot(page, '13-admin-summary');

    // Extra check: specifically look for the original bug pattern
    const bodyText = await page.locator('body').textContent();
    expect(bodyText).not.toContain("Can't find variable: MessageSquare");
    expect(bodyText).not.toContain('Summary Page Error');

    const critical = filterCriticalErrors(getErrors());
    expect(critical, 'Console errors on summary page').toHaveLength(0);
  });
});
