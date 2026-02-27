import { test, expect } from '@playwright/test';
import { ADMIN_EMAIL, ADMIN_PASSWORD, clearAuth } from './helpers';

/**
 * Authentication flow tests.
 *
 * NOTE: Tests in this file that check login/register/unauthenticated behavior
 * override storageState to {} (empty) so they start unauthenticated.
 *
 * Tests that verify post-login behavior use the inherited admin storageState.
 */

test.describe('Login page rendering', () => {
  // Start unauthenticated for these
  test.use({ storageState: { cookies: [], origins: [] } });

  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('page title contains "Sign In"', async ({ page }) => {
    await expect(page).toHaveTitle(/Sign In/);
  });

  test('email and password inputs are visible', async ({ page }) => {
    const emailInput = page.locator('#login-email');
    const passwordInput = page.locator('#login-password');
    await expect(emailInput).toBeVisible();
    await expect(emailInput).toHaveAttribute('type', 'email');
    await expect(passwordInput).toBeVisible();
  });

  test('Sign In button is visible and enabled', async ({ page }) => {
    const button = page.getByRole('button', { name: 'Sign In' });
    await expect(button).toBeVisible();
    await expect(button).toBeEnabled();
  });

  test('registration link points to /register', async ({ page }) => {
    const link = page.getByRole('link', { name: 'Create one' });
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute('href', '/register');
  });
});

test.describe('Login with credentials', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('invalid credentials keep user on login page', async ({ page }) => {
    await page.goto('/login');
    await page.fill('#login-email', 'wrong@example.com');
    await page.fill('#login-password', 'wrongpassword');
    await page.getByRole('button', { name: 'Sign In' }).click();

    // The app may redirect to /login?expired=1 or show an error
    await page.waitForTimeout(3000);
    await expect(page).toHaveURL(/login/);
  });

  test('valid admin credentials redirect to dashboard', async ({ page }) => {
    await page.goto('/login');
    await page.fill('#login-email', ADMIN_EMAIL);
    await page.fill('#login-password', ADMIN_PASSWORD);
    await page.getByRole('button', { name: 'Sign In' }).click();

    await page.waitForURL(url => !url.pathname.includes('/login'), { timeout: 15_000 });
    await expect(
      page.getByRole('heading', { name: /Admin Dashboard/i }),
    ).toBeVisible({ timeout: 10_000 });
  });
});

test.describe('Register page', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test.beforeEach(async ({ page }) => {
    await page.goto('/register');
  });

  test('page title contains "Register"', async ({ page }) => {
    await expect(page).toHaveTitle(/Register/);
  });

  test('shows email and password fields', async ({ page }) => {
    await expect(page.locator('#register-email')).toBeVisible();
    await expect(page.locator('#register-password')).toBeVisible();
  });

  test('shows Create Account button', async ({ page }) => {
    await expect(
      page.getByRole('button', { name: /Create Account/i }),
    ).toBeVisible();
  });

  test('shows sign-in link for existing users', async ({ page }) => {
    const link = page.getByRole('link', { name: /Sign in/i });
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute('href', '/login');
  });
});

test.describe('Logout flow', () => {
  // Use admin storageState (inherited default)

  test('clicking "Log out" returns to login page', async ({ page }) => {
    await page.goto('/');
    await expect(
      page.getByRole('heading', { name: /Admin Dashboard/i }),
    ).toBeVisible({ timeout: 10_000 });

    const logoutBtn = page.getByRole('button', { name: /Log out/i }).first();
    await logoutBtn.click();

    await page.waitForURL(/login/, { timeout: 8_000 });
    await expect(page).toHaveURL(/login/);
  });
});

test.describe('Protected route guards', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('accessing / without auth redirects to login', async ({ page }) => {
    await page.goto('/');
    await page.waitForURL(/login/, { timeout: 8_000 });
    await expect(page).toHaveURL(/login/);
  });

  test('accessing /admin/forms/new without auth redirects to login', async ({ page }) => {
    await page.goto('/admin/forms/new');
    await page.waitForURL(/login/, { timeout: 8_000 });
    await expect(page).toHaveURL(/login/);
  });

  test('accessing /admin/form/1/summary without auth redirects to login', async ({ page }) => {
    await page.goto('/admin/form/1/summary');
    await page.waitForURL(/login/, { timeout: 8_000 });
    await expect(page).toHaveURL(/login/);
  });
});
