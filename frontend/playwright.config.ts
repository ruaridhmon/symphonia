import { defineConfig, devices } from '@playwright/test';

/**
 * Symphonia E2E Test Configuration
 *
 * Smoke tests (e2e/smoke.spec.ts)  — no backend needed, just checks static UI
 * Journey tests (e2e/journey.spec.ts) — requires backend on :8000 + frontend on :5173
 *
 * Run smoke only:  npm run test:e2e:smoke
 * Run all:         npm run test:e2e
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'list',
  timeout: 30_000,

  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  /* Start the Vite dev server before tests — reuse if already running */
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
