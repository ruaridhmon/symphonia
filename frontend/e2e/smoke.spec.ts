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

  test('page title contains "Log in"', async ({ page }) => {
    await expect(page).toHaveTitle(/Log in/i);
  });

  test('email input is present and focusable', async ({ page }) => {
    const emailInput = page.getByRole('textbox', { name: 'Email address' });
    await expect(emailInput).toBeVisible();
    await expect(emailInput).toHaveAttribute('type', 'email');
  });

  test('password input is present', async ({ page }) => {
    const passwordInput = page.getByRole('textbox', { name: 'Password' });
    await expect(passwordInput).toBeVisible();
  });

  test('Sign in button is present and enabled', async ({ page }) => {
    const button = page.getByRole('button', { name: 'Sign in' });
    await expect(button).toBeVisible();
    await expect(button).toBeEnabled();
  });

  test('"Create account" registration link is present', async ({ page }) => {
    const link = page.getByRole('link', { name: 'Create account' });
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute('href', '/register');
  });
});
