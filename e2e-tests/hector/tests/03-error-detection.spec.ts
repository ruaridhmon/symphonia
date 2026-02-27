import { test, expect } from '@playwright/test';
import {
  checkForErrorBoundary,
  assertNoErrors,
  takeScreenshot,
  collectConsoleErrors,
  loginViaAPI,
  waitForPageSettle,
} from './helpers';

/**
 * Error Detection Pattern Tests
 *
 * Validates that our error detection helper correctly identifies
 * Symphonia's ErrorBoundary patterns. Also serves as a regression
 * guard — if the error detection stops working, these tests will fail.
 */

test.describe('Error Detection Helper', () => {
  test('checkForErrorBoundary returns null on a clean page', async ({ page }) => {
    await page.goto('/login');
    await waitForPageSettle(page);

    const error = await checkForErrorBoundary(page);
    expect(error).toBeNull();
  });

  test('checkForErrorBoundary detects injected error UI', async ({ page }) => {
    await page.goto('/login');
    await waitForPageSettle(page);

    // Inject a fake ErrorBoundary pattern into the page
    await page.evaluate(() => {
      const div = document.createElement('div');
      div.innerHTML = `
        <div style="text-align: center;">
          <div>⚠</div>
          <h2>Summary Page Error</h2>
          <p style="font-family: monospace;">Can't find variable: MessageSquare</p>
          <button>Try Again</button>
        </div>
      `;
      document.body.appendChild(div);
    });

    const error = await checkForErrorBoundary(page);
    expect(error).not.toBeNull();
    expect(error).toContain('Summary Page Error');
  });

  test('checkForErrorBoundary detects "Can\'t find variable" text', async ({ page }) => {
    await page.goto('/login');
    await waitForPageSettle(page);

    // Inject just the error text pattern (no full ErrorBoundary UI)
    await page.evaluate(() => {
      const div = document.createElement('div');
      div.textContent = "ReferenceError: Can't find variable: SomeComponent";
      document.body.appendChild(div);
    });

    const error = await checkForErrorBoundary(page);
    expect(error).not.toBeNull();
    expect(error).toContain("Can't find variable");
  });

  test('checkForErrorBoundary detects "is not defined" errors', async ({ page }) => {
    await page.goto('/login');
    await waitForPageSettle(page);

    await page.evaluate(() => {
      const div = document.createElement('div');
      div.textContent = 'ReferenceError: MessageSquare is not defined';
      document.body.appendChild(div);
    });

    const error = await checkForErrorBoundary(page);
    expect(error).not.toBeNull();
    expect(error).toContain('is not defined');
  });
});

test.describe('Full Page Sweep — No Errors Anywhere', () => {
  /**
   * Sweep every accessible route and confirm zero ErrorBoundary activations.
   * This is the definitive regression test.
   */
  test('Every route is free of ErrorBoundary crashes', async ({ page, baseURL }) => {
    const getErrors = collectConsoleErrors(page);
    await loginViaAPI(page, baseURL!);

    const routes = [
      '/',
      '/atlas',
      // '/waiting' excluded — requires form_id query param, shows ErrorBoundary without it (expected)
      '/result',
      '/thank-you',
      '/form/1',
      '/admin/settings',
      '/admin/forms/new',
      '/admin/form/1',
      '/admin/form/1/summary',
      '/admin/form/2/summary',
      '/admin/form/3/summary',
    ];

    const results: { route: string; error: string | null }[] = [];

    for (const route of routes) {
      await page.goto(route);
      await waitForPageSettle(page);
      const error = await checkForErrorBoundary(page);
      results.push({ route, error });

      if (error) {
        await takeScreenshot(page, `ERROR-${route.replace(/\//g, '_')}`);
      }
    }

    // Report all errors at once
    const failures = results.filter((r) => r.error !== null);
    if (failures.length > 0) {
      const report = failures
        .map((f) => `  ${f.route}: ${f.error}`)
        .join('\n');
      throw new Error(
        `ErrorBoundary detected on ${failures.length} route(s):\n${report}`,
      );
    }

    const pageErrors = getErrors().filter((e) => e.type === 'pageerror');
    if (pageErrors.length > 0) {
      const report = pageErrors
        .map((e) => `  ${e.url}: ${e.text}`)
        .join('\n');
      throw new Error(
        `JavaScript errors detected on ${pageErrors.length} page(s):\n${report}`,
      );
    }
  });
});

test.describe('Console Error Detection', () => {
  test('No JavaScript errors thrown during full navigation', async ({ page, baseURL }) => {
    const getErrors = collectConsoleErrors(page);
    await loginViaAPI(page, baseURL!);

    // Navigate through all main routes
    const routes = ['/', '/atlas', '/admin/form/1', '/admin/form/1/summary'];
    for (const route of routes) {
      await page.goto(route);
      await waitForPageSettle(page);
    }

    const errors = getErrors();
    const pageErrors = errors.filter((e) => e.type === 'pageerror');

    // Fail if any ReferenceError or TypeError occurred
    const importErrors = pageErrors.filter(
      (e) =>
        e.text.includes('is not defined') ||
        e.text.includes("Can't find variable") ||
        e.text.includes('Cannot find variable'),
    );

    expect(
      importErrors,
      'Missing import errors (like the MessageSquare bug)',
    ).toHaveLength(0);
  });
});
