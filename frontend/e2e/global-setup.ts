import { chromium, type FullConfig } from '@playwright/test';

/**
 * Global setup: logs in as admin and saves browser state
 * (localStorage, cookies) to a JSON file that all tests can reuse.
 */
const STORAGE_STATE_PATH = 'e2e/.auth/admin.json';

async function globalSetup(config: FullConfig) {
  const baseURL = config.projects[0].use.baseURL ?? 'http://localhost:8767';

  const browser = await chromium.launch();
  const page = await browser.newPage({ baseURL });

  // Login as admin
  await page.goto('/login');
  await page.fill('#login-email', 'antreas@axiotic.ai');
  await page.fill('#login-password', 'test123');
  await page.getByRole('button', { name: 'Sign In' }).click();

  // Wait for navigation away from login page
  await page.waitForURL(url => !url.pathname.includes('/login'), { timeout: 15_000 });

  // Save storage state (localStorage + cookies)
  await page.context().storageState({ path: STORAGE_STATE_PATH });

  await browser.close();
}

export default globalSetup;
