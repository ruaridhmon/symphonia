import { test, expect } from '@playwright/test';

/**
 * Full E2E journey tests — require BOTH frontend (:5173) AND backend (:8000).
 *
 * Start backend first:
 *   cd backend && uvicorn main:app --reload --port 8000
 *
 * Then run:
 *   npm run test:e2e
 *
 * Default seed credentials:
 *   Admin:       antreas@axiotic.ai / test123
 *   Participant: participant@test.com / test123
 */

const ADMIN_EMAIL = 'antreas@axiotic.ai';
const ADMIN_PASSWORD = 'test123';

test.describe('Admin journey', () => {
  test('admin can log in and see dashboard', async ({ page }) => {
    await page.goto('/login');

    await page.fill('#login-email', ADMIN_EMAIL);
    await page.fill('#login-password', ADMIN_PASSWORD);
    await page.getByRole('button', { name: 'Sign In' }).click();

    // Should redirect to admin dashboard after login
    await page.waitForURL(url => !url.pathname.includes('/login'), { timeout: 10_000 });
    const path = new URL(page.url()).pathname;
    expect(['/admin', '/admin/', '/']).toContain(path.replace(/\/$/, '') || '/');
  });

  test('admin dashboard shows Create New Form button', async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.fill('#login-email', ADMIN_EMAIL);
    await page.fill('#login-password', ADMIN_PASSWORD);
    await page.getByRole('button', { name: 'Sign In' }).click();
    await page.waitForURL(url => !url.pathname.includes('/login'), { timeout: 10_000 });

    // Check for the core admin UI element
    const createButton = page.getByRole('button', { name: /create/i })
      .or(page.getByRole('link', { name: /create/i }))
      .or(page.getByRole('button', { name: /new form/i }));
    await expect(createButton.first()).toBeVisible({ timeout: 8_000 });
  });

  test('admin can navigate to form creation', async ({ page }) => {
    await page.goto('/login');
    await page.fill('#login-email', ADMIN_EMAIL);
    await page.fill('#login-password', ADMIN_PASSWORD);
    await page.getByRole('button', { name: 'Sign In' }).click();
    await page.waitForURL(url => !url.pathname.includes('/login'), { timeout: 10_000 });

    // Navigate to new form page
    await page.goto('/admin/forms/new');
    await expect(page).not.toHaveURL(/login/);
  });
});

test.describe('Auth flows', () => {
  test('invalid credentials show error', async ({ page }) => {
    await page.goto('/login');
    await page.fill('#login-email', 'wrong@example.com');
    await page.fill('#login-password', 'wrongpassword');
    await page.getByRole('button', { name: 'Sign In' }).click();

    // Should stay on login and show an error
    await expect(page.locator('[role="alert"]')).toBeVisible({ timeout: 8_000 });
    await expect(page).toHaveURL(/login/);
  });

  test('register page loads', async ({ page }) => {
    await page.goto('/register');
    await expect(page.locator('input[type="email"]')).toBeVisible();
  });
});
