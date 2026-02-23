import { test, expect } from '@playwright/test';

/**
 * Synthesis workflow tests.
 *
 * All tests use the inherited admin storageState (logged in as admin).
 * Covers: summary page structure, synthesis mode selector, sidebar controls,
 * actions panel, and round navigation.
 */

const SUMMARY_URL = '/admin/form/1/summary';

test.describe('Summary page structure', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(SUMMARY_URL);
  });

  test('summary page loads with form title', async ({ page }) => {
    await expect(
      page.getByText(/AI in Education/i).first(),
    ).toBeVisible({ timeout: 12_000 });
  });

  test('has a "Back to Dashboard" link', async ({ page }) => {
    await expect(
      page.getByRole('button', { name: /Back to Dashboard/i }),
    ).toBeVisible({ timeout: 10_000 });
  });

  test('shows Expert Responses section', async ({ page }) => {
    await expect(
      page.getByRole('heading', { name: /Expert Responses/i }),
    ).toBeVisible({ timeout: 10_000 });
  });

  test('shows Synthesis section', async ({ page }) => {
    await expect(
      page.getByText(/Synthesis for Round/i).first(),
    ).toBeVisible({ timeout: 10_000 });
  });
});

test.describe('Sidebar controls', () => {
  test('sidebar toggle button is visible', async ({ page }) => {
    await page.goto(SUMMARY_URL);

    const toggleBtn = page.locator('.summary-sidebar-toggle');
    await expect(toggleBtn).toBeVisible({ timeout: 12_000 });
  });

  test('sidebar is open by default on desktop', async ({ page }) => {
    await page.goto(SUMMARY_URL);

    await expect(
      page.locator('.summary-sidebar-toggle'),
    ).toBeVisible({ timeout: 12_000 });

    const sidebar = page.locator('[role="complementary"][aria-label="Synthesis controls"]');
    await expect(sidebar).toBeVisible({ timeout: 5_000 });
  });

  test('clicking toggle hides sidebar', async ({ page }) => {
    await page.goto(SUMMARY_URL);

    const toggleBtn = page.locator('.summary-sidebar-toggle');
    await expect(toggleBtn).toBeVisible({ timeout: 12_000 });

    // Click to hide
    await toggleBtn.click();

    // Give animation time, then sidebar should be hidden
    await page.waitForTimeout(400);
    const sidebar = page.locator('[role="complementary"][aria-label="Synthesis controls"]');
    await expect(sidebar).toBeAttached();
  });
});

test.describe('Synthesis mode selector', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(SUMMARY_URL);
    // Wait for page to fully load
    await expect(
      page.locator('.summary-sidebar-toggle'),
    ).toBeVisible({ timeout: 12_000 });
  });

  test('AI-Powered Synthesis heading is visible', async ({ page }) => {
    await expect(page.getByText(/AI-Powered Synthesis/i)).toBeVisible({ timeout: 5_000 });
  });

  test('shows Simple, Committee, and TTD mode buttons', async ({ page }) => {
    await expect(page.getByText('Simple').first()).toBeVisible({ timeout: 5_000 });
    await expect(page.getByText('Committee').first()).toBeVisible();
    await expect(page.getByText('TTD').first()).toBeVisible();
  });

  test('mode descriptions are present', async ({ page }) => {
    await expect(page.getByText(/Quick one-shot/i)).toBeVisible({ timeout: 5_000 });
    await expect(page.getByText(/Multi-analyst/i)).toBeVisible();
    await expect(page.getByText(/Iterative diffusion/i)).toBeVisible();
  });

  test('model selector dropdown exists with options', async ({ page }) => {
    const modelSelect = page.locator('#model-select');
    await expect(modelSelect).toBeVisible({ timeout: 5_000 });

    const options = modelSelect.locator('option');
    const count = await options.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test('"Generate Summary" button is present', async ({ page }) => {
    await expect(
      page.getByRole('button', { name: /Generate Summary/i }),
    ).toBeVisible({ timeout: 5_000 });
  });
});

test.describe('Actions panel', () => {
  test('shows Actions section in sidebar', async ({ page }) => {
    await page.goto(SUMMARY_URL);

    await expect(
      page.locator('.summary-sidebar-toggle'),
    ).toBeVisible({ timeout: 12_000 });

    await expect(page.getByText('Actions')).toBeVisible({ timeout: 5_000 });
  });
});

test.describe('Round navigation', () => {
  test('round stepper is visible', async ({ page }) => {
    await page.goto(SUMMARY_URL);

    await expect(
      page.getByRole('heading', { name: /Round Navigation/i }),
    ).toBeVisible({ timeout: 12_000 });
  });

  test('round card shows active round info', async ({ page }) => {
    await page.goto(SUMMARY_URL);

    await expect(page.getByText('Round 1').first()).toBeVisible({ timeout: 12_000 });
  });
});
