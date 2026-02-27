import { defineConfig, devices } from '@playwright/test';

/**
 * Symphonia E2E Test Configuration
 *
 * Locally: run against the full stack (FastAPI + frontend) on :8767
 *   PLAYWRIGHT_BASE_URL=http://localhost:8767 npx playwright test
 *
 * CI: build the frontend and serve it via `vite preview` on :5173.
 *   Smoke tests only check static UI — no backend API needed.
 *   Global setup skips auth gracefully when backend is unavailable.
 *
 * Run smoke only:  npm run test:e2e:smoke
 * Run all:         npm run test:e2e
 */
const isCI = !!process.env.CI;

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

  globalSetup: './e2e/global-setup.ts',

  // In CI, serve the pre-built dist/ via vite preview (fast static server).
  // The CI workflow runs `npm run build` before this step to populate dist/.
  webServer: isCI
    ? {
        command: 'npm run preview -- --port 5173 --host localhost',
        url: 'http://localhost:5173',
        reuseExistingServer: false,
        timeout: 30_000,
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
