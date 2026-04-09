import { test, expect, type Page } from '@playwright/test';

/**
 * Synthesis workflow tests.
 *
 * All tests use the inherited admin storageState (logged in as admin).
 * Covers: summary page structure, synthesis controls, and the calmer layout.
 */

async function gotoFirstSummary(page: Page) {
  await page.goto('/');
  const summaryLink = page.getByRole('link', { name: /Summary/i }).first();
  await expect(summaryLink).toBeVisible({ timeout: 12_000 });
  await Promise.all([
    page.waitForURL(/\/summary/, { timeout: 12_000 }),
    summaryLink.click(),
  ]);
}

test.describe('Summary page structure', () => {
  test.beforeEach(async ({ page }) => {
    await gotoFirstSummary(page);
  });

  test('summary page loads with form title', async ({ page }) => {
    await expect(
      page.getByText(/Summary/i).first(),
    ).toBeVisible({ timeout: 12_000 });
  });

  test('has a "Back to Dashboard" link', async ({ page }) => {
    await expect(
      page.getByRole('button', { name: /Back to Dashboard/i }),
    ).toBeVisible({ timeout: 10_000 });
  });

  test('shows the current focus panel', async ({ page }) => {
    await expect(
      page.getByText(/Current focus/i),
    ).toBeVisible({ timeout: 10_000 });
  });

  test('shows Synthesis section', async ({ page }) => {
    await expect(
      page.getByText(/Synthesis for Round/i).first(),
    ).toBeVisible({ timeout: 10_000 });
  });
});

test.describe('Synthesis mode selector', () => {
  test.beforeEach(async ({ page }) => {
    await gotoFirstSummary(page);
    await expect(
      page.getByRole('complementary', { name: /Synthesis controls/i }),
    ).toBeVisible({ timeout: 12_000 });
  });

  test('AI synthesis heading is visible', async ({ page }) => {
    await expect(page.getByText(/^AI Synthesis$/i)).toBeVisible({ timeout: 5_000 });
  });

  test('shows Simple, Committee, and Thorough mode buttons', async ({ page }) => {
    await expect(page.getByText('Simple').first()).toBeVisible({ timeout: 5_000 });
    await expect(page.getByText('Committee').first()).toBeVisible();
    await expect(page.getByText('Thorough').first()).toBeVisible();
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

  test('synthesis action button is present', async ({ page }) => {
    await expect(
      page.getByRole('button', { name: /Generate AI Synthesis|Waiting for Responses/i }),
    ).toBeVisible({ timeout: 5_000 });
  });
});

test.describe('Actions panel', () => {
  test('shows actions and round controls in the side rail', async ({ page }) => {
    await gotoFirstSummary(page);

    await expect(
      page.getByRole('complementary', { name: /Synthesis controls/i }),
    ).toBeVisible({ timeout: 12_000 });

    await expect(page.getByText('Actions')).toBeVisible({ timeout: 5_000 });
    await expect(page.getByText('Rounds')).toBeVisible({ timeout: 5_000 });
  });

  test('opens the download sheet with export options', async ({ page }) => {
    await gotoFirstSummary(page);

    await page.getByRole('button', { name: /download/i }).click();
    await expect(page.getByRole('dialog', { name: /download consultation/i })).toBeVisible({ timeout: 5_000 });
    await expect(page.getByRole('button', { name: /everything/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /summary only/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /responses only/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /download pdf/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /download word/i })).toBeVisible();
  });
});

test.describe('Round navigation', () => {
  test('round picker is visible in the side rail', async ({ page }) => {
    await gotoFirstSummary(page);

    await expect(
      page.getByText('Rounds'),
    ).toBeVisible({ timeout: 12_000 });
  });

  test('round card shows active round info', async ({ page }) => {
    await gotoFirstSummary(page);

    await expect(page.getByText(/Round \d+ of \d+/).first()).toBeVisible({ timeout: 12_000 });
  });
});
