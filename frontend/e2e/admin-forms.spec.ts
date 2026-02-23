import { test, expect } from '@playwright/test';

/**
 * Admin form management tests.
 *
 * All tests use the inherited admin storageState (logged in as admin).
 * Covers: dashboard form list, creating forms from scratch and templates,
 * form editor interactions, and navigation to summary.
 */

test.describe('Admin Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('shows "Admin Dashboard" heading', async ({ page }) => {
    await expect(
      page.getByRole('heading', { name: /Admin Dashboard/i }),
    ).toBeVisible({ timeout: 8_000 });
  });

  test('shows "+ New Form" button', async ({ page }) => {
    const btn = page.getByRole('button', { name: /New Form/i });
    await expect(btn).toBeVisible({ timeout: 8_000 });
  });

  test('shows "Existing Forms" section when forms exist', async ({ page }) => {
    await expect(
      page.getByRole('heading', { name: /Existing Forms/i }),
    ).toBeVisible({ timeout: 8_000 });
  });

  test('search input filters forms', async ({ page }) => {
    const searchInput = page.getByLabel('Search forms');
    await expect(searchInput).toBeVisible({ timeout: 8_000 });

    // Type a query that won't match any form
    await searchInput.fill('zzz_nonexistent_query');
    await expect(page.getByText(/No forms match/i)).toBeVisible({ timeout: 5_000 });

    // Clear search — forms reappear
    await searchInput.fill('');
    await expect(page.getByRole('link', { name: /Edit/i }).first()).toBeVisible({ timeout: 5_000 });
  });
});

test.describe('Create form — template picker', () => {
  test('navigating to /admin/forms/new shows template picker', async ({ page }) => {
    await page.goto('/admin/forms/new');

    await expect(
      page.getByRole('heading', { name: /Create a New Form/i }),
    ).toBeVisible({ timeout: 8_000 });

    await expect(
      page.getByText('Pick a template to get started quickly'),
    ).toBeVisible({ timeout: 8_000 });
  });

  test('"Choose a template" heading and "Start from scratch" option are shown', async ({ page }) => {
    await page.goto('/admin/forms/new');

    await expect(page.getByText('Choose a template')).toBeVisible({ timeout: 8_000 });
    await expect(page.getByText('Start from scratch')).toBeVisible();
  });

  test('clicking "Start from scratch" opens blank form editor', async ({ page }) => {
    await page.goto('/admin/forms/new');

    await page.getByText('Start from scratch').click();

    // Form editor should appear with title input
    await expect(
      page.getByPlaceholder(/AI in Education/i),
    ).toBeVisible({ timeout: 5_000 });

    // Should show "Opening questions" label
    await expect(page.getByText('Opening questions', { exact: true })).toBeVisible();

    // Should have a "Create Form" button
    await expect(
      page.getByRole('button', { name: /Create Form/i }),
    ).toBeVisible();
  });

  test('clicking a template card fills form with template data', async ({ page }) => {
    await page.goto('/admin/forms/new');

    // Wait for templates to load
    await expect(page.getByText('Choose a template')).toBeVisible({ timeout: 8_000 });

    // Find actual template cards (not "Start from scratch") by matching "N questions"
    const templateCards = page.locator('button').filter({ hasText: /\d+ questions/ });
    const cardCount = await templateCards.count();
    expect(cardCount).toBeGreaterThan(0);

    // Click the first template card
    await templateCards.first().click();

    // After selection, form editor should appear with "Back to Templates" (template mode)
    await expect(
      page.getByRole('button', { name: /Back to Templates/i }),
    ).toBeVisible({ timeout: 5_000 });

    // Title input should be pre-filled with template name
    const titleInput = page.getByPlaceholder(/AI in Education/i);
    await expect(titleInput).toBeVisible();
    const titleValue = await titleInput.inputValue();
    expect(titleValue.length).toBeGreaterThan(0);
  });
});

test.describe('Form editor — create from scratch', () => {
  test('creating a form without title shows error', async ({ page }) => {
    await page.goto('/admin/forms/new');
    await page.getByText('Start from scratch').click();

    // Click "Create Form" without entering a title
    await page.getByRole('button', { name: /Create Form/i }).click();

    // Should show an error message about the title
    await expect(page.getByText(/please enter a form title/i)).toBeVisible({ timeout: 5_000 });
  });

  test('"+ Add question" adds another question field', async ({ page }) => {
    await page.goto('/admin/forms/new');
    await page.getByText('Start from scratch').click();

    // Wait for form to appear
    await expect(page.getByText('+ Add question')).toBeVisible({ timeout: 5_000 });

    // Count initial question fields (should be 1)
    const initialInputs = page.locator('input[type="text"][placeholder*="Question"], input[type="text"][placeholder*="barrier"]');
    const initialCount = await initialInputs.count();

    // Click add question
    await page.getByText('+ Add question').click();

    // Should now have one more input
    const afterInputs = page.locator('input[type="text"][placeholder*="Question"], input[type="text"][placeholder*="barrier"]');
    await expect(afterInputs).toHaveCount(initialCount + 1, { timeout: 3_000 });
  });
});

test.describe('Form editor — existing form', () => {
  test('form editor loads for existing form #1', async ({ page }) => {
    await page.goto('/admin/form/1');

    // Should show the "Edit Consultation" heading
    await expect(
      page.getByRole('heading', { name: /Edit Consultation/i }),
    ).toBeVisible({ timeout: 10_000 });
  });

  test('form title input has pre-filled value', async ({ page }) => {
    await page.goto('/admin/form/1');

    await expect(
      page.getByRole('heading', { name: /Edit Consultation/i }),
    ).toBeVisible({ timeout: 10_000 });

    const titleInput = page.getByPlaceholder(/AI in Education/i);
    const titleValue = await titleInput.inputValue();
    expect(titleValue.length).toBeGreaterThan(0);
  });

  test('form editor shows "Save Edits" button', async ({ page }) => {
    await page.goto('/admin/form/1');

    await expect(
      page.getByRole('button', { name: /Save Edits/i }),
    ).toBeVisible({ timeout: 10_000 });
  });

  test('navigate from dashboard to summary page', async ({ page }) => {
    await page.goto('/');

    const summaryLink = page.getByRole('link', { name: /Summary/i }).first();
    await expect(summaryLink).toBeVisible({ timeout: 8_000 });
    await summaryLink.click();

    await page.waitForURL(/\/summary/, { timeout: 10_000 });
    await expect(page).toHaveURL(/\/admin\/form\/\d+\/summary/);
  });
});
