import { test, expect, request as playwrightRequest } from '@playwright/test';
import { mkdtemp, mkdir, writeFile, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { Document, HeadingLevel, Packer, Paragraph, TextRun } from 'docx';

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

async function createStyledEditableDocx() {
  const dir = await mkdtemp(path.join(tmpdir(), 'symphonia-editable-doc-'));
  const docxPath = path.join(dir, 'editable.docx');

  const document = new Document({
    sections: [
      {
        children: [
          new Paragraph({
            text: 'Board note',
            heading: HeadingLevel.HEADING_1,
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: 'Section overview',
                bold: true,
                color: '4472C4',
                highlight: 'yellow',
              }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun('This document keeps '),
              new TextRun({
                text: 'imported emphasis',
                italics: true,
                color: 'C00000',
              }),
              new TextRun(' and section structure.'),
            ],
          }),
        ],
      },
    ],
  });

  const buffer = await Packer.toBuffer(document);
  await writeFile(docxPath, buffer);
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

      const templateEditor = adminPage.locator('.ProseMirror').first();
      await expect(templateEditor).toBeVisible();
      await templateEditor.click();
      await adminPage.keyboard.press(`${process.platform === 'darwin' ? 'Meta' : 'Control'}+A`);
      await adminPage.keyboard.press('Backspace');
      await templateEditor.pressSequentially('Decision note');
      await templateEditor.press('Enter');
      await templateEditor.press('Enter');
      await templateEditor.pressSequentially('Organisation ');
      await templateEditor.pressSequentially('/short');
      await expect(adminPage.getByRole('button', { name: /^Short text\b/i })).toBeVisible();
      await templateEditor.press('ArrowRight');
      await templateEditor.press('Enter');
      await templateEditor.press('Enter');
      await templateEditor.pressSequentially('Executive summary ');
      await templateEditor.pressSequentially('/long');
      await expect(adminPage.getByRole('button', { name: /^Long text\b/i })).toBeVisible();
      await templateEditor.press('Enter');
      await templateEditor.press('Enter');
      await templateEditor.pressSequentially('Primary concern ');
      await templateEditor.pressSequentially('/optional');
      await expect(adminPage.getByRole('button', { name: /^Optional long text\b/i })).toBeVisible();
      await templateEditor.press('Enter');

      await adminPage.getByRole('button', { name: /create form/i }).click();
      await adminPage.waitForURL(/\/admin\/form\/\d+$/, { timeout: 20_000 });

      const formIdMatch = adminPage.url().match(/\/admin\/form\/(\d+)$/);
      expect(formIdMatch).not.toBeNull();
      createdFormId = Number(formIdMatch?.[1]);

      const form = await getFormDetails(adminApi, appBase, adminToken, createdFormId);
      expect(form.document_template).toContain('symphonia-document-mode: fillable-rich');
      expect(form.document_template).toContain('data-symphonia-field-key');
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
      await expect(participantPage.locator('[data-question-key="q3"]')).toBeVisible();

      await participantPage.getByRole('button', { name: /^submit$/i }).click();
      await expect(participantPage.locator('[data-question-key="q1"]')).toBeVisible();

      const blockedSubmitResponse = await participantApi.post(`${appBase}/submit`, {
        headers: {
          Authorization: `Bearer ${participantToken}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        form: {
          form_id: String(createdFormId),
          answers: JSON.stringify({
            q1: { position: '', evidence: '', counterarguments: '', confidence: 5, confidenceJustification: '' },
            q2: { position: '', evidence: '', counterarguments: '', confidence: 5, confidenceJustification: '' },
            q3: { position: '', evidence: '', counterarguments: '', confidence: 5, confidenceJustification: '' },
          }),
        },
      });
      expect(blockedSubmitResponse.status()).toBe(400);
      const blockedSubmitBody = await blockedSubmitResponse.json();
      expect(blockedSubmitBody).toMatchObject({
        detail: 'Please answer "Organisation" before submitting.',
      });

      await participantPage.locator('[data-question-key="q1"] input').fill('Northshore Council');
      await participantPage.locator('[data-question-key="q2"] textarea').fill('The proposal is viable if the implementation timeline is extended.');

      await participantPage.getByRole('button', { name: /submit/i }).click();
      await participantPage.waitForURL(/\/waiting$/, { timeout: 20_000 });
      await expect(participantPage.getByText(/waiting/i)).toBeVisible();

      const savedResponse = await getMyResponseDetails(participantApi, appBase, participantToken, createdFormId);
      expect(savedResponse.answers.q1.position).toBe('Northshore Council');
      expect(savedResponse.answers.q2.position).toContain('implementation timeline is extended');
      expect(savedResponse.answers.q3.position ?? '').toBe('');
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

      await adminPage.getByTestId('document-template-source').fill(
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

      await participantPage.locator('[data-question-key="q1"] input').fill('Harbour Authority');
      await participantPage.locator('[data-question-key="q2"] textarea').fill('A phased rollout is safer than a single launch window.');

      await expect(participantPage.getByText(/draft saved/i)).toBeVisible({ timeout: 10_000 });

      await participantPage.reload();

      await expect(participantPage.getByText(/previous draft has been restored/i)).toBeVisible({ timeout: 10_000 });
      await expect(participantPage.locator('[data-question-key="q1"] input')).toHaveValue('Harbour Authority');
      await expect(participantPage.locator('[data-question-key="q2"] textarea')).toHaveValue('A phased rollout is safer than a single launch window.');
    } finally {
      await participantContext?.close();
      if (createdFormId) {
        await deleteForm(adminApi, appBase, adminToken, createdFormId);
      }
      await participantApi.dispose();
      await adminApi.dispose();
    }
  });

  test('fillable document import detects structured response types from questionnaire-style docx', async ({ browser, baseURL }) => {
    test.setTimeout(90_000);
    const appBase = baseURL ?? 'http://127.0.0.1:8767';
    const timestamp = Date.now();
    let createdFormId: number | null = null;
    let adminContext: import('@playwright/test').BrowserContext | null = null;
    let fixtureDir: string | null = null;
    const adminApi = await playwrightRequest.newContext();
    const adminLogin = await loginViaApi(adminApi, appBase, ADMIN_EMAIL, ADMIN_PASSWORD);
    const adminToken = adminLogin.access_token;

    try {
      const fixture = await createQuestionnaireDocx([
        'Round 1: Full question set',
        '',
        'Section A. About you',
        '',
        'Q1. Which role best describes you?',
        'Response type: Select one.',
        'School leader',
        'Teacher',
        'Support staff',
        '',
        'Q2. Which two issues matter most?',
        'Response type: Select up to 2.',
        'Workload',
        'Safeguarding',
        'Vendor lock-in',
        '',
        'Q3. Rate each challenge below.',
        'Response type: 0–10 slider for each item.',
        'Anchor labels: 0 = Not significant, 5 = Moderate, 10 = Very significant',
        'Workload burden',
        'Safeguarding risk',
        '',
        'Q4. Optional comments',
        'Response type: Free text, max 40 words.',
      ]);
      fixtureDir = fixture.dir;

      adminContext = await browser.newContext({
        storageState: buildStorageState(appBase, adminLogin),
      });
      const adminPage = await adminContext.newPage();
      await adminPage.goto(`${appBase}/admin/forms/new`);

      await adminPage.getByRole('button', { name: /start document template/i }).click();
      await adminPage.locator('#form-title').fill(`Imported Fillable Document ${timestamp}`);

      await adminPage.locator('input[type="file"]').setInputFiles(fixture.docxPath);

      await expect(adminPage.getByText('Which role best describes you?').first()).toBeVisible();
      await expect(adminPage.getByText('Workload burden').first()).toBeVisible();
      await expect(adminPage.locator('.symphonia-fillable-node input[type="radio"]')).toHaveCount(3);
      await expect(adminPage.locator('.symphonia-fillable-node input[type="checkbox"]')).toHaveCount(3);
      await expect(adminPage.locator('.symphonia-fillable-node input[type="range"]')).toHaveCount(2);
      await expect(adminPage.locator('.symphonia-fillable-node input[type="text"][placeholder="Enter response"]')).toHaveCount(0);
      await expect(adminPage.getByText('School leader').first()).toBeVisible();
      await expect(adminPage.getByText('Teacher').first()).toBeVisible();

      await adminPage.getByRole('button', { name: /create form/i }).click();
      await adminPage.waitForURL(/\/admin\/form\/\d+$/, { timeout: 20_000 });

      const formIdMatch = adminPage.url().match(/\/admin\/form\/(\d+)$/);
      expect(formIdMatch).not.toBeNull();
      createdFormId = Number(formIdMatch?.[1]);

      const form = await getFormDetails(adminApi, appBase, adminToken, createdFormId);
      expect(typeof form.document_template).toBe('string');
      expect(form.document_template).toContain('data-symphonia-field-type="single_select"');
      expect(form.document_template).toContain('data-symphonia-field-type="multi_select"');
      expect(form.document_template).toContain('data-symphonia-field-type="slider"');
      expect(form.document_template).toContain('data-symphonia-max-selections="2"');
    } finally {
      if (adminContext) {
        await adminContext.close();
      }
      if (fixtureDir) {
        await rm(fixtureDir, { recursive: true, force: true });
      }
      if (createdFormId) {
        await deleteForm(adminApi, appBase, adminToken, createdFormId);
      }
      await adminApi.dispose();
    }
  });

  test('imported fillable documents can still save after removing surrounding text', async ({ browser, baseURL }) => {
    test.setTimeout(90_000);
    const appBase = baseURL ?? 'http://127.0.0.1:8767';
    const timestamp = Date.now();
    let createdFormId: number | null = null;
    let originalTemplate: string | null = null;
    let adminContext: import('@playwright/test').BrowserContext | null = null;
    let fixtureDir: string | null = null;
    const adminApi = await playwrightRequest.newContext();
    const adminLogin = await loginViaApi(adminApi, appBase, ADMIN_EMAIL, ADMIN_PASSWORD);
    const adminToken = adminLogin.access_token;

    try {
      const fixture = await createQuestionnaireDocx([
        'Introductory note for reviewers',
        '',
        'Q1. Which role best describes you?',
        'Response type: Select one.',
        'School leader',
        'Teacher',
        '',
        'Q2. Optional comments',
        'Response type: Free text, max 40 words.',
      ]);
      fixtureDir = fixture.dir;

      adminContext = await browser.newContext({
        storageState: buildStorageState(appBase, adminLogin),
      });
      const adminPage = await adminContext.newPage();
      await adminPage.goto(`${appBase}/admin/forms/new`);

      await adminPage.getByRole('button', { name: /start document template/i }).click();
      await adminPage.locator('#form-title').fill(`Imported Editable ${timestamp}`);
      await adminPage.locator('input[type="file"]').setInputFiles(fixture.docxPath);

      await expect(adminPage.getByText('Introductory note for reviewers').first()).toBeVisible();
      await expect(adminPage.locator('.symphonia-fillable-node')).toHaveCount(2);

      await adminPage.getByRole('button', { name: /create form/i }).click();
      await adminPage.waitForURL(/\/admin\/form\/\d+$/, { timeout: 20_000 });

      const formIdMatch = adminPage.url().match(/\/admin\/form\/(\d+)$/);
      expect(formIdMatch).not.toBeNull();
      createdFormId = Number(formIdMatch?.[1]);
      originalTemplate = (await getFormDetails(adminApi, appBase, adminToken, createdFormId)).document_template;

      const introParagraph = adminPage.locator('.symphonia-fillable-editor p', {
        hasText: 'Introductory note for reviewers',
      }).first();
      await expect(introParagraph).toBeVisible();
      await introParagraph.click();
      await adminPage.keyboard.press('End');
      for (let count = 0; count < 9; count += 1) {
        await adminPage.keyboard.press('Backspace');
      }
      await expect.poll(async () => adminPage.locator('.symphonia-fillable-node').count()).toBeGreaterThan(0);

      const saveResponse = adminPage.waitForResponse(
        (response) =>
          response.url().endsWith(`/api/forms/${createdFormId}`) &&
          response.request().method() === 'PUT' &&
          response.status() === 200,
      );
      await adminPage.getByRole('button', { name: /save changes/i }).click();
      await saveResponse;
      await expect(adminPage.getByText('Fillable document templates must include at least one field.')).toHaveCount(0);

      const updated = await getFormDetails(adminApi, appBase, adminToken, createdFormId);
      expect(updated.document_template).not.toBe(originalTemplate);
      expect(updated.document_template).toMatch(/data-symphonia-field-type="/);
    } finally {
      await adminContext?.close();
      if (fixtureDir) {
        await rm(fixtureDir, { recursive: true, force: true });
      }
      if (createdFormId) {
        await deleteForm(adminApi, appBase, adminToken, createdFormId);
      }
      await adminApi.dispose();
    }
  });

  test('fillable document editor can convert pasted questionnaire text into typed fields', async ({ browser, baseURL }) => {
    test.setTimeout(90_000);
    const appBase = baseURL ?? 'http://127.0.0.1:8767';
    const timestamp = Date.now();
    let createdFormId: number | null = null;
    let adminContext: import('@playwright/test').BrowserContext | null = null;
    const adminApi = await playwrightRequest.newContext();
    const adminLogin = await loginViaApi(adminApi, appBase, ADMIN_EMAIL, ADMIN_PASSWORD);
    const adminToken = adminLogin.access_token;

    try {
      adminContext = await browser.newContext({
        storageState: buildStorageState(appBase, adminLogin),
      });
      const adminPage = await adminContext.newPage();
      await adminPage.goto(`${appBase}/admin/forms/new`);

      await adminPage.getByRole('button', { name: /start document template/i }).click();
      await adminPage.locator('#form-title').fill(`Pasted Questionnaire ${timestamp}`);

      const questionnaireText = [
        'Round 1: Full question set',
        '',
        'Intro text for participants',
        '',
        'Thank you for taking part in this consultation on AI in education.',
        '',
        'Section A. About you',
        '',
        'Q0. Which of the following best describes your current role?',
        'Response type: Select one.',
        '',
        '• School/college senior leader',
        '• Middle leader',
        '• Teacher/lecturer/tutor',
        '• Support staff',
        '• Other',
        '',
        'Q0a. Which stakeholder group are you responding as part of?',
        'Response type: Select one.',
        '',
        '• School / college leadership group',
        '• TUC / workforce group',
        '• Other / mixed perspective',
        '',
        'Q1. Which five of the above challenges most need attention now?',
        'Response type: Select up to 5.',
        '',
        '• Workload',
        '• Safeguarding',
        '• Vendor lock-in',
        '',
        'Q2. Thinking about AI in education over the next 2–3 years, how significant is each challenge?',
        'Response type: 0–10 slider for each item.',
        'Anchor labels: 0 = Not at all significant, 5 = Moderately significant, 10 = Extremely significant',
        '',
        '• Staff AI literacy',
        '• Governance uncertainty',
        '',
        'Q3. Optional: anything important about your context?',
        'Response type: Free text, max 40 words.',
      ].join('\n');

      const editor = adminPage.locator('.symphonia-fillable-editor');
      await editor.click();
      await adminPage.keyboard.press('Control+A');
      await adminPage.keyboard.press('Backspace');
      await adminPage.keyboard.insertText(questionnaireText);

      await expect(adminPage.getByRole('button', { name: /auto-build fields/i })).toBeVisible();
      await adminPage.getByRole('button', { name: /auto-build fields/i }).click();

      await expect(adminPage.getByText('Which of the following best describes your current role?').first()).toBeVisible();
      await expect(adminPage.getByText('Staff AI literacy').first()).toBeVisible();

      await adminPage.getByRole('button', { name: /create form/i }).click();
      await adminPage.waitForURL(/\/admin\/form\/\d+$/, { timeout: 20_000 });

      const formIdMatch = adminPage.url().match(/\/admin\/form\/(\d+)$/);
      expect(formIdMatch).not.toBeNull();
      createdFormId = Number(formIdMatch?.[1]);

      const form = await getFormDetails(adminApi, appBase, adminToken, createdFormId);
      expect(typeof form.document_template).toBe('string');
      expect(form.document_template).toContain('data-symphonia-field-type="single_select"');
      expect(form.document_template).toContain('data-symphonia-field-type="multi_select"');
      expect(form.document_template).toContain('data-symphonia-field-type="slider"');
      expect(form.document_template).toContain('data-symphonia-field-type="long"');
      expect(form.document_template).not.toContain('• School/college senior leader');
      expect(form.document_template).toContain('School/college senior leader');
    } finally {
      if (adminContext) {
        await adminContext.close();
      }
      if (createdFormId !== null) {
        await deleteForm(adminApi, appBase, adminToken, createdFormId);
      }
      await adminApi.dispose();
    }
  });

  test('auto-build fields converts partial questionnaire excerpts into select and slider fields', async ({ browser, baseURL }) => {
    test.setTimeout(90_000);
    const appBase = baseURL ?? 'http://127.0.0.1:8767';
    let adminContext: import('@playwright/test').BrowserContext | null = null;
    const adminApi = await playwrightRequest.newContext();
    const adminLogin = await loginViaApi(adminApi, appBase, ADMIN_EMAIL, ADMIN_PASSWORD);

    try {
      adminContext = await browser.newContext({
        storageState: buildStorageState(appBase, adminLogin),
      });
      const adminPage = await adminContext.newPage();
      await adminPage.goto(`${appBase}/admin/forms/new`);

      await adminPage.getByRole('button', { name: /start document template/i }).click();

      const questionnaireText = [
        'perience and judgement. There are no right or wrong answers. Estimated completion time: 12-15 minutes.',
        '',
        'Section A. About you',
        '',
        'Q0. Which of the following best describes your current role?',
        'Response type: Select one.',
        'School/college senior leader',
        'Middle leader',
        'Teacher/lecturer/tutor',
        'Support staff',
        'Digital / data / IT lead',
        'Governor / trustee / board member',
        'Union / workforce representative',
        'Policy / system leader',
        'Researcher / adviser',
        'Other',
        '',
        'Q0a. Which stakeholder group are you responding as part of?',
        'Response type: Select one.',
        'School / college leadership group',
        'TUC / workforce group',
        'Other / mixed perspective',
        '',
        'Q1. Thinking about AI in education over the next 2-3 years, how significant is each of the following challenges in your context?',
        'Response type: 0-10 slider for each item.',
        'Anchor labels: 0 = Not at all significant, 5 = Moderately significant, 10 = Extremely significant',
        'Staff AI literacy, capability, and training',
        'Time available for training and implementation',
      ].join('\n');

      const editor = adminPage.locator('.symphonia-fillable-editor');
      await editor.click();
      await adminPage.keyboard.press('Control+A');
      await adminPage.keyboard.press('Backspace');
      await adminPage.keyboard.insertText(questionnaireText);

      await adminPage.getByRole('button', { name: /auto-build fields/i }).click();

      await expect(adminPage.locator('.symphonia-fillable-node')).toHaveCount(5);
      await expect(adminPage.getByText('Which of the following best describes your current role?').first()).toBeVisible();
      await expect(adminPage.getByText('Staff AI literacy, capability, and training').first()).toBeVisible();

      const content = await editor.textContent();
      expect(content ?? '').not.toContain('Response type: Select one.');
      expect(content ?? '').not.toContain('Response type: 0-10 slider for each item.');
    } finally {
      if (adminContext) {
        await adminContext.close();
      }
      await adminApi.dispose();
    }
  });

  test('fillable documents support richer response types inline', async ({ browser, baseURL }) => {
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
        title: `Typed Fillable ${timestamp}`,
        description: 'Seeded for typed fillable document coverage.',
        document_template: [
          'Programme review',
          '',
          'Organisation',
          '{{short:Organisation}}',
          '',
          'Preferred direction',
          '{{single_select:Preferred direction|Expand now|Pilot first|Pause}}',
          '',
          'Concerns to monitor',
          '{{multi_select:Concerns to monitor|Cost|Capacity|Risk}}',
          '',
          'Priority score',
          '{{slider:Priority score|0|10|Low|Balanced|High}}',
          '',
          'Importance rating',
          `{{likert:Importance rating|${['Unimportant', 'Low', 'Moderate', 'High', 'Critical', 'Unsure'].join('|')}}}`,
        ].join('\n'),
      });
      createdFormId = created.id;

      const participantEmail = `typed-fillable-${timestamp}@example.com`;
      await registerParticipant(participantApi, appBase, participantEmail, 'test123');
      const participantLogin = await loginViaApi(participantApi, appBase, participantEmail, 'test123');
      const participantToken = participantLogin.access_token;
      participantContext = await browser.newContext({
        storageState: buildStorageState(appBase, participantLogin),
      });
      const participantPage = await participantContext.newPage();
      await participantPage.goto(`${appBase}/join`);
      await participantPage.getByPlaceholder(/SYM/i).fill(created.join_code);
      await participantPage.getByRole('button', { name: /join consultation/i }).click();
      await participantPage.waitForURL(new RegExp(`/form/${createdFormId}$`), { timeout: 20_000 });

      await participantPage.locator('[data-question-key="q1"] input').fill('Northshore Council');
      await participantPage.locator('[data-question-key="q2"] input[type="radio"]').first().check();
      await participantPage.locator('[data-question-key="q3"] input[type="checkbox"]').nth(0).check();
      await participantPage.locator('[data-question-key="q3"] input[type="checkbox"]').nth(2).check();
      const slider = participantPage.locator('[data-question-key="q4"] input[type="range"]');
      await slider.click();
      await expect(participantPage.locator('[data-question-key="q4"]').first()).toContainText('5');
      await participantPage.locator('[data-question-key="q5"] label').nth(3).click();
      await expect(participantPage.locator('[data-question-key="q5"]').first()).toContainText('✓');

      await participantPage.getByRole('button', { name: /^submit$/i }).click();
      await participantPage.waitForURL(/\/waiting$/, { timeout: 20_000 });

      const savedResponse = await getMyResponseDetails(participantApi, appBase, participantToken, createdFormId);
      expect(savedResponse.answers.q1.position).toBe('Northshore Council');
      expect(savedResponse.answers.q2.position).toBe('Expand now');
      expect(savedResponse.answers.q3.position).toContain('Cost');
      expect(savedResponse.answers.q3.position).toContain('Risk');
      expect(savedResponse.answers.q4.position).toBe('5');
      expect(savedResponse.answers.q5.position).toBe('High');
    } finally {
      await participantContext?.close();
      if (createdFormId) {
        await deleteForm(adminApi, appBase, adminToken, createdFormId);
      }
      await participantApi.dispose();
      await adminApi.dispose();
    }
  });

  test('fillable editor keeps slash menu visible and positions field settings near the selected field', async ({ browser, baseURL }) => {
    test.setTimeout(90_000);
    const appBase = baseURL ?? 'http://127.0.0.1:8767';
    let adminContext: import('@playwright/test').BrowserContext | null = null;
    const adminApi = await playwrightRequest.newContext();
    const adminLogin = await loginViaApi(adminApi, appBase, ADMIN_EMAIL, ADMIN_PASSWORD);

    try {
      adminContext = await browser.newContext({
        storageState: buildStorageState(appBase, adminLogin),
      });
      const adminPage = await adminContext.newPage();
      await adminPage.goto(`${appBase}/admin/forms/new`);
      await adminPage.getByRole('button', { name: /start document template/i }).click();
      await expect(adminPage.getByLabel('Field settings inspector')).toHaveCount(0);

      const editor = adminPage.locator('.symphonia-fillable-editor');
      await editor.click();
      await adminPage.keyboard.type('/');

      const slashMenuButton = adminPage.getByRole('button', { name: /short text/i }).first();
      const slashMenu = slashMenuButton.locator('xpath=ancestor::div[contains(@class,"absolute")]').first();
      await expect(slashMenuButton).toBeVisible();

      const editorCard = adminPage.locator('[data-testid="document-template-rich-editor"]');
      const menuBox = await slashMenu.boundingBox();
      const editorBox = await editorCard.boundingBox();
      expect(menuBox).not.toBeNull();
      expect(editorBox).not.toBeNull();
      expect((menuBox?.right ?? 0) <= (editorBox?.right ?? 0) + 4).toBeTruthy();
      expect((menuBox?.bottom ?? 0) <= (editorBox?.bottom ?? 0) + 220).toBeTruthy();

      await slashMenuButton.click();
      const selectedNode = adminPage.locator('.symphonia-fillable-node').first();
      await selectedNode.click();

      const inspector = adminPage.getByLabel('Field settings inspector');
      await expect(inspector).toBeVisible();

      const inspectorBox = await inspector.boundingBox();
      const selectedNodeBox = await selectedNode.boundingBox();
      expect(inspectorBox).not.toBeNull();
      expect(selectedNodeBox).not.toBeNull();
      expect((inspectorBox?.left ?? 0) <= (editorBox?.right ?? 0) + 24).toBeTruthy();
      expect((inspectorBox?.top ?? 0) >= (editorBox?.top ?? 0) - 8).toBeTruthy();
      expect(Math.abs((inspectorBox?.top ?? 0) - (selectedNodeBox?.top ?? 0)) <= 120).toBeTruthy();
      expect(
        Math.min(
          Math.abs((inspectorBox?.left ?? 0) - (selectedNodeBox?.right ?? 0)),
          Math.abs(((inspectorBox?.left ?? 0) + (inspectorBox?.width ?? 0)) - (selectedNodeBox?.left ?? 0)),
        ) <= 80,
      ).toBeTruthy();
    } finally {
      if (adminContext) {
        await adminContext.close();
      }
      await adminApi.dispose();
    }
  });

  test('admin can import an editable document and participants can edit their own copy', async ({ browser, baseURL }) => {
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
      const fixture = await createStyledEditableDocx();
      fixtureDir = fixture.dir;

      adminContext = await browser.newContext({
        storageState: buildStorageState(appBase, adminLogin),
      });
      const adminPage = await adminContext.newPage();
      await adminPage.goto(`${appBase}/admin/forms/new`);

      await adminPage.getByRole('button', { name: /start document template/i }).click();
      await adminPage.getByRole('button', { name: /editable copy/i }).click();
      await adminPage.locator('input[type="file"]').setInputFiles(fixture.docxPath);

      await expect(adminPage.getByText('Board note').first()).toBeVisible({ timeout: 10_000 });
      await expect(adminPage.locator('.ProseMirror [style*="color"]', { hasText: 'Section overview' })).toBeVisible();
      await expect(adminPage.locator('.ProseMirror [style*="background-color"]', { hasText: 'Section overview' })).toBeVisible();
      await expect(adminPage.locator('.ProseMirror [style*="color"]', { hasText: 'imported emphasis' })).toBeVisible();
      await adminPage.locator('#form-title').fill(`Editable Copy ${timestamp}`);
      await adminPage.getByRole('button', { name: /create form/i }).click();
      await adminPage.waitForURL(/\/admin\/form\/\d+$/, { timeout: 20_000 });

      const formIdMatch = adminPage.url().match(/\/admin\/form\/(\d+)$/);
      expect(formIdMatch).not.toBeNull();
      createdFormId = Number(formIdMatch?.[1]);

      const form = await getFormDetails(adminApi, appBase, adminToken, createdFormId);
      expect(form.questions).toHaveLength(1);
      expect(form.questions[0].fieldType).toBe('document');
      expect(form.document_template).toContain('symphonia-document-mode: editable');
      expect(form.document_template).toContain('Board note');
      expect(form.document_template).toMatch(/style="[^"]*color:/);
      expect(form.document_template).toMatch(/style="[^"]*background-color:/);

      const participantEmail = `editable-doc-${timestamp}@example.com`;
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

      await expect(participantPage.getByText('Edit your copy of the document')).toBeVisible();
      const editor = participantPage.locator('.ProseMirror').last();
      await editor.click();
      await participantPage.keyboard.press('Control+A');
      await participantPage.keyboard.type('Updated board note for this participant only.');

      await participantPage.getByRole('button', { name: /^submit$/i }).click();
      await participantPage.waitForURL(/\/waiting$/, { timeout: 20_000 });

      const savedResponse = await getMyResponseDetails(participantApi, appBase, participantToken, createdFormId);
      expect(savedResponse.answers.q1.position).toContain('Updated board note for this participant only.');
    } finally {
      await participantContext?.close();
      await adminContext?.close();
      if (createdFormId) {
        await deleteForm(adminApi, appBase, adminToken, createdFormId);
      }
      await participantApi.dispose();
      await adminApi.dispose();
      if (fixtureDir) {
        await rm(fixtureDir, { recursive: true, force: true });
      }
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
      await expect(participantPage.getByRole('button', { name: /voice/i }).last()).toBeVisible();
      await expect(participantPage.getByText(/voice input/i).last()).toBeVisible();
      await expect(participantPage.getByText(/enter to submit/i)).toHaveCount(0);
      await participantPage.getByRole('button', { name: /^submit$/i }).click();
      await expect(participantPage.getByText(/please answer/i)).toBeVisible();

      await participantPage.getByLabel(/other/i).check();
      await expect(participantPage.getByPlaceholder(/please specify/i)).toBeVisible();
      await participantPage.getByRole('button', { name: /^submit$/i }).click();
      await expect(participantPage.getByText(/please answer/i)).toBeVisible();

      await participantPage.getByPlaceholder(/please specify/i).fill('Consultant');
      await participantPage.getByLabel('Workload').check();
      await participantPage.getByLabel('Equity').check();

      const sliders = participantPage.locator('input[type="range"]');
      await sliders.nth(0).click();
      await sliders.nth(1).fill('6');
      await participantPage.getByRole('button', { name: /^submit$/i }).click();
      await expect(participantPage.getByRole('heading', { name: /thank you for your submission/i })).toBeVisible();

      const savedResponse = await getMyResponseDetails(participantApi, appBase, participantToken, createdFormId);
      expect(savedResponse.answers.q1.position).toContain('Other');
      expect(savedResponse.answers.q2.position).toBe('Consultant');
      expect(savedResponse.answers.q3.position).toContain('Workload');
      expect(savedResponse.answers.q3.position).toContain('Equity');
      expect(savedResponse.answers.q4.position).toBe('5');
      expect(savedResponse.answers.q5.position).toBe('6');
      expect(savedResponse.answers.q6?.position ?? '').toBe('');
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

  test('admin can create and participants can answer Likert rating questions', async ({ browser, baseURL }) => {
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
      await adminPage.getByRole('button', { name: /Blank survey/i }).click();

      await adminPage.locator('#form-title').fill(`Clinical Ratings ${timestamp}`);
      await adminPage.getByLabel('Question 1').fill('The criterion has strong diagnostic validity.');
      await adminPage.getByLabel('Response type').first().selectOption('likert');
      await adminPage.getByLabel('Section heading').first().fill('Diagnostic validity');
      await adminPage.getByLabel('Help text').first().fill('Rate the statement on the agreed five-point scale.');

      const scaleLabels = adminPage.getByLabel('Scale labels').first();
      await scaleLabels.fill(
        [
          'Unimportant',
          'Somewhat important',
          'Moderately important',
          'Very important',
          'Essential',
        ].join('\n'),
      );

      await adminPage.getByRole('button', { name: /create form/i }).click();
      await adminPage.waitForURL(/\/admin\/form\/\d+$/, { timeout: 20_000 });

      const formIdMatch = adminPage.url().match(/\/admin\/form\/(\d+)$/);
      expect(formIdMatch).not.toBeNull();
      createdFormId = Number(formIdMatch?.[1]);

      const form = await getFormDetails(adminApi, appBase, adminToken, createdFormId);
      expect(Array.isArray(form.questions)).toBeTruthy();
      expect(form.questions[0].inputType).toBe('likert');
      expect(form.questions[0].allowUnsure).toBe(true);

      const participantEmail = `likert-participant-${timestamp}@example.com`;
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

      await expect(participantPage.getByRole('heading', { name: 'Diagnostic validity' })).toBeVisible();
      await expect(participantPage.getByText('The criterion has strong diagnostic validity.')).toBeVisible();
      await participantPage.locator('label').filter({ hasText: 'Essential' }).first().click();
      await participantPage.getByRole('button', { name: /^submit$/i }).click();
      await participantPage.waitForURL(/\/waiting$/, { timeout: 20_000 });
      await expect(participantPage.getByText(/waiting/i)).toBeVisible();

      const savedResponse = await getMyResponseDetails(participantApi, appBase, participantToken, createdFormId);
      expect(savedResponse.answers.q1.position).toBe('Essential');
    } finally {
      if (createdFormId) {
        await deleteForm(adminApi, appBase, adminToken, createdFormId);
      }
      await participantContext?.close();
      await adminContext?.close();
      await adminApi.dispose();
      await participantApi.dispose();
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

  test('dashboard download sheet exports working pdf and word files', async ({ browser, baseURL }) => {
    test.setTimeout(120_000);
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
      const created = await createDocumentTemplateForm(adminApi, appBase, adminToken, {
        title: `Download Check ${timestamp}`,
        description: 'Covers dashboard export downloads.',
        document_template: [
          'Decision note',
          '',
          'Organisation',
          '{{short:Organisation}}',
          '',
          'Executive summary',
          '{{long:Executive summary}}',
        ].join('\n'),
      });
      createdFormId = created.id;

      const participantEmail = `download-participant-${timestamp}@example.com`;
      await registerParticipant(participantApi, appBase, participantEmail, 'test123');
      const participantLogin = await loginViaApi(participantApi, appBase, participantEmail, 'test123');
      participantContext = await browser.newContext({
        storageState: buildStorageState(appBase, participantLogin),
        acceptDownloads: true,
      });
      const participantPage = await participantContext.newPage();
      await participantPage.goto(`${appBase}/join`);
      await participantPage.getByPlaceholder(/SYM/i).fill(created.join_code);
      await participantPage.getByRole('button', { name: /join consultation/i }).click();
      await participantPage.waitForURL(new RegExp(`/form/${createdFormId}$`), { timeout: 20_000 });

      await participantPage.locator('[data-question-key="q1"] input').fill('Northshore Council');
      await participantPage.locator('[data-question-key="q2"] textarea').fill('A phased rollout is feasible if governance and staffing are addressed.');

      await participantPage.getByRole('button', { name: /^submit$/i }).click();
      await participantPage.waitForURL(/\/waiting$/, { timeout: 20_000 });

      await participantContext.close();
      participantContext = null;

      adminContext = await browser.newContext({
        storageState: buildStorageState(appBase, adminLogin),
        acceptDownloads: true,
      });
      const page = await adminContext.newPage();
      await page.goto(`${appBase}/`);

      const row = page.locator('tr').filter({ hasText: `Download Check ${timestamp}` }).first();
      await expect(row).toBeVisible();

      await row.getByRole('button', { name: `Download Download Check ${timestamp}` }).click();
      await expect(page.getByRole('dialog', { name: /download consultation/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /download word/i })).toBeEnabled({ timeout: 15_000 });

      const pdfDownloadPromise = page.waitForEvent('download');
      await page.getByRole('button', { name: /download pdf/i }).click();
      const pdfDownload = await pdfDownloadPromise;
      expect(pdfDownload.suggestedFilename()).toMatch(/\.pdf$/i);
      const pdfPath = await pdfDownload.path();
      expect(pdfPath).toBeTruthy();
      const pdfBytes = await readFile(pdfPath!);
      expect(pdfBytes.length).toBeGreaterThan(1000);
      expect(pdfBytes.subarray(0, 4).toString()).toBe('%PDF');

      const wordDownloadPromise = page.waitForEvent('download');
      await page.getByRole('button', { name: /download word/i }).click();
      const wordDownload = await wordDownloadPromise;
      expect(wordDownload.suggestedFilename()).toMatch(/\.docx$/i);
      const wordPath = await wordDownload.path();
      expect(wordPath).toBeTruthy();
      const wordBytes = await readFile(wordPath!);
      expect(wordBytes.length).toBeGreaterThan(1000);
      expect(wordBytes.subarray(0, 2).toString()).toBe('PK');
    } finally {
      if (participantContext) {
        await participantContext.close();
      }
      if (adminContext) {
        await adminContext.close();
      }
      if (createdFormId) {
        await deleteForm(adminApi, appBase, adminToken, createdFormId);
      }
      await participantApi.dispose();
      await adminApi.dispose();
    }
  });
});
