import { test, expect } from '@playwright/test';
import { ADMIN_EMAIL, ADMIN_PASSWORD } from './helpers';

/**
 * Full E2E journey tests — require the FastAPI backend serving the frontend.
 *
 * Default seed credentials:
 *   Admin:       antreas@axiotic.ai / test123
 */

test.describe('Admin journey', () => {
  // These tests use the inherited admin storageState (already logged in)

  test('admin can see dashboard', async ({ page }) => {
    await page.goto('/');

    await expect(
      page.getByRole('heading', { name: /Admin Dashboard/i }),
    ).toBeVisible({ timeout: 10_000 });
  });

  test('admin dashboard shows New Form button', async ({ page }) => {
    await page.goto('/');

    const createButton = page.getByRole('button', { name: /new form/i });
    await expect(createButton).toBeVisible({ timeout: 8_000 });
  });

  test('admin can navigate to form creation', async ({ page }) => {
    await page.goto('/admin/forms/new');
    await expect(page).not.toHaveURL(/login/);
    await expect(
      page.getByRole('heading', { name: /Create a New Form/i }),
    ).toBeVisible({ timeout: 8_000 });
  });
});

test.describe('Auth flows', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('invalid credentials keep user on login', async ({ page }) => {
    await page.goto('/login');
    await page.fill('#login-email', 'wrong@example.com');
    await page.fill('#login-password', 'wrongpassword');
    await page.getByRole('button', { name: 'Sign In' }).click();

    // Should stay on login
    await page.waitForTimeout(3000);
    await expect(page).toHaveURL(/login/);
  });

  test('register page loads', async ({ page }) => {
    await page.goto('/register');
    await expect(page.locator('input[type="email"]')).toBeVisible();
  });
});
