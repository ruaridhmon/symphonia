import { expect, request as playwrightRequest, test } from '@playwright/test';

const ADMIN_EMAIL = 'admin@admin';
const ADMIN_PASSWORD = 'admin';

type LoginPayload = {
  access_token: string;
  csrf_token?: string;
  email: string;
  is_admin?: boolean;
  role?: string;
};

async function loginViaApi(
  request: import('@playwright/test').APIRequestContext,
  baseURL: string,
  email: string,
  password: string,
) {
  const response = await request.post(`${baseURL}/login`, {
    form: {
      username: email,
      password,
    },
  });

  expect(response.ok(), `Login failed with ${response.status()}`).toBeTruthy();
  return response.json() as Promise<LoginPayload>;
}

async function createPublicForm(
  request: import('@playwright/test').APIRequestContext,
  baseURL: string,
  token: string,
  overrides: Record<string, unknown> = {},
) {
  const timestamp = Date.now();
  const response = await request.post(`${baseURL}/forms/create`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    data: {
      title: `Public Share ${timestamp}`,
      description: 'Public share link coverage via Playwright.',
      questions: [
        {
          label: 'What is your main reflection?',
          requireEvidence: false,
          requireCounterarguments: false,
          requireConfidence: false,
          inputType: 'textarea',
          rows: 4,
          optional: false,
        },
      ],
      allow_join: true,
      allow_public_responses: true,
      require_consent: true,
      consent_text: 'I agree to take part in this consultation.',
      consent_document: '<p><strong>Consent information</strong></p><p>Please read this before continuing.</p>',
      public_require_consent: false,
      public_consent_text: null,
      ...overrides,
    },
  });

  expect(response.ok(), `Form creation failed with ${response.status()}`).toBeTruthy();
  return response.json() as Promise<{ id: number; join_code: string; title: string }>;
}

async function registerParticipant(
  request: import('@playwright/test').APIRequestContext,
  baseURL: string,
  email: string,
  password: string,
) {
  const response = await request.post(`${baseURL}/register`, {
    form: {
      email,
      password,
    },
  });

  expect(response.ok(), `Register failed with ${response.status()}`).toBeTruthy();
}

async function getResponses(
  request: import('@playwright/test').APIRequestContext,
  baseURL: string,
  token: string,
  formId: number,
) {
  const response = await request.get(`${baseURL}/form/${formId}/responses`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  expect(response.ok(), `Fetching responses failed with ${response.status()}`).toBeTruthy();
  return response.json() as Promise<Array<{ answers: Record<string, { position: string }> }>>;
}

async function deleteForm(
  request: import('@playwright/test').APIRequestContext,
  baseURL: string,
  token: string,
  formId: number,
) {
  await request.delete(`${baseURL}/forms/${formId}/delete`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

test.describe('Public share links', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('guest can pass the consent gate, complete the form, and submit', async ({ page, baseURL }) => {
    test.setTimeout(90_000);
    const appBase = baseURL ?? 'http://127.0.0.1:8767';
    const adminApi = await playwrightRequest.newContext();
    let createdFormId: number | null = null;

    try {
      const adminLogin = await loginViaApi(adminApi, appBase, ADMIN_EMAIL, ADMIN_PASSWORD);
      const created = await createPublicForm(adminApi, appBase, adminLogin.access_token);
      createdFormId = created.id;

      await page.goto(`${appBase}/share/${created.join_code}`);
      await expect(page.getByLabel('Your name')).toBeVisible();
      await expect(page.getByRole('button', { name: /continue to form/i })).toBeVisible();
      await expect(page.locator('input[type="file"]')).toHaveCount(0);
      await expect(page.getByText('Consent information')).toBeVisible();
      await expect(page.getByText('I agree to take part in this consultation.')).toBeVisible();

      await page.getByLabel('Your name').fill('Playwright Guest');
      await page.getByLabel(/I have read the information above and agree to continue/i).check();
      await page.getByRole('button', { name: /continue to form/i }).click();

      await expect(page.getByText('Questions')).toBeVisible();
      await page.getByLabel('Your name').fill('Playwright Guest');
      await page.getByPlaceholder('Write your response here').fill('The public guest flow works.');
      await page.getByRole('button', { name: /^submit$/i }).click();

      await expect(page.getByText(/response submitted/i)).toBeVisible();

      const responses = await getResponses(adminApi, appBase, adminLogin.access_token, created.id);
      expect(responses).toHaveLength(1);
      expect(responses[0]?.answers?.q1?.position ?? '').toContain('public guest flow works');
    } finally {
      if (createdFormId) {
        const adminLogin = await loginViaApi(adminApi, appBase, ADMIN_EMAIL, ADMIN_PASSWORD);
        await deleteForm(adminApi, appBase, adminLogin.access_token, createdFormId).catch(() => {});
      }
      await adminApi.dispose();
    }
  });

  test('logged-in participant sees the same consent gate before the form', async ({ page, baseURL }) => {
    test.setTimeout(90_000);
    const appBase = baseURL ?? 'http://127.0.0.1:8767';
    const adminApi = await playwrightRequest.newContext();
    const participantApi = await playwrightRequest.newContext();
    let createdFormId: number | null = null;

    try {
      const adminLogin = await loginViaApi(adminApi, appBase, ADMIN_EMAIL, ADMIN_PASSWORD);
      const created = await createPublicForm(adminApi, appBase, adminLogin.access_token, {
        title: `Private Consent ${Date.now()}`,
        allow_public_responses: false,
      });
      createdFormId = created.id;

      const participantEmail = `consent-user-${Date.now()}@example.com`;
      await registerParticipant(participantApi, appBase, participantEmail, 'test123');
      const participantLogin = await loginViaApi(participantApi, appBase, participantEmail, 'test123');

      await page.context().addCookies([
        {
          name: 'session_token',
          value: participantLogin.access_token,
          url: appBase,
          httpOnly: true,
          secure: false,
          sameSite: 'Lax',
        },
        {
          name: 'csrf_token',
          value: participantLogin.csrf_token ?? 'playwright-csrf',
          url: appBase,
          httpOnly: false,
          secure: false,
          sameSite: 'Lax',
        },
      ]);
      await page.goto(appBase);
      await page.evaluate(([email, token]) => {
        localStorage.setItem('email', email);
        localStorage.setItem('access_token', token);
        localStorage.setItem('role', 'expert');
        localStorage.setItem('is_admin', 'false');
      }, [participantLogin.email, participantLogin.access_token]);

      await page.goto(`${appBase}/join`);
      await page.getByPlaceholder(/SYM/i).fill(created.join_code);
      await page.getByRole('button', { name: /join consultation/i }).click();
      await page.waitForURL(new RegExp(`/form/${created.id}$`), { timeout: 20_000 });

      await expect(page.getByText('Consent information')).toBeVisible();
      await expect(page.getByText('I agree to take part in this consultation.')).toBeVisible();
      await page.getByLabel(/I have read the information above and agree to continue/i).check();
      await page.getByRole('button', { name: /continue to form/i }).click();

      await expect(page.getByText('Questions')).toBeVisible();
      await page.getByPlaceholder('Write your response here').fill('Authenticated consent gate works.');
      await page.getByRole('button', { name: /^submit$/i }).click();
      await page.waitForURL(/\/waiting$/, { timeout: 20_000 });

      const responses = await getResponses(adminApi, appBase, adminLogin.access_token, created.id);
      expect(responses).toHaveLength(1);
      expect(responses[0]?.answers?.q1?.position ?? '').toContain('Authenticated consent gate works.');
    } finally {
      if (createdFormId) {
        const adminLogin = await loginViaApi(adminApi, appBase, ADMIN_EMAIL, ADMIN_PASSWORD);
        await deleteForm(adminApi, appBase, adminLogin.access_token, createdFormId).catch(() => {});
      }
      await participantApi.dispose();
      await adminApi.dispose();
    }
  });
});
