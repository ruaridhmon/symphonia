import { defineConfig, devices } from '@playwright/test';

/**
 * Symphonia E2E Test Configuration
 *
 * All tests run against the FastAPI backend (default :8767) which serves
 * both the built frontend and the API.
 *
 * Override the base URL with:  PLAYWRIGHT_BASE_URL=http://localhost:8767
 *
 * Global setup logs in as admin once and saves storageState so individual
 * tests don't each need to perform login (avoids rate-limiting).
 *
 * Run smoke only:  npm run test:e2e:smoke
 * Run all:         npm run test:e2e
 */
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:8767';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : 4,
  reporter: 'list',
  timeout: 30_000,

  globalSetup: './e2e/global-setup.ts',

  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    storageState: 'e2e/.auth/admin.json',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
