import { test, expect } from '@playwright/test';
import { ADMIN_EMAIL, ADMIN_PASSWORD } from './helpers';

/**
 * Mobile responsiveness tests.
 *
 * Verifies key pages render correctly at narrow viewport widths
 * (375px = iPhone SE), without horizontal overflow or broken layouts.
 *
 * All authenticated tests use the inherited admin storageState.
 * Unauthenticated tests (login/register rendering) override storageState.
 */

const MOBILE_VIEWPORT = { width: 375, height: 812 };

test.describe('Mobile — Login page', () => {
  test.use({ viewport: MOBILE_VIEWPORT, storageState: { cookies: [], origins: [] } });

  test('login page renders without horizontal overflow', async ({ page }) => {
    await page.goto('/login');

    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 2);

    await expect(page.locator('#login-email')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible();
  });

  test('login form inputs fit within viewport', async ({ page }) => {
    await page.goto('/login');

    const emailBox = await page.locator('#login-email').boundingBox();
    expect(emailBox).not.toBeNull();
    if (emailBox) {
      expect(emailBox.x).toBeGreaterThanOrEqual(0);
      expect(emailBox.x + emailBox.width).toBeLessThanOrEqual(MOBILE_VIEWPORT.width + 2);
    }
  });
});

test.describe('Mobile — Register page', () => {
  test.use({ viewport: MOBILE_VIEWPORT, storageState: { cookies: [], origins: [] } });

  test('register page renders without horizontal overflow', async ({ page }) => {
    await page.goto('/register');

    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 2);

    await expect(page.locator('#register-email')).toBeVisible();
    await expect(page.getByRole('button', { name: /Create Account/i })).toBeVisible();
  });
});

test.describe('Mobile — Admin Dashboard', () => {
  test.use({ viewport: MOBILE_VIEWPORT });

  test('dashboard renders without horizontal overflow', async ({ page }) => {
    await page.goto('/');

    await expect(
      page.getByRole('heading', { name: /Admin Dashboard/i }),
    ).toBeVisible({ timeout: 8_000 });

    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 2);
  });

  test('mobile hamburger menu is visible at 375px', async ({ page }) => {
    await page.goto('/');

    await expect(
      page.getByRole('heading', { name: /Admin Dashboard/i }),
    ).toBeVisible({ timeout: 8_000 });

    const hamburger = page.getByLabel(/open menu/i);
    await expect(hamburger).toBeVisible({ timeout: 3_000 });
  });

  test('hamburger opens mobile nav with Log out', async ({ page }) => {
    await page.goto('/');

    const hamburger = page.getByLabel(/open menu/i);
    await expect(hamburger).toBeVisible({ timeout: 8_000 });
    await hamburger.click();

    const mobileMenu = page.locator('#mobile-nav-menu');
    await expect(mobileMenu).toBeVisible({ timeout: 3_000 });
    await expect(mobileMenu.getByText('Log out')).toBeVisible();
  });
});

test.describe('Mobile — Template picker', () => {
  test.use({ viewport: MOBILE_VIEWPORT });

  test('template picker renders at 375px without overflow', async ({ page }) => {
    await page.goto('/admin/forms/new');

    await expect(
      page.getByRole('heading', { name: /Create a New Form/i }),
    ).toBeVisible({ timeout: 8_000 });

    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 2);
  });
});

test.describe('Mobile — Summary page', () => {
  test.use({ viewport: MOBILE_VIEWPORT });

  test('summary page loads at 375px', async ({ page }) => {
    await page.goto('/admin/form/1/summary');

    await expect(page.getByText(/AI in Education/i).first()).toBeVisible({ timeout: 12_000 });
  });

  test('sidebar toggle visible on mobile', async ({ page }) => {
    await page.goto('/admin/form/1/summary');

    await expect(page.getByText(/AI in Education/i).first()).toBeVisible({ timeout: 12_000 });

    const toggleBtn = page.locator('.summary-sidebar-toggle');
    await expect(toggleBtn).toBeVisible();
  });

  test('sidebar can be toggled open on mobile', async ({ page }) => {
    await page.goto('/admin/form/1/summary');

    const toggleBtn = page.locator('.summary-sidebar-toggle');
    await expect(toggleBtn).toBeVisible({ timeout: 12_000 });
    await toggleBtn.click();

    const sidebar = page.locator('[role="complementary"][aria-label="Synthesis controls"]');
    await expect(sidebar).toBeVisible({ timeout: 3_000 });
  });
});
