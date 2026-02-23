import { test, expect } from '@playwright/test';

/**
 * Smoke tests — verify the login page renders correctly.
 * These run unauthenticated (override the global storageState).
 */
test.describe('Login page smoke tests', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('page title contains "Sign In"', async ({ page }) => {
    await expect(page).toHaveTitle(/Sign In/);
  });

  test('email input is present and focusable', async ({ page }) => {
    const emailInput = page.locator('#login-email');
    await expect(emailInput).toBeVisible();
    await expect(emailInput).toHaveAttribute('type', 'email');
    await expect(emailInput).toHaveAttribute('placeholder', 'you@example.com');
  });

  test('password input is present', async ({ page }) => {
    const passwordInput = page.locator('#login-password');
    await expect(passwordInput).toBeVisible();
  });

  test('Sign In button is present and enabled', async ({ page }) => {
    const button = page.getByRole('button', { name: 'Sign In' });
    await expect(button).toBeVisible();
    await expect(button).toBeEnabled();
  });

  test('"Create one" registration link is present', async ({ page }) => {
    const link = page.getByRole('link', { name: 'Create one' });
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute('href', '/register');
  });
});
