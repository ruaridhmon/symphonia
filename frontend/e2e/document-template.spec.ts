import { test, expect, request as playwrightRequest } from '@playwright/test';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

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
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const response = await request.post(`${baseURL}/login`, {
      form: {
        username: email,
        password,
      },
    });

    if (response.ok()) {
      return response.json() as Promise<LoginPayload>;
    }

    if (response.status() === 429 && attempt < 4) {
      await new Promise((resolve) => setTimeout(resolve, 1800 * (attempt + 1)));
      continue;
    }

    expect(response.ok(), `Login failed with ${response.status()}`).toBeTruthy();
  }

  throw new Error('Login retry loop exhausted');
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

async function getMyResponseDetails(
  request: import('@playwright/test').APIRequestContext,
  baseURL: string,
  token: string,
  formId: number,
) {
  const response = await request.get(`${baseURL}/form/${formId}/my_response`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  expect(response.ok(), `Fetching my response for form ${formId} failed with ${response.status()}`).toBeTruthy();
  return response.json() as Promise<{ answers: Record<string, { position: string }> }>;
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

function escapeXml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

async function createQuestionnaireDocx(lines: string[]) {
  const dir = await mkdtemp(path.join(tmpdir(), 'symphonia-questionnaire-'));
  const relsDir = path.join(dir, '_rels');
  const wordDir = path.join(dir, 'word');
  await mkdir(relsDir, { recursive: true });
  await mkdir(wordDir, { recursive: true });

  const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`;
  const relsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;
  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    ${lines
      .map((line) =>
        line
          ? `<w:p><w:r><w:t>${escapeXml(line)}</w:t></w:r></w:p>`
          : '<w:p/>',
      )
      .join('\n    ')}
    <w:sectPr/>
  </w:body>
</w:document>`;

  await writeFile(path.join(dir, '[Content_Types].xml'), contentTypesXml);
  await writeFile(path.join(relsDir, '.rels'), relsXml);
  await writeFile(path.join(wordDir, 'document.xml'), documentXml);

  const docxPath = path.join(dir, 'questionnaire.docx');
  execFileSync('zip', ['-qr', docxPath, '[Content_Types].xml', '_rels', 'word'], { cwd: dir });
  return { dir, docxPath };
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
      const participantToken = participantLogin.access_token;
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

  test('admin can import a questionnaire docx into survey questions', async ({ browser, baseURL }) => {
    test.setTimeout(90_000);
    const appBase = baseURL ?? 'http://127.0.0.1:8767';
    const timestamp = Date.now();
    let createdFormId: number | null = null;
    let fixtureDir: string | null = null;
    let adminContext: import('@playwright/test').BrowserContext | null = null;
    let participantContext: import('@playwright/test').BrowserContext | null = null;
    const adminApi = await playwrightRequest.newContext();
    const participantApi = await playwrightRequest.newContext();
    const adminLogin = await loginViaApi(adminApi, appBase, ADMIN_EMAIL, ADMIN_PASSWORD);
    const adminToken = adminLogin.access_token;

    try {
      const fixture = await createQuestionnaireDocx([
        'Round 1: Initial prioritisation',
        '',
        'Section A. About you',
        '',
        'Q1. Which role best describes you?',
        'Response type: Select one.',
        'Leader',
        'Teacher',
        'Other (please specify, max 20 words)',
        '',
        'Q2. Which priorities matter most?',
        'Response type: Select up to 2.',
        'Workload',
        'Safeguarding',
        'Equity',
        '',
        'Q3. How significant is each issue?',
        'Response type: 0–10 slider for each item.',
        'Anchor labels: 0 = Not significant, 5 = Moderate, 10 = Very significant',
        'Workload burden',
        'Safeguarding risk',
        '',
        'Q4. Optional comments',
        'Response type: Free text, max 40 words.',
        '',
        'Round 2: Follow-up',
        'Q5. Dynamic question',
        'Response type: Select one.',
        'A',
        'B',
      ]);
      fixtureDir = fixture.dir;

      adminContext = await browser.newContext({
        storageState: buildStorageState(appBase, adminLogin),
      });
      const adminPage = await adminContext.newPage();
      await adminPage.goto(`${appBase}/admin/forms/new`);
      await adminPage.getByRole('button', { name: /import questionnaire/i }).click();

      await adminPage.locator('input[type="file"]').setInputFiles(fixture.docxPath);
      await expect(adminPage.getByText(/Imported 6 questions from Round 1: Initial prioritisation/i)).toBeVisible();
      await expect(adminPage.getByText(/Later rounds were not imported/i)).toBeVisible();
      await expect(adminPage.getByRole('heading', { name: 'About you' })).toBeVisible();
      await expect(adminPage.getByText('Which role best describes you?')).toBeVisible();
      await expect(adminPage.getByText('Workload burden')).toBeVisible();

      await adminPage.locator('#form-title').fill(`Imported Questionnaire ${timestamp}`);
      await adminPage.getByRole('button', { name: /create form/i }).click();
      await adminPage.waitForURL(/\/admin\/form\/\d+$/, { timeout: 20_000 });

      const formIdMatch = adminPage.url().match(/\/admin\/form\/(\d+)$/);
      expect(formIdMatch).not.toBeNull();
      createdFormId = Number(formIdMatch?.[1]);

      const form = await getFormDetails(adminApi, appBase, adminToken, createdFormId);
      expect(Array.isArray(form.questions)).toBeTruthy();
      expect(form.questions).toHaveLength(6);
      expect(form.questions[0].inputType).toBe('single_select');
      expect(form.questions[1].inputType).toBe('text');
      expect(form.questions[2].inputType).toBe('multi_select');
      expect(form.questions[3].inputType).toBe('slider');

      const participantEmail = `questionnaire-participant-${timestamp}@example.com`;
      await registerParticipant(participantApi, appBase, participantEmail, 'test123');
      const participantLogin = await loginViaApi(participantApi, appBase, participantEmail, 'test123');
      const participantToken = participantLogin.access_token;
      participantContext = await browser.newContext({
        storageState: buildStorageState(appBase, participantLogin),
      });
      const participantPage = await participantContext.newPage();
      await participantPage.goto(`${appBase}/join`);
      await participantPage.getByPlaceholder(/SYM/i).fill(form.join_code);
      await participantPage.getByRole('button', { name: /join consultation/i }).click();
      await participantPage.waitForURL(new RegExp(`/form/${createdFormId}$`), { timeout: 20_000 });

      await expect(participantPage.getByRole('heading', { name: 'About you' })).toBeVisible();
      await participantPage.getByRole('button', { name: /^submit$/i }).click();
      await expect(participantPage.getByText(/please answer/i)).toBeVisible();

      await participantPage.getByLabel(/other/i).check();
      await expect(participantPage.getByPlaceholder(/please specify, max 20 words/i)).toBeVisible();
      await participantPage.getByRole('button', { name: /^submit$/i }).click();
      await expect(participantPage.getByText(/please answer/i)).toBeVisible();

      await participantPage.getByPlaceholder(/please specify, max 20 words/i).fill('Consultant');
      await participantPage.getByLabel('Workload').check();
      await participantPage.getByLabel('Equity').check();

      const sliders = participantPage.locator('input[type="range"]');
      await sliders.nth(0).fill('8');
      await sliders.nth(1).fill('6');
      await participantPage.getByRole('textbox', { name: '' }).last().fill('Need clearer implementation guidance.');

      await participantPage.getByRole('button', { name: /^submit$/i }).click();
      await expect(participantPage.getByRole('heading', { name: /thank you for your submission/i })).toBeVisible();

      const savedResponse = await getMyResponseDetails(participantApi, appBase, participantToken, createdFormId);
      expect(savedResponse.answers.q1.position).toContain('Other');
      expect(savedResponse.answers.q2.position).toBe('Consultant');
      expect(savedResponse.answers.q3.position).toContain('Workload');
      expect(savedResponse.answers.q3.position).toContain('Equity');
      expect(savedResponse.answers.q4.position).toBe('8');
      expect(savedResponse.answers.q5.position).toBe('6');
      expect(savedResponse.answers.q6.position).toContain('Need clearer implementation guidance.');
    } finally {
      if (createdFormId) {
        await deleteForm(adminApi, appBase, adminToken, createdFormId);
      }
      if (participantContext) {
        await participantContext.close();
      }
      if (adminContext) {
        await adminContext.close();
      }
      await adminApi.dispose();
      await participantApi.dispose();
      if (fixtureDir) {
        await rm(fixtureDir, { recursive: true, force: true });
      }
    }
  });

  test('admin dashboard supports share sheet and delete actions', async ({ browser, baseURL }) => {
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
        title: `Dashboard Actions ${timestamp}`,
        description: 'Admin dashboard action coverage.',
        document_template: ['Title', '{{short:Organisation}}'].join('\n'),
      });
      createdFormId = created.id;

      adminContext = await browser.newContext({
        storageState: buildStorageState(appBase, adminLogin),
      });
      const page = await adminContext.newPage();
      await page.goto(`${appBase}/`);

      const row = page.locator('tr').filter({ hasText: `Dashboard Actions ${timestamp}` }).first();
      await expect(row).toBeVisible();

      await row.getByRole('button', { name: `Download Dashboard Actions ${timestamp}` }).click();
      await expect(page.getByRole('dialog', { name: /download consultation/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /everything/i })).toBeVisible();
      await page.getByRole('button', { name: /close download sheet/i }).click();
      await expect(page.getByRole('dialog', { name: /download consultation/i })).toBeHidden();

      await row.getByRole('button', { name: `Share Dashboard Actions ${timestamp}` }).click();
      await expect(page.getByRole('dialog', { name: /share consultation/i })).toBeVisible();
      await expect(page.getByText(`/join/${created.join_code}`)).toBeVisible();
      await expect(page.getByRole('link', { name: /whatsapp/i })).toBeVisible();
      await page.getByRole('button', { name: /close share sheet/i }).click();
      await expect(page.getByRole('dialog', { name: /share consultation/i })).toBeHidden();

      const refreshedRow = page.locator('tr').filter({ hasText: `Dashboard Actions ${timestamp}` }).first();
      await refreshedRow.getByRole('button', { name: `Delete Dashboard Actions ${timestamp}` }).click();
      await expect(page.getByRole('dialog', { name: /delete this consultation/i })).toBeVisible();
      await page.getByRole('button', { name: /^delete$/i }).click();
      await expect(page.locator('tr').filter({ hasText: `Dashboard Actions ${timestamp}` })).toHaveCount(0);
    } finally {
      if (createdFormId) {
        await deleteForm(adminApi, appBase, adminToken, createdFormId);
      }
      if (adminContext) {
        await adminContext.close();
      }
      await adminApi.dispose();
    }
  });
});
