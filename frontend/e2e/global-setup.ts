import { chromium, type FullConfig } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'fs';
import { dirname } from 'path';

/**
 * Global setup: logs in as admin and saves browser state
 * (localStorage, cookies) to a JSON file that all tests can reuse.
 *
 * If the backend server is unreachable (e.g. CI without a running backend)
 * the setup writes an empty auth state and exits cleanly.
 * Smoke tests that override storageState are unaffected.
 */
const STORAGE_STATE_PATH = 'e2e/.auth/admin.json';

async function globalSetup(config: FullConfig) {
  // Ensure the auth directory exists before anything else
  mkdirSync(dirname(STORAGE_STATE_PATH), { recursive: true });

  // In CI without an explicit backend URL, skip the login attempt entirely.
  // Smoke tests override storageState anyway, so empty auth is fine.
  if (process.env.CI && !process.env.E2E_BACKEND_URL) {
    console.log('ℹ CI mode: no backend configured — writing empty auth state.');
    writeFileSync(STORAGE_STATE_PATH, JSON.stringify({ cookies: [], origins: [] }));
    return;
  }

  const baseURL = process.env.E2E_BACKEND_URL
    ?? config.projects[0].use.baseURL
    ?? 'http://localhost:8767';

  // Ensure the auth directory exists
  const authDir = path.dirname(STORAGE_STATE_PATH);
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
  }

  const browser = await chromium.launch();
  const page = await browser.newPage({ baseURL });

  try {
    // Login as admin
    await page.goto('/login', { timeout: 10_000 });
    await page.fill('#login-email', 'antreas@axiotic.ai');
    await page.fill('#login-password', 'test123');
    await page.getByRole('button', { name: 'Sign In' }).click();

    // Wait for navigation away from login page
    await page.waitForURL(url => !url.pathname.includes('/login'), { timeout: 15_000 });

    // Save storage state (localStorage + cookies)
    await page.context().storageState({ path: STORAGE_STATE_PATH });
    console.log('✓ Admin auth saved to', STORAGE_STATE_PATH);
  } catch (err) {
    // Server unreachable — write empty state so tests can still run.
    console.warn(`⚠ Global setup: login failed, writing empty auth state. (${err})`);
    writeFileSync(STORAGE_STATE_PATH, JSON.stringify({ cookies: [], origins: [] }));
  } finally {
    await browser.close();
  }
}

export default globalSetup;
