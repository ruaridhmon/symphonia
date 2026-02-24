import { defineConfig, devices } from '@playwright/test';

/**
 * Hector's Symphonia E2E Test Configuration
 *
 * Targets a local Symphonia instance by default.
 * Override with: BASE_URL=https://symphonia.axiotic.ai npx playwright test
 */
export default defineConfig({
  testDir: './tests',
  fullyParallel: false, // Sequential — we share auth state
  forbidOnly: true,
  retries: 1,
  workers: 1,
  reporter: [
    ['list'],
    ['json', { outputFile: 'test-results.json' }],
  ],
  timeout: 30_000,
  expect: {
    timeout: 10_000,
  },
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'off', // We take our own screenshots
    video: 'off',
    actionTimeout: 10_000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  outputDir: './test-results/',
});
