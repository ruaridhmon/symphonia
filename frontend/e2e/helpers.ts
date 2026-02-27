import { type Page } from '@playwright/test';

/**
 * Shared test helpers for Symphonia E2E tests.
 *
 * Default seed credentials:
 *   Admin:       antreas@axiotic.ai / test123
 *   Participant: participant@test.com / test123
 *
 * Auth note: The global setup (global-setup.ts) logs in as admin and stores
 * the browser state in e2e/.auth/admin.json. Most tests inherit this via
 * storageState in playwright.config.ts, so they are already authenticated.
 *
 * Only use loginAsAdmin() when testing the login FLOW itself — most tests
 * don't need it because they already have auth state.
 */

export const ADMIN_EMAIL = 'antreas@axiotic.ai';
export const ADMIN_PASSWORD = 'test123';
export const AUTH_STORAGE_STATE = 'e2e/.auth/admin.json';

/**
 * Log in as admin via the UI. Use this only when testing login flow itself.
 * For regular authenticated tests, rely on the inherited storageState.
 */
export async function loginAsAdmin(page: Page): Promise<void> {
  await page.goto('/login');
  await page.fill('#login-email', ADMIN_EMAIL);
  await page.fill('#login-password', ADMIN_PASSWORD);
  await page.getByRole('button', { name: 'Sign In' }).click();
  await page.waitForURL(url => !url.pathname.includes('/login'), { timeout: 15_000 });
}

/**
 * Clear auth state (for testing unauthenticated flows).
 */
export async function clearAuth(page: Page): Promise<void> {
  await page.evaluate(() => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('is_admin');
    localStorage.removeItem('email');
  });
}
