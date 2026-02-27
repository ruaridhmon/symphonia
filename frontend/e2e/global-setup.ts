import { chromium, type FullConfig } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Global setup: logs in as admin and saves browser state
 * (localStorage, cookies) to a JSON file that all tests can reuse.
 *
 * If the backend is unavailable (e.g. in CI running smoke-only tests
 * against the Vite dev server), authentication is skipped gracefully
 * and an empty storage state is written so Playwright doesn't crash.
 */
const STORAGE_STATE_PATH = 'e2e/.auth/admin.json';

async function globalSetup(config: FullConfig) {
  const baseURL = config.projects[0].use.baseURL ?? 'http://localhost:8767';

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

    console.log('Global setup: admin auth saved to', STORAGE_STATE_PATH);
  } catch (err) {
    // Backend not available (e.g. CI running smoke tests against Vite dev server only)
    console.warn(
      'Global setup: could not authenticate (backend may not be running).',
      'Writing empty storage state. Smoke tests use { storageState: empty } so this is fine.',
    );

    // Write empty storage state so tests that reference the file don't crash
    fs.writeFileSync(
      STORAGE_STATE_PATH,
      JSON.stringify({ cookies: [], origins: [] }),
    );
  } finally {
    await browser.close();
  }
}

export default globalSetup;
