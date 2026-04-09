import { emptyStructuredResponse, type StructuredResponse } from '../types/structured-input';

export interface DocumentTemplateField {
  key: string;
  label: string;
  fieldType: 'short' | 'long';
  optional: boolean;
  rows: number;
  placeholder: string;
}

const PLACEHOLDER_PATTERN = /\{\{\s*([^{}]+?)\s*\}\}/g;

function parseDocumentTemplateToken(rawToken: string): DocumentTemplateField | null {
  const trimmed = rawToken.trim();
  if (!trimmed) return null;

  let fieldType: 'short' | 'long' = 'long';
  let optional = false;
  let rows = 4;
  let label = trimmed;

  if (trimmed.includes(':')) {
    const parts = trimmed.split(':');
    const labelParts: string[] = [];

    for (const part of parts) {
      const normalized = part.trim().toLowerCase();
      if (labelParts.length === 0 && (normalized === 'short' || normalized === 'long')) {
        fieldType = normalized;
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
      label = nextLabel;
    }
  }

  return {
    key: label.toLowerCase(),
    label,
    fieldType,
    optional,
    rows,
    placeholder: `Enter ${label.toLowerCase()}`,
  };
}

export function parseDocumentTemplateFields(template: string): DocumentTemplateField[] {
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

export function isDocumentTemplate(template: string | null | undefined): boolean {
  return Boolean(template && template.trim());
}
