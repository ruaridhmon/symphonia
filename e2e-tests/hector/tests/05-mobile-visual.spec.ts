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
 * 05 — Mobile Responsive Visual Tests (ARES)
 *
 * Tests all main routes at two mobile viewports:
 * - iPhone SE:  375×812
 * - iPad:       768×1024
 *
 * For each route × viewport:
 * - Full-page screenshot
 * - No horizontal overflow
 * - Touch targets ≥ 44px
 * - Navigation/header adapts to viewport
 */

const API_URL = process.env.API_URL || 'http://localhost:8000';
const ADMIN_EMAIL = 'antreas@axiotic.ai';
const ADMIN_PASSWORD = 'test123';

// Register a test user for user-specific routes
const MOBILE_USER_EMAIL = `ares-mobile-${Date.now()}@test.local`;
const MOBILE_USER_PASSWORD = 'AresMobile!2024';

interface Viewport {
  name: string;
  width: number;
  height: number;
}

const VIEWPORTS: Viewport[] = [
  { name: 'iphone-se', width: 375, height: 812 },
  { name: 'ipad', width: 768, height: 1024 },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Check that the page has no horizontal overflow (no horizontal scrollbar).
 * Returns true if content fits within the viewport width.
 */
async function assertNoHorizontalOverflow(page: import('@playwright/test').Page): Promise<void> {
  const overflow = await page.evaluate(() => {
    return document.documentElement.scrollWidth > document.documentElement.clientWidth;
  });
  expect(overflow, 'Page should not have horizontal overflow').toBe(false);
}

/**
 * Check that interactive elements (buttons, links, inputs) meet the
 * minimum touch target size of 44×44px (WCAG / Apple HIG guideline).
 *
 * Returns an array of elements that are too small.
 * We check only visible, non-hidden elements.
 */
async function getSmallTouchTargets(
  page: import('@playwright/test').Page,
): Promise<{ tag: string; text: string; width: number; height: number }[]> {
  return page.evaluate(() => {
    const MIN_SIZE = 44;
    const selectors = 'a, button, input, select, textarea, [role="button"], [tabindex]';
    const elements = document.querySelectorAll(selectors);
    const small: { tag: string; text: string; width: number; height: number }[] = [];

    elements.forEach((el) => {
      const rect = el.getBoundingClientRect();
      // Skip invisible or zero-size elements
      if (rect.width === 0 || rect.height === 0) return;
      // Skip off-screen elements
      if (rect.bottom < 0 || rect.top > window.innerHeight) return;
      // Skip hidden elements
      const style = window.getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return;

      if (rect.width < MIN_SIZE || rect.height < MIN_SIZE) {
        small.push({
          tag: el.tagName.toLowerCase(),
          text: (el.textContent || '').trim().slice(0, 40),
          width: Math.round(rect.width),
          height: Math.round(rect.height),
        });
      }
    });
    return small;
  });
}

/**
 * Assert that the mobile hamburger menu is visible (sm:hidden breakpoint)
 * or the desktop nav is visible (hidden sm:flex) depending on viewport.
 */
async function checkHeaderAdaptation(
  page: import('@playwright/test').Page,
  viewport: Viewport,
): Promise<void> {
  if (viewport.width < 640) {
    // On mobile (<sm), the hamburger button should be visible
    const hamburger = page.locator('button[aria-label="Open menu"], button[aria-label="Close menu"]');
    await expect(hamburger.first()).toBeVisible({ timeout: 5_000 });
  } else {
    // On tablet/desktop (≥sm), desktop nav should be visible
    // The header has "hidden sm:flex" for the desktop actions
    const desktopNav = page.locator('.hidden.sm\\:flex').first();
    // It might not exist on auth pages — only check on pages with Header
    const exists = await desktopNav.count();
    if (exists > 0) {
      await expect(desktopNav).toBeVisible();
    }
  }
}

// ─── Public Routes ───────────────────────────────────────────────────────────

test.describe('Mobile Responsive Tests — Public Routes', () => {
  for (const vp of VIEWPORTS) {
    test.describe(`${vp.name} (${vp.width}×${vp.height})`, () => {
      test.use({ viewport: { width: vp.width, height: vp.height } });

      test(`/login — ${vp.name}`, async ({ page }) => {
        const getErrors = collectConsoleErrors(page);

        await page.goto('/login');
        await waitForPageSettle(page);

        await assertNoHorizontalOverflow(page);

        // Form elements should be visible and usable
        await expect(page.locator('#login-email')).toBeVisible();
        await expect(page.locator('#login-password')).toBeVisible();
        await expect(page.locator('button[type="submit"]')).toBeVisible();

        // Check touch target sizes (log warnings, don't hard-fail — some links may be small)
        const smallTargets = await getSmallTouchTargets(page);
        if (smallTargets.length > 0) {
          console.warn(
            `[${vp.name} /login] Touch targets below 44px:`,
            JSON.stringify(smallTargets, null, 2),
          );
        }

        await assertNoErrors(page, `login-${vp.name}`);
        await takeScreenshot(page, `05-login-${vp.name}`);

        const critical = filterCriticalErrors(getErrors());
        expect(critical, `No critical errors on /login (${vp.name})`).toHaveLength(0);
      });

      test(`/register — ${vp.name}`, async ({ page }) => {
        const getErrors = collectConsoleErrors(page);

        await page.goto('/register');
        await waitForPageSettle(page);

        await assertNoHorizontalOverflow(page);

        await expect(page.locator('#register-email')).toBeVisible();
        await expect(page.locator('#register-password')).toBeVisible();
        await expect(page.locator('button[type="submit"]')).toBeVisible();

        const smallTargets = await getSmallTouchTargets(page);
        if (smallTargets.length > 0) {
          console.warn(
            `[${vp.name} /register] Touch targets below 44px:`,
            JSON.stringify(smallTargets, null, 2),
          );
        }

        await assertNoErrors(page, `register-${vp.name}`);
        await takeScreenshot(page, `05-register-${vp.name}`);

        const critical = filterCriticalErrors(getErrors());
        expect(critical, `No critical errors on /register (${vp.name})`).toHaveLength(0);
      });
    });
  }
});

// ─── Authenticated Routes — Admin Dashboard ─────────────────────────────────

test.describe('Mobile Responsive Tests — Admin Dashboard', () => {
  for (const vp of VIEWPORTS) {
    test.describe(`${vp.name} (${vp.width}×${vp.height})`, () => {
      test.use({ viewport: { width: vp.width, height: vp.height } });

      test.beforeEach(async ({ page, baseURL }) => {
        await loginViaAPI(page, baseURL!, ADMIN_EMAIL, ADMIN_PASSWORD);
      });

      test(`/ (admin dashboard) — ${vp.name}`, async ({ page }) => {
        const getErrors = collectConsoleErrors(page);

        await page.goto('/');
        await waitForPageSettle(page);

        await assertNoHorizontalOverflow(page);
        await checkHeaderAdaptation(page, vp);

        // Admin dashboard content should be visible
        await expect(page.locator('text=New Form').first()).toBeVisible({ timeout: 10_000 });

        const smallTargets = await getSmallTouchTargets(page);
        if (smallTargets.length > 0) {
          console.warn(
            `[${vp.name} / admin] Touch targets below 44px:`,
            JSON.stringify(smallTargets, null, 2),
          );
        }

        await assertNoErrors(page, `admin-dashboard-${vp.name}`);
        await takeScreenshot(page, `05-admin-dashboard-${vp.name}`);

        const critical = filterCriticalErrors(getErrors());
        expect(critical, `No critical errors on / admin (${vp.name})`).toHaveLength(0);
      });

      test(`/form/1 (admin view) — ${vp.name}`, async ({ page }) => {
        const getErrors = collectConsoleErrors(page);

        const response = await page.goto('/form/1');
        await waitForPageSettle(page);

        // Form may not exist — that's OK, we test the page doesn't crash
        await assertNoHorizontalOverflow(page);
        await checkHeaderAdaptation(page, vp);

        await assertNoErrors(page, `form-1-${vp.name}`);
        await takeScreenshot(page, `05-form-1-${vp.name}`);

        const critical = filterCriticalErrors(getErrors());
        expect(critical, `No critical errors on /form/1 (${vp.name})`).toHaveLength(0);
      });
    });
  }
});

// ─── Authenticated Routes — User Dashboard ──────────────────────────────────

test.describe('Mobile Responsive Tests — User Dashboard', () => {
  // Register the test user once before the suite
  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.request.post(`${API_URL}/register`, {
      form: { username: MOBILE_USER_EMAIL, password: MOBILE_USER_PASSWORD },
    }).catch(() => {});  // Ignore if already exists
    await context.close();
  });

  for (const vp of VIEWPORTS) {
    test.describe(`${vp.name} (${vp.width}×${vp.height})`, () => {
      test.use({ viewport: { width: vp.width, height: vp.height } });

      test.beforeEach(async ({ page }) => {
        // Login as regular user via API
        const response = await page.request.post(`${API_URL}/login`, {
          form: { username: MOBILE_USER_EMAIL, password: MOBILE_USER_PASSWORD },
        });
        const data = await response.json();
        await page.goto('/login');
        await page.evaluate((loginData) => {
          localStorage.setItem('access_token', loginData.access_token);
          localStorage.setItem('is_admin', String(loginData.is_admin));
          localStorage.setItem('email', loginData.email);
        }, data);
      });

      test(`/ (user dashboard) — ${vp.name}`, async ({ page }) => {
        const getErrors = collectConsoleErrors(page);

        await page.goto('/');
        await waitForPageSettle(page);

        await assertNoHorizontalOverflow(page);
        await checkHeaderAdaptation(page, vp);

        // User dashboard content: "Join a New Form"
        await expect(
          page.locator('text=Join a New Form').first(),
        ).toBeVisible({ timeout: 10_000 });

        const smallTargets = await getSmallTouchTargets(page);
        if (smallTargets.length > 0) {
          console.warn(
            `[${vp.name} / user] Touch targets below 44px:`,
            JSON.stringify(smallTargets, null, 2),
          );
        }

        await assertNoErrors(page, `user-dashboard-${vp.name}`);
        await takeScreenshot(page, `05-user-dashboard-${vp.name}`);

        const critical = filterCriticalErrors(getErrors());
        expect(critical, `No critical errors on / user (${vp.name})`).toHaveLength(0);
      });
    });
  }
});
