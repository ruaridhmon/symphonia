import { test, expect, request as playwrightRequest } from '@playwright/test';

const ADMIN_EMAIL = 'antreas@axiotic.ai';
const ADMIN_PASSWORD = 'test123';

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

function buildStorageState(baseURL: string, login: LoginPayload) {
  return {
    cookies: [
      {
        name: 'session_token',
        value: login.access_token,
        url: baseURL,
        httpOnly: true,
        secure: false,
        sameSite: 'Lax' as const,
      },
      {
        name: 'csrf_token',
        value: login.csrf_token ?? 'playwright-csrf',
        url: baseURL,
        httpOnly: false,
        secure: false,
        sameSite: 'Lax' as const,
      },
    ],
    origins: [
      {
        origin: baseURL,
        localStorage: [
          { name: 'access_token', value: login.access_token },
          { name: 'email', value: login.email },
          { name: 'is_admin', value: login.is_admin ? 'true' : 'false' },
          {
            name: 'role',
            value: login.role || (login.is_admin ? 'platform_admin' : 'expert'),
          },
        ],
      },
    ],
  };
}

async function getFormDetails(
  request: import('@playwright/test').APIRequestContext,
  baseURL: string,
  token: string,
  formId: number,
) {
  const response = await request.get(`${baseURL}/forms/${formId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  expect(response.ok(), `Fetching form ${formId} failed with ${response.status()}`).toBeTruthy();
  return response.json();
}

async function createDocumentTemplateForm(
  request: import('@playwright/test').APIRequestContext,
  baseURL: string,
  token: string,
  payload: {
    title: string;
    description?: string;
    document_template: string;
  },
) {
  const response = await request.post(`${baseURL}/forms/create`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    data: {
      title: payload.title,
      description: payload.description ?? '',
      document_template: payload.document_template,
      questions: [],
      allow_join: true,
    },
  });

  expect(response.ok(), `Form creation failed with ${response.status()}`).toBeTruthy();
  return response.json() as Promise<{
    id: number;
    join_code: string;
    title: string;
  }>;
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

test.describe('Document template consultations', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('admin can create one and a participant can fill and submit it', async ({ browser, baseURL }) => {
    test.setTimeout(90_000);
    const appBase = baseURL ?? 'http://127.0.0.1:8767';
    const timestamp = Date.now();
    let createdFormId: number | null = null;
    let adminContext: import('@playwright/test').BrowserContext | null = null;
    let participantContext: import('@playwright/test').BrowserContext | null = null;
    const adminApi = await playwrightRequest.newContext();
    const participantApi = await playwrightRequest.newContext();
    const adminLogin = await loginViaApi(adminApi, appBase, ADMIN_EMAIL, ADMIN_PASSWORD);
    const adminToken = adminLogin.access_token;

    try {
      adminContext = await browser.newContext({
        storageState: buildStorageState(appBase, adminLogin),
      });
      const adminPage = await adminContext.newPage();
      await adminPage.goto(`${appBase}/admin/forms/new`);

      await adminPage.getByRole('button', { name: /start document template/i }).click();
      await expect(adminPage.getByRole('button', { name: /document template/i })).toBeVisible();

      await adminPage.locator('#form-title').fill(`Document Template ${timestamp}`);
      await adminPage.locator('#form-description').fill('Playwright coverage for the document-template flow.');

      const templateEditor = adminPage.locator('textarea').nth(1);
      await templateEditor.fill(
        [
          'Decision note',
          '',
          'Organisation',
          '{{short:Organisation}}',
          '',
          'Executive summary',
          '{{long:Executive summary}}',
          '',
          'Primary concern',
          '{{long:Primary concern}}',
        ].join('\n'),
      );

      await adminPage.getByRole('button', { name: /create form/i }).click();
      await adminPage.waitForURL(/\/admin\/form\/\d+$/, { timeout: 20_000 });

      const formIdMatch = adminPage.url().match(/\/admin\/form\/(\d+)$/);
      expect(formIdMatch).not.toBeNull();
      createdFormId = Number(formIdMatch?.[1]);

      const form = await getFormDetails(adminApi, appBase, adminToken, createdFormId);
      expect(form.document_template).toContain('{{long:Executive summary}}');
      expect(form.join_code).toBeTruthy();

      const participantEmail = `participant-${timestamp}@example.com`;
      await registerParticipant(participantApi, appBase, participantEmail, 'test123');
      const participantLogin = await loginViaApi(participantApi, appBase, participantEmail, 'test123');
      participantContext = await browser.newContext({
        storageState: buildStorageState(appBase, participantLogin),
      });
      const participantPage = await participantContext.newPage();
      await participantPage.goto(`${appBase}/join`);
      await participantPage.getByPlaceholder(/SYM/i).fill(form.join_code);
      await participantPage.getByRole('button', { name: /join consultation/i }).click();
      await participantPage.waitForURL(new RegExp(`/form/${createdFormId}$`), { timeout: 20_000 });

      await expect(participantPage.getByRole('heading', { name: new RegExp(`Document Template ${timestamp}`) })).toBeVisible();
      await expect(participantPage.getByRole('heading', { name: 'Document Template', exact: true })).toBeVisible();

      const organisationBlock = participantPage.locator('div.space-y-2').filter({ hasText: 'Organisation' }).first();
      await organisationBlock.locator('input').fill('Northshore Council');

      const summaryBlock = participantPage.locator('div.space-y-2').filter({ hasText: 'Executive summary' }).first();
      await summaryBlock.locator('textarea').fill('The proposal is viable if the implementation timeline is extended.');

      const concernBlock = participantPage.locator('div.space-y-2').filter({ hasText: 'Primary concern' }).first();
      await concernBlock.locator('textarea').fill('Current staffing assumptions are optimistic and need external validation.');

      await participantPage.getByRole('button', { name: /submit/i }).click();
      await participantPage.waitForURL(/\/waiting$/, { timeout: 20_000 });
      await expect(participantPage.getByText(/waiting/i)).toBeVisible();
    } finally {
      await participantContext?.close();
      await adminContext?.close();
      if (createdFormId) {
        await deleteForm(adminApi, appBase, adminToken, createdFormId);
      }
      await participantApi.dispose();
      await adminApi.dispose();
    }
  });

  test('admin can edit an existing document template consultation', async ({ browser, baseURL }) => {
    test.setTimeout(90_000);
    const appBase = baseURL ?? 'http://127.0.0.1:8767';
    const timestamp = Date.now();
    let createdFormId: number | null = null;
    let adminContext: import('@playwright/test').BrowserContext | null = null;
    const adminApi = await playwrightRequest.newContext();
    const adminLogin = await loginViaApi(adminApi, appBase, ADMIN_EMAIL, ADMIN_PASSWORD);
    const adminToken = adminLogin.access_token;

    try {
      const created = await createDocumentTemplateForm(adminApi, appBase, adminToken, {
        title: `Editable Document ${timestamp}`,
        description: 'Seeded for edit coverage.',
        document_template: [
          'Briefing note',
          '',
          'Organisation',
          '{{short:Organisation}}',
          '',
          'Executive summary',
          '{{long:Executive summary}}',
        ].join('\n'),
      });
      createdFormId = created.id;

      adminContext = await browser.newContext({
        storageState: buildStorageState(appBase, adminLogin),
      });
      const adminPage = await adminContext.newPage();
      await adminPage.goto(`${appBase}/admin/form/${createdFormId}`);

      await expect(adminPage.getByLabel('Consultation title')).toHaveValue(`Editable Document ${timestamp}`);
      await expect(adminPage.getByRole('button', { name: /Document template/i })).toBeVisible();

      await adminPage.locator('textarea').first().fill(
        [
          'Briefing note',
          '',
          'Organisation',
          '{{short:Organisation}}',
          '',
          'Executive summary',
          '{{long:Executive summary}}',
          '',
          'Implementation risk',
          '{{long:Implementation risk}}',
        ].join('\n'),
      );

      await adminPage.getByRole('button', { name: /Save changes/i }).click();
      await expect(adminPage.getByText('Consultation saved')).toBeVisible({ timeout: 10_000 });

      const updated = await getFormDetails(adminApi, appBase, adminToken, createdFormId);
      expect(updated.document_template).toContain('{{long:Implementation risk}}');
      expect(Array.isArray(updated.questions)).toBeTruthy();
      expect(updated.questions).toHaveLength(3);
    } finally {
      await adminContext?.close();
      if (createdFormId) {
        await deleteForm(adminApi, appBase, adminToken, createdFormId);
      }
      await adminApi.dispose();
    }
  });

  test('participant draft restore works for document template responses', async ({ browser, baseURL }) => {
    test.setTimeout(90_000);
    const appBase = baseURL ?? 'http://127.0.0.1:8767';
    const timestamp = Date.now();
    let createdFormId: number | null = null;
    let participantContext: import('@playwright/test').BrowserContext | null = null;
    const adminApi = await playwrightRequest.newContext();
    const participantApi = await playwrightRequest.newContext();
    const adminLogin = await loginViaApi(adminApi, appBase, ADMIN_EMAIL, ADMIN_PASSWORD);
    const adminToken = adminLogin.access_token;

    try {
      const created = await createDocumentTemplateForm(adminApi, appBase, adminToken, {
        title: `Draft Restore ${timestamp}`,
        description: 'Seeded for draft restore coverage.',
        document_template: [
          'Policy note',
          '',
          'Organisation',
          '{{short:Organisation}}',
          '',
          'Executive summary',
          '{{long:Executive summary}}',
        ].join('\n'),
      });
      createdFormId = created.id;

      const participantEmail = `participant-draft-${timestamp}@example.com`;
      await registerParticipant(participantApi, appBase, participantEmail, 'test123');
      const participantLogin = await loginViaApi(participantApi, appBase, participantEmail, 'test123');
      participantContext = await browser.newContext({
        storageState: buildStorageState(appBase, participantLogin),
      });
      const participantPage = await participantContext.newPage();
      await participantPage.goto(`${appBase}/join`);
      await participantPage.getByPlaceholder(/SYM/i).fill(created.join_code);
      await participantPage.getByRole('button', { name: /join consultation/i }).click();
      await participantPage.waitForURL(new RegExp(`/form/${createdFormId}$`), { timeout: 20_000 });

      const organisationBlock = participantPage.locator('div.space-y-2').filter({ hasText: 'Organisation' }).first();
      await organisationBlock.locator('input').fill('Harbour Authority');

      const summaryBlock = participantPage.locator('div.space-y-2').filter({ hasText: 'Executive summary' }).first();
      await summaryBlock.locator('textarea').fill('A phased rollout is safer than a single launch window.');

      await expect(participantPage.getByText(/draft saved/i)).toBeVisible({ timeout: 10_000 });

      await participantPage.reload();

      const restoredOrganisationBlock = participantPage.locator('div.space-y-2').filter({ hasText: 'Organisation' }).first();
      const restoredSummaryBlock = participantPage.locator('div.space-y-2').filter({ hasText: 'Executive summary' }).first();
      await expect(participantPage.getByText(/previous draft has been restored/i)).toBeVisible({ timeout: 10_000 });
      await expect(restoredOrganisationBlock.locator('input')).toHaveValue('Harbour Authority');
      await expect(restoredSummaryBlock.locator('textarea')).toHaveValue('A phased rollout is safer than a single launch window.');
    } finally {
      await participantContext?.close();
      if (createdFormId) {
        await deleteForm(adminApi, appBase, adminToken, createdFormId);
      }
      await participantApi.dispose();
      await adminApi.dispose();
    }
  });
});
