import { Page, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const SCREENSHOTS_DIR = path.join(__dirname, '..', 'screenshots');

// Ensure screenshots directory exists
if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

/**
 * Known Symphonia ErrorBoundary title patterns.
 * These appear as <h2> text when a component crashes.
 */
const ERROR_BOUNDARY_TITLES = [
  'Login Error',
  'Registration Error',
  'Dashboard Error',
  'Atlas Error',
  'Waiting Page Error',
  'Result Page Error',
  'Thank You Page Error',
  'Form Submission Error',
  'Settings Error',
  'New Form Error',
  'Form Editor Error',
  'Summary Page Error',
  'Page Error',
];

/**
 * Error text patterns that indicate something has gone wrong.
 */
const ERROR_TEXT_PATTERNS = [
  "Can't find variable",
  'Cannot find variable',
  'is not defined',
  'Something went wrong',
  'Unexpected error',
  'ReferenceError',
  'TypeError',
];

/**
 * Console error messages collected during page navigation.
 */
export interface ConsoleError {
  type: string;
  text: string;
  url: string;
}

/**
 * Check the DOM for Symphonia's ErrorBoundary pattern.
 *
 * The ErrorBoundary renders:
 * - A ⚠ icon in a red circle
 * - An h2 with a title like "Summary Page Error"
 * - An error message in monospace
 * - A "Try Again" button
 *
 * Returns null if no error found, or an error description string.
 */
export async function checkForErrorBoundary(page: Page): Promise<string | null> {
  // Check for the warning icon character
  const warningIcon = await page.locator('text=⚠').first().isVisible().catch(() => false);

  // Check for known error boundary titles
  for (const title of ERROR_BOUNDARY_TITLES) {
    const titleVisible = await page.locator(`h2:has-text("${title}")`).first().isVisible().catch(() => false);
    if (titleVisible) {
      // Try to get the error message too
      const errorMsg = await page.locator('p[style*="monospace"]').first().textContent().catch(() => null);
      return `ErrorBoundary detected: "${title}"${errorMsg ? ` — ${errorMsg}` : ''}`;
    }
  }

  // Check for error text patterns in the whole page
  const bodyText = await page.locator('body').textContent().catch(() => '');
  for (const pattern of ERROR_TEXT_PATTERNS) {
    if (bodyText?.includes(pattern)) {
      return `Error text detected: "${pattern}" found in page body`;
    }
  }

  // If only the warning icon is visible with no matching title, could still be an error
  if (warningIcon) {
    // Check if there's also a "Try Again" button nearby (ErrorBoundary signature)
    const tryAgainVisible = await page.locator('button:has-text("Try Again"), button:has-text("try again")').first().isVisible().catch(() => false);
    if (tryAgainVisible) {
      return 'ErrorBoundary detected: warning icon + Try Again button present';
    }
  }

  return null;
}

/**
 * Assert that no ErrorBoundary or error pattern is present on the page.
 * Fails the test immediately if one is detected.
 */
export async function assertNoErrors(page: Page, context: string = ''): Promise<void> {
  const error = await checkForErrorBoundary(page);
  if (error) {
    const prefix = context ? `[${context}] ` : '';
    throw new Error(`${prefix}${error}`);
  }
}

/**
 * Take a full-page screenshot and save it to the screenshots directory.
 */
export async function takeScreenshot(page: Page, name: string): Promise<string> {
  const filename = `${name.replace(/[^a-zA-Z0-9_-]/g, '_')}.png`;
  const filepath = path.join(SCREENSHOTS_DIR, filename);
  await page.screenshot({ path: filepath, fullPage: true });
  return filepath;
}

/**
 * Set up console error collection for a page.
 * Returns a function to get collected errors.
 */
export function collectConsoleErrors(page: Page): () => ConsoleError[] {
  const errors: ConsoleError[] = [];

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      errors.push({
        type: msg.type(),
        text: msg.text(),
        url: page.url(),
      });
    }
  });

  page.on('pageerror', (error) => {
    errors.push({
      type: 'pageerror',
      text: error.message,
      url: page.url(),
    });
  });

  return () => [...errors];
}

/**
 * Filter out non-critical console errors.
 * These are known React dev warnings, CORS noise, infra issues, etc. — not app bugs.
 * We focus on detecting: ReferenceErrors, TypeErrors, missing imports, component crashes.
 */
export function filterCriticalErrors(errors: ConsoleError[]): ConsoleError[] {
  return errors.filter((e) => {
    const t = e.text;
    // Ignore favicon/asset 404s
    if (t.includes('favicon') || t.includes('404')) return false;
    // Ignore React DOM nesting warnings (cosmetic, not crashes)
    if (t.includes('validateDOMNesting')) return false;
    // Ignore CORS errors from dev environment (cross-origin between :3000 and :8000)
    if (t.includes('CORS policy') || t.includes('Access-Control-Allow-Origin')) return false;
    // Ignore network failures (CORS-related, not app bugs)
    if (t.includes('net::ERR_FAILED')) return false;
    if (t.includes('Failed to load resource')) return false;
    // Ignore React dev-mode warnings
    if (t.includes('Warning:') && !t.includes('Error')) return false;
    // Ignore fetch/JSON parse errors from admin analytics (dev env issue)
    if (t.includes('fetch failed') && t.includes('SyntaxError')) return false;
    // Ignore auth-related 401s (expected when testing with localStorage tokens)
    if (t.includes('401') || t.includes('Unauthorized')) return false;
    // Ignore 405 Method Not Allowed (proxy routing issues in dev)
    if (t.includes('405') || t.includes('Method Not Allowed')) return false;
    return true;
  });
}

/**
 * Login to Symphonia via the UI.
 */
export async function loginViaUI(
  page: Page,
  email: string = 'admin@test.com',
  password: string = 'testpass123',
): Promise<void> {
  await page.goto('/login');
  await page.waitForLoadState('networkidle');

  // Fill login form — use specific IDs from Login.tsx
  await page.fill('#login-email', email);
  await page.fill('#login-password', password);

  // Submit
  await page.click('button[type="submit"]');

  // Wait for navigation away from login (could be / or /login still if error)
  // Use a more flexible approach: wait for URL to NOT be /login
  try {
    await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 15_000 });
  } catch {
    // If we're still on login, check if there was an error
    const currentUrl = page.url();
    if (currentUrl.includes('/login')) {
      const errorEl = await page.locator('[role="alert"]').first().textContent().catch(() => null);
      throw new Error(`Login failed — still on /login. Error: ${errorEl || 'unknown'}`);
    }
  }
  await page.waitForLoadState('networkidle');
}

/**
 * Login via API and set cookies/localStorage directly.
 * Faster than UI login for tests that don't test the login flow itself.
 *
 * Uses Playwright's request API (not subject to browser CORS) to hit the
 * backend directly, then sets localStorage in the browser context.
 */
export async function loginViaAPI(
  page: Page,
  baseURL: string,
  email: string = 'admin@test.com',
  password: string = 'testpass123',
): Promise<string> {
  // Playwright's request API bypasses browser CORS, so we can hit backend directly
  const apiBase = process.env.API_URL || 'http://localhost:8000';

  const response = await page.request.post(`${apiBase}/login`, {
    form: {
      username: email,
      password: password,
    },
  });

  const data = await response.json();

  // Navigate to a page in the app to set localStorage on the correct origin
  await page.goto('/login');
  await page.evaluate((loginData) => {
    localStorage.setItem('access_token', loginData.access_token);
    localStorage.setItem('is_admin', String(loginData.is_admin));
    localStorage.setItem('email', loginData.email);
  }, data);

  return data.access_token;
}

/**
 * Wait for the page to fully settle (no pending requests, no loading spinners).
 */
export async function waitForPageSettle(page: Page, timeoutMs: number = 10_000): Promise<void> {
  await page.waitForLoadState('networkidle', { timeout: timeoutMs }).catch(() => {});
  // Also wait for any loading spinners to disappear
  await page.locator('[class*="loading"], [class*="skeleton"], [class*="spinner"]')
    .first()
    .waitFor({ state: 'hidden', timeout: 5_000 })
    .catch(() => {}); // OK if they're not there
}
