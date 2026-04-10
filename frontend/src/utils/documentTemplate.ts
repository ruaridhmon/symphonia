import { emptyStructuredResponse, type StructuredResponse } from '../types/structured-input';
import { DEFAULT_LIKERT_OPTIONS, type SurveyInputType } from './questions';

export interface DocumentTemplateField {
  key: string;
  label: string;
  showLabel?: boolean;
  fieldType: 'short' | 'long' | 'document' | 'single_select' | 'multi_select' | 'slider' | 'likert';
  inputType: SurveyInputType | 'document';
  optional: boolean;
  rows: number;
  placeholder: string;
  options?: string[];
  maxSelections?: number;
  minValue?: number;
  maxValue?: number;
  minLabel?: string;
  midLabel?: string;
  maxLabel?: string;
  allowUnsure?: boolean;
}

export interface RenderableDocumentTemplateField extends DocumentTemplateField {
  questionKey: string;
}

export type DocumentTemplateLineSegment =
  | { type: 'text'; value: string }
  | { type: 'field'; value: RenderableDocumentTemplateField; response: StructuredResponse };

export interface DocumentTemplateLine {
  key: string;
  segments: DocumentTemplateLineSegment[];
}

export const EDITABLE_DOCUMENT_TEMPLATE_PREFIX = '<!-- symphonia-document-mode: editable -->';
export const RICH_FILLABLE_DOCUMENT_TEMPLATE_PREFIX = '<!-- symphonia-document-mode: fillable-rich -->';
const PLACEHOLDER_PATTERN = /\{\{\s*([^{}]+?)\s*\}\}/g;
const FIELD_TAG_SELECTOR = 'span[data-symphonia-field-key]';

function slugifyLabel(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'field';
}

export function getDocumentTemplateMode(template: string | null | undefined): 'fillable' | 'fillable-rich' | 'editable' {
  if (!template?.trim()) return 'fillable';
  const trimmed = template.trimStart();
  if (trimmed.startsWith(EDITABLE_DOCUMENT_TEMPLATE_PREFIX)) return 'editable';
  if (trimmed.startsWith(RICH_FILLABLE_DOCUMENT_TEMPLATE_PREFIX)) return 'fillable-rich';
  return 'fillable';
}

export function isRichFillableDocumentTemplate(template: string | null | undefined): boolean {
  return Boolean(template?.trimStart().startsWith(RICH_FILLABLE_DOCUMENT_TEMPLATE_PREFIX));
}

export function isEditableDocumentTemplate(template: string | null | undefined): boolean {
  return getDocumentTemplateMode(template) === 'editable';
}

export function getDocumentTemplateContent(template: string | null | undefined): string {
  if (!template) return '';
  if (!isEditableDocumentTemplate(template)) return template;
  return template.replace(EDITABLE_DOCUMENT_TEMPLATE_PREFIX, '').trim();
}

export function getRichFillableTemplateContent(template: string | null | undefined): string {
  if (!template) return '';
  if (!isRichFillableDocumentTemplate(template)) return template;
  return template.replace(RICH_FILLABLE_DOCUMENT_TEMPLATE_PREFIX, '').trim();
}

export function createEditableDocumentTemplate(content: string): string {
  const trimmed = content.trim();
  return trimmed ? `${EDITABLE_DOCUMENT_TEMPLATE_PREFIX}\n${trimmed}` : EDITABLE_DOCUMENT_TEMPLATE_PREFIX;
}

export function createRichFillableDocumentTemplate(content: string): string {
  const trimmed = content.trim();
  return trimmed ? `${RICH_FILLABLE_DOCUMENT_TEMPLATE_PREFIX}\n${trimmed}` : RICH_FILLABLE_DOCUMENT_TEMPLATE_PREFIX;
}

export function htmlToPlainText(value: string): string {
  return value
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<\/(p|div|li|h1|h2|h3|h4|h5|h6|tr)>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\r/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function parseDocumentTemplateToken(rawToken: string): DocumentTemplateField | null {
  const trimmed = rawToken.trim();
  if (!trimmed) return null;

  let fieldType: DocumentTemplateField['fieldType'] = 'long';
  let optional = false;
  let rows = 4;
  let label = trimmed;
  let options: string[] | undefined;
  let minValue: number | undefined;
  let maxValue: number | undefined;
  let minLabel: string | undefined;
  let midLabel: string | undefined;
  let maxLabel: string | undefined;
  let allowUnsure = false;

  if (trimmed.includes(':')) {
    const parts = trimmed.split(':');
    const labelParts: string[] = [];

    for (const part of parts) {
      const normalized = part.trim().toLowerCase();
      if (
        labelParts.length === 0 &&
        (
          normalized === 'short' ||
          normalized === 'long' ||
          normalized === 'single_select' ||
          normalized === 'multi_select' ||
          normalized === 'slider' ||
          normalized === 'likert'
        )
      ) {
        fieldType = normalized as DocumentTemplateField['fieldType'];
        rows = normalized === 'short' ? 1 : 6;
        continue;
      }
      if (labelParts.length === 0 && normalized === 'optional') {
        optional = true;
        continue;
      }
      labelParts.push(part.trim());
    }

    const nextLabel = labelParts.join(':').trim();
    if (nextLabel) {
      const segments = nextLabel.split('|').map((segment) => segment.trim()).filter(Boolean);
      if (segments.length > 0) {
        label = segments[0];
      }

      if (fieldType === 'single_select' || fieldType === 'multi_select') {
        options = segments.slice(1);
        if (!options.length) {
          options = ['Option 1', 'Option 2'];
        }
      } else if (fieldType === 'slider') {
        const maybeMin = Number(segments[1]);
        const maybeMax = Number(segments[2]);
        minValue = Number.isFinite(maybeMin) ? maybeMin : 0;
        maxValue = Number.isFinite(maybeMax) ? maybeMax : 10;
        minLabel = segments[3] || String(minValue);
        midLabel = segments[4] || undefined;
        maxLabel = segments[5] || String(maxValue);
      } else if (fieldType === 'likert') {
        options = segments.slice(1);
        const last = options[options.length - 1]?.toLowerCase();
        if (last === 'unsure') {
          allowUnsure = true;
          options.pop();
        }
        if (options.length < 2) {
          options = [...DEFAULT_LIKERT_OPTIONS];
        }
      }
    }
  }

  const inputType: DocumentTemplateField['inputType'] =
    fieldType === 'short'
      ? 'text'
      : fieldType === 'long'
        ? 'textarea'
        : fieldType;

  return {
    key: label.toLowerCase(),
    label,
    fieldType,
    inputType,
    optional,
    rows,
    placeholder: `Enter ${label.toLowerCase()}`,
    options,
    minValue,
    maxValue,
    minLabel,
    midLabel,
    maxLabel,
    allowUnsure,
  };
}

export function createDocumentTemplatePlaceholder(
  fieldType: 'short' | 'long' | 'single_select' | 'multi_select' | 'slider' | 'likert',
  label: string,
  optional = false,
): string {
  const normalizedLabel = label.trim() || (fieldType === 'short' ? 'Field' : 'Response');
  const prefix = optional ? `optional:${fieldType}` : fieldType;
  if (fieldType === 'single_select' || fieldType === 'multi_select') {
    return `{{${prefix}:${normalizedLabel}|Option 1|Option 2|Option 3}}`;
  }
  if (fieldType === 'slider') {
    return `{{${prefix}:${normalizedLabel}|0|10|Low|Midpoint|High}}`;
  }
  if (fieldType === 'likert') {
    return `{{${prefix}:${normalizedLabel}|${DEFAULT_LIKERT_OPTIONS.join('|')}|Unsure}}`;
  }
  return `{{${prefix}:${normalizedLabel}}}`;
}

export function serializeRichDocumentField(field: DocumentTemplateField): string {
  const attributes = new Map<string, string>([
    ['data-symphonia-field-key', field.key],
    ['data-symphonia-field-label', field.label],
    ['data-symphonia-show-label', field.showLabel === false ? 'false' : 'true'],
    ['data-symphonia-field-type', field.fieldType],
    ['data-symphonia-input-type', field.inputType],
    ['data-symphonia-optional', field.optional ? 'true' : 'false'],
    ['data-symphonia-rows', String(field.rows)],
    ['data-symphonia-placeholder', field.placeholder],
  ]);
  if (field.options?.length) attributes.set('data-symphonia-options', JSON.stringify(field.options));
  if (typeof field.maxSelections === 'number') attributes.set('data-symphonia-max-selections', String(field.maxSelections));
  if (typeof field.minValue === 'number') attributes.set('data-symphonia-min-value', String(field.minValue));
  if (typeof field.maxValue === 'number') attributes.set('data-symphonia-max-value', String(field.maxValue));
  if (field.minLabel) attributes.set('data-symphonia-min-label', field.minLabel);
  if (field.midLabel) attributes.set('data-symphonia-mid-label', field.midLabel);
  if (field.maxLabel) attributes.set('data-symphonia-max-label', field.maxLabel);
  if (field.allowUnsure) attributes.set('data-symphonia-allow-unsure', 'true');

  const attrs = Array.from(attributes.entries())
    .map(([key, value]) => `${key}="${value.replace(/"/g, '&quot;')}"`)
    .join(' ');
  return `<span ${attrs}></span>`;
}

function parseRichDocumentFieldElement(element: Element): DocumentTemplateField | null {
  const label = element.getAttribute('data-symphonia-field-label')?.trim();
  const key = element.getAttribute('data-symphonia-field-key')?.trim() || (label ? slugifyLabel(label) : '');
  const fieldType = element.getAttribute('data-symphonia-field-type') as DocumentTemplateField['fieldType'] | null;
  const inputType = element.getAttribute('data-symphonia-input-type') as DocumentTemplateField['inputType'] | null;
  if (!label || !fieldType || !inputType) return null;

  let options: string[] | undefined;
  const rawOptions = element.getAttribute('data-symphonia-options');
  if (rawOptions) {
    try {
      const parsed = JSON.parse(rawOptions);
      if (Array.isArray(parsed)) {
        options = parsed.filter((item): item is string => typeof item === 'string');
      }
    } catch {
      options = undefined;
    }
  }

  const parseNumberAttr = (name: string) => {
    const raw = element.getAttribute(name);
    if (raw == null) return undefined;
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : undefined;
  };

  return {
    key,
    label,
    showLabel: element.getAttribute('data-symphonia-show-label') !== 'false',
    fieldType,
    inputType,
    optional: element.getAttribute('data-symphonia-optional') === 'true',
    rows: parseNumberAttr('data-symphonia-rows') ?? (fieldType === 'short' ? 1 : 6),
    placeholder: element.getAttribute('data-symphonia-placeholder') || `Enter ${label.toLowerCase()}`,
    options,
    maxSelections: parseNumberAttr('data-symphonia-max-selections'),
    minValue: parseNumberAttr('data-symphonia-min-value'),
    maxValue: parseNumberAttr('data-symphonia-max-value'),
    minLabel: element.getAttribute('data-symphonia-min-label') || undefined,
    midLabel: element.getAttribute('data-symphonia-mid-label') || undefined,
    maxLabel: element.getAttribute('data-symphonia-max-label') || undefined,
    allowUnsure: element.getAttribute('data-symphonia-allow-unsure') === 'true',
  };
}

export function convertLegacyFillableTemplateToRichHtml(template: string): string {
  const blocks = buildDocumentTemplatePreview(template, {});
  if (blocks.length === 0) return '<p></p>';
  const paragraphs: string[] = [];
  let current = '';

  const flush = () => {
    paragraphs.push(current.trim() ? `<p>${current}</p>` : '<p></p>');
    current = '';
  };

  blocks.forEach((block) => {
    if (block.type === 'text') {
      const parts = block.value.split('\n');
      parts.forEach((part, index) => {
        if (part) current += part;
        if (index < parts.length - 1) flush();
      });
      return;
    }
    current += serializeRichDocumentField(block.value);
  });

  if (current || paragraphs.length === 0) flush();
  return paragraphs.join('');
}

export function parseDocumentTemplateFields(template: string): DocumentTemplateField[] {
  if (isEditableDocumentTemplate(template)) return [];
  if (isRichFillableDocumentTemplate(template)) {
    const html = getRichFillableTemplateContent(template);
    const parser = new DOMParser();
    const document = parser.parseFromString(html || '<p></p>', 'text/html');
    const fields: DocumentTemplateField[] = [];
    const seen = new Set<string>();
    document.querySelectorAll(FIELD_TAG_SELECTOR).forEach((element) => {
      const field = parseRichDocumentFieldElement(element);
      if (!field || seen.has(field.key)) return;
      seen.add(field.key);
      fields.push(field);
    });
    return fields;
  }

  const fields: DocumentTemplateField[] = [];
  const seen = new Set<string>();

  for (const match of template.matchAll(PLACEHOLDER_PATTERN)) {
    const field = parseDocumentTemplateToken(match[1] || '');
    if (!field) continue;

    const key = field.key;
    if (seen.has(key)) continue;
    seen.add(key);

    fields.push(field);
  }

  return fields;
}

export function buildDocumentTemplatePreview(
  template: string,
  answers: Record<string, StructuredResponse>,
): Array<{ type: 'text'; value: string } | { type: 'field'; value: DocumentTemplateField; response: StructuredResponse }> {
  if (isEditableDocumentTemplate(template)) {
    return [];
  }

  const blocks: Array<{ type: 'text'; value: string } | { type: 'field'; value: DocumentTemplateField; response: StructuredResponse }> = [];
  let cursor = 0;

  for (const match of template.matchAll(PLACEHOLDER_PATTERN)) {
    const fullMatch = match[0];
    const rawToken = match[1] || '';
    const start = match.index ?? 0;
    const preceding = template.slice(cursor, start);
    if (preceding) {
      blocks.push({ type: 'text', value: preceding });
    }

    const field = parseDocumentTemplateToken(rawToken);
    if (field) {
      const response = answers[`q${blocks.filter((block) => block.type === 'field').length + 1}`] ?? emptyStructuredResponse();
      blocks.push({ type: 'field', value: field, response });
    } else {
      blocks.push({ type: 'text', value: fullMatch });
    }

    cursor = start + fullMatch.length;
  }

  const trailing = template.slice(cursor);
  if (trailing) {
    blocks.push({ type: 'text', value: trailing });
  }

  return blocks;
}

export function buildDocumentTemplateLines(
  template: string,
  answers: Record<string, StructuredResponse>,
): DocumentTemplateLine[] {
  if (isEditableDocumentTemplate(template)) {
    return [];
  }

  const segments: DocumentTemplateLineSegment[] = [];
  const keyToQuestionKey = new Map<string, string>();
  let nextQuestionIndex = 1;
  let cursor = 0;

  for (const match of template.matchAll(PLACEHOLDER_PATTERN)) {
    const fullMatch = match[0];
    const rawToken = match[1] || '';
    const start = match.index ?? 0;
    const preceding = template.slice(cursor, start);
    if (preceding) {
      segments.push({ type: 'text', value: preceding });
    }

    const field = parseDocumentTemplateToken(rawToken);
    if (field) {
      let questionKey = keyToQuestionKey.get(field.key);
      if (!questionKey) {
        questionKey = `q${nextQuestionIndex}`;
        keyToQuestionKey.set(field.key, questionKey);
        nextQuestionIndex += 1;
      }
      segments.push({
        type: 'field',
        value: { ...field, questionKey },
        response: answers[questionKey] ?? emptyStructuredResponse(),
      });
    } else {
      segments.push({ type: 'text', value: fullMatch });
    }

    cursor = start + fullMatch.length;
  }

  const trailing = template.slice(cursor);
  if (trailing) {
    segments.push({ type: 'text', value: trailing });
  }

  const lines: DocumentTemplateLine[] = [{ key: 'line-0', segments: [] }];
  let lineIndex = 0;

  const appendLine = () => {
    lineIndex += 1;
    lines.push({ key: `line-${lineIndex}`, segments: [] });
  };

  for (const segment of segments) {
    if (segment.type === 'field') {
      lines[lines.length - 1].segments.push(segment);
      continue;
    }

    const parts = segment.value.split('\n');
    parts.forEach((part, partIndex) => {
      if (part) {
        lines[lines.length - 1].segments.push({ type: 'text', value: part });
      }
      if (partIndex < parts.length - 1) {
        appendLine();
      }
    });
  }

  return lines;
}

export function buildRichDocumentTemplateFieldMap(
  template: string,
  answers: Record<string, StructuredResponse>,
): Map<string, { field: RenderableDocumentTemplateField; response: StructuredResponse }> {
  const map = new Map<string, { field: RenderableDocumentTemplateField; response: StructuredResponse }>();
  if (!isRichFillableDocumentTemplate(template)) return map;
  const html = getRichFillableTemplateContent(template);
  const parser = new DOMParser();
  const document = parser.parseFromString(html || '<p></p>', 'text/html');
  const keyToQuestionKey = new Map<string, string>();
  let index = 1;
  document.querySelectorAll(FIELD_TAG_SELECTOR).forEach((element) => {
    const field = parseRichDocumentFieldElement(element);
    if (!field) return;
    let questionKey = keyToQuestionKey.get(field.key);
    if (!questionKey) {
      questionKey = `q${index}`;
      keyToQuestionKey.set(field.key, questionKey);
      index += 1;
    }
    map.set(field.key, {
      field: { ...field, questionKey },
      response: answers[questionKey] ?? emptyStructuredResponse(),
    });
  });
  return map;
}

export function isDocumentTemplate(template: string | null | undefined): boolean {
  return Boolean(template && template.trim());
}

export function getEditableDocumentQuestion(template: string): DocumentTemplateField | null {
  if (!isEditableDocumentTemplate(template)) return null;
  return {
    key: 'document',
    label: 'Document response',
    fieldType: 'document',
    inputType: 'document',
    optional: false,
    rows: 12,
    placeholder: 'Edit the shared document here',
  };
}

export function buildInitialDocumentTemplateResponses(template: string): Record<string, StructuredResponse> {
  if (!isEditableDocumentTemplate(template)) return {};
  return {
    q1: {
      ...emptyStructuredResponse(),
      position: getDocumentTemplateContent(template),
    },
  };
}
