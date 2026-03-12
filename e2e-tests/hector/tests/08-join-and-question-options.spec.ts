import { test, expect } from '@playwright/test';
import {
  assertNoErrors,
  collectConsoleErrors,
  filterCriticalErrors,
  loginViaUI,
  waitForPageSettle,
} from './helpers';

async function getAdminApiToken(page: import('@playwright/test').Page) {
  const apiBase = process.env.API_URL || 'http://localhost:8000';
  const response = await page.request.post(`${apiBase}/login`, {
    form: {
      username: 'antreas@axiotic.ai',
      password: 'test123',
    },
  });

  expect(response.ok(), `Admin login failed with ${response.status()}`).toBeTruthy();
  const data = await response.json();
  return data.access_token as string;
}

async function createFormViaApi(page: import('@playwright/test').Page, token: string, payload: {
  title: string;
  description?: string;
  questions: unknown[];
  allow_join?: boolean;
}) {
  const apiBase = process.env.API_URL || 'http://localhost:8000';
  const response = await page.request.post(`${apiBase}/forms/create`, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    data: {
      allow_join: true,
      ...payload,
    },
  });

  expect(response.ok(), `Create form failed with ${response.status()}`).toBeTruthy();
  return response.json();
}

async function deleteFormViaApi(page: import('@playwright/test').Page, token: string, formId: number) {
  const apiBase = process.env.API_URL || 'http://localhost:8000';
  await page.request.delete(`${apiBase}/forms/${formId}/delete`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

test.describe('Join code and question option flows', () => {
  test('admin builder preview reflects evidence and confidence toggles', async ({ page, baseURL }) => {
    const getErrors = collectConsoleErrors(page);

    await loginViaUI(page, 'antreas@axiotic.ai', 'test123');
    await page.goto('/admin/forms/new');
    await waitForPageSettle(page);

    await page.getByRole('button', { name: /start from scratch/i }).click();
    await expect(page.locator('#form-title')).toBeVisible();

    await page.fill('#form-title', 'Preview Toggle Check');
    await page.locator('input[aria-label="Question 1"]').fill('How should this be answered?');

    await expect(page.getByText('Expert Form Preview')).toBeVisible();
    await expect(page.getByText('Evidence & Reasoning')).toBeVisible();
    await expect(page.getByText('Confidence Level')).toBeVisible();

    await page.locator('#question-1-evidence').click();
    await expect(page.getByText('Evidence & Reasoning')).toHaveCount(0);

    await page.locator('#question-1-confidence').click();
    await expect(page.getByText('Confidence Level')).toHaveCount(0);

    await assertNoErrors(page, 'Builder preview question toggles');
    const errors = filterCriticalErrors(getErrors());
    expect(errors, 'No critical JS errors in builder preview flow').toHaveLength(0);
  });

  test('admin can join own form by code and sees only enabled expert fields', async ({ page, baseURL }) => {
    const getErrors = collectConsoleErrors(page);
    await loginViaUI(page, 'antreas@axiotic.ai', 'test123');
    const token = await getAdminApiToken(page);
    const timestamp = Date.now();

    const created = await createFormViaApi(page, token, {
      title: `Self Join ${timestamp}`,
      description: 'Playwright join-code coverage',
      questions: [
        {
          label: 'Question without extra fields',
          requireEvidence: false,
          requireConfidence: false,
        },
        {
          label: 'Question with evidence and confidence',
          requireEvidence: true,
          requireConfidence: true,
        },
      ],
    });

    try {
      await page.goto('/join');
      await waitForPageSettle(page);

      await page.locator('input[placeholder*="SYM"]').fill(created.join_code);
      await page.getByRole('button', { name: /join consultation/i }).click();

      await page.waitForURL(new RegExp(`/form/${created.id}$`), { timeout: 15_000 });
      await expect(page.getByRole('heading', { name: created.title })).toBeVisible();

      const firstQuestion = page.locator('div.mb-6', {
        has: page.locator('label', { hasText: 'Question without extra fields' }),
      });
      await expect(firstQuestion).toBeVisible();
      await expect(firstQuestion.getByText('Evidence & Reasoning')).toHaveCount(0);
      await expect(firstQuestion.getByText('Confidence Level')).toHaveCount(0);
      await expect(firstQuestion.getByText('Your Position')).toBeVisible();

      const secondQuestion = page.locator('div.mb-6', {
        has: page.locator('label', { hasText: 'Question with evidence and confidence' }),
      });
      await expect(secondQuestion).toBeVisible();
      await expect(secondQuestion.getByText('Evidence & Reasoning')).toBeVisible();
      await expect(secondQuestion.getByText('Confidence Level')).toBeVisible();

      await assertNoErrors(page, 'Admin self-join and expert fields');
      const errors = filterCriticalErrors(getErrors());
      expect(errors, 'No critical JS errors in self-join flow').toHaveLength(0);
    } finally {
      await deleteFormViaApi(page, token, created.id);
    }
  });
});
