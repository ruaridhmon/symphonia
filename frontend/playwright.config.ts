import { defineConfig, devices } from '@playwright/test';

/**
 * Symphonia E2E Test Configuration
 *
 * All tests run against the FastAPI backend (default :8767) which serves
 * both the built frontend and the API.
 *
 * In CI (PLAYWRIGHT_BASE_URL not set), uses the Vite dev server on :5173.
 * Smoke tests only check static UI — they don't need the backend API.
 *
 * Override the base URL with:  PLAYWRIGHT_BASE_URL=http://localhost:8767
 *
 * Global setup logs in as admin once and saves storageState so individual
 * tests don't each need to perform login (avoids rate-limiting).
 * In CI without a live backend, global-setup skips auth gracefully.
 *
 * Run smoke only:  npm run test:e2e:smoke
 * Run all:         npm run test:e2e
 */
const isCI = !!process.env.CI;

// In CI: use Vite dev server. Locally: use the full stack on :8767
const baseURL =
  process.env.PLAYWRIGHT_BASE_URL ??
  (isCI ? 'http://localhost:5173' : 'http://localhost:8767');

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: isCI ? 1 : 4,
  reporter: 'list',
  timeout: 30_000,

  // In CI, auto-start the Vite dev server so the frontend is served
  ...(isCI && {
    webServer: {
      command: 'npm run dev -- --port 5173',
      port: 5173,
      reuseExistingServer: false,
      timeout: 60_000,
    },
  }),

  globalSetup: './e2e/global-setup.ts',

  // In CI there is no running backend — build the frontend and serve it via
  // `vite preview` so smoke tests (which only test static UI) can run.
  webServer: process.env.CI
    ? {
        command: 'npm run build && npx vite preview --port 8767 --strictPort',
        url: baseURL,
        reuseExistingServer: false,
        timeout: 120_000,
        stdout: 'ignore',
        stderr: 'pipe',
      }
    : undefined,

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
